// src/app/contest/page.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  CONTEST_ABI,
  CONTEST_CONTRACT_ADDRESS,
  ERC721_APPROVAL_ABI,
  type ContestEntryView,
  type ContestResponse,
} from "@/lib/contest";
import { NFT_CONTRACT_ADDRESS } from "@/lib/contracts";
import { useMyTokens } from "@/hooks/useMyTokens";
import { shortenAddress } from "@/lib/utils";

const RETURN_BATCH = 25;

const PLACE_LABEL = ["1 місце", "2 місце", "3 місце"];

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleString("uk-UA", {
    timeZone: "Europe/Kyiv",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return "завершено";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${d} дн ${h} год ${m} хв ${s} с`;
}

function errorText(error: unknown): string {
  const e = error as { shortMessage?: string; message?: string } | null;
  const raw = e?.shortMessage ?? e?.message ?? "Не вдалося виконати транзакцію";
  return raw.split("\n")[0].slice(0, 220);
}

function NftImage({ src, alt }: { src: string; alt: string }) {
  if (!src) {
    return <div className="absolute inset-0 flex items-center justify-center text-gray-300 text-sm">Без зображення</div>;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className="w-full h-full object-cover" />;
}

function WinnerCard({ entry, place }: { entry: ContestEntryView; place: number }) {
  const tone = ["border-yellow-300 bg-yellow-50", "border-gray-300 bg-gray-50", "border-orange-300 bg-orange-50"][place];
  return (
    <div className={`rounded-2xl border-2 ${tone} overflow-hidden shadow-sm`}>
      <div className="relative aspect-square bg-white">
        <NftImage src={entry.image} alt={entry.name} />
        <span className="absolute top-3 left-3 bg-gray-900 text-white text-xs font-semibold px-3 py-1 rounded-full">
          {PLACE_LABEL[place]}
        </span>
      </div>
      <div className="p-4">
        <p className="font-semibold text-gray-900 truncate">{entry.name}</p>
        <p className="text-xs text-gray-500 mt-0.5 font-mono">{shortenAddress(entry.owner)}</p>
        <p className="text-sm font-semibold text-brand-600 mt-2">{entry.votes} голосів</p>
      </div>
    </div>
  );
}

export default function ContestPage() {
  const { address, isConnected } = useAccount();
  const [data, setData] = useState<ContestResponse | null>(null);
  const [loadError, setLoadError] = useState("");
  const [clockOffset, setClockOffset] = useState(0);
  const [nowSec, setNowSec] = useState(Math.floor(Date.now() / 1000));

  const { items: myTokens, loading: tokensLoading } = useMyTokens(address);

  // ── data loading (server reads the chain; no per-token RPC calls in the browser) ──
  const load = useCallback(async () => {
    try {
      const url = `/api/contest${address ? `?address=${address}` : ""}`;
      const res = await fetch(url, { cache: "no-store" });
      const json: ContestResponse = await res.json();
      setData(json);
      setClockOffset(json.now - Math.floor(Date.now() / 1000));
      setLoadError(json.error ?? "");
    } catch (e) {
      setLoadError("Не вдалося завантажити дані конкурсу");
    }
  }, [address]);

  useEffect(() => {
    load();
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => setNowSec(Math.floor(Date.now() / 1000) + clockOffset), 1000);
    return () => clearInterval(t);
  }, [clockOffset]);

  // ── transactions ──
  const { writeContract, data: txHash, isPending, error: writeError, reset } = useWriteContract();
  const { isLoading: confirming, isSuccess: confirmed } = useWaitForTransactionReceipt({ hash: txHash });
  const busy = isPending || confirming;

  useEffect(() => {
    if (confirmed) {
      load();
      refetchApproval();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmed]);

  const { data: approved, refetch: refetchApproval } = useReadContract({
    address: NFT_CONTRACT_ADDRESS,
    abi: ERC721_APPROVAL_ABI,
    functionName: "isApprovedForAll",
    args: [address ?? "0x0000000000000000000000000000000000000000", CONTEST_CONTRACT_ADDRESS],
    query: { enabled: !!address, refetchInterval: 15_000 },
  });

  const doApprove = () => {
    reset();
    writeContract({
      address: NFT_CONTRACT_ADDRESS,
      abi: ERC721_APPROVAL_ABI,
      functionName: "setApprovalForAll",
      args: [CONTEST_CONTRACT_ADDRESS, true],
      gas: BigInt(200_000),
    });
  };

  const doSubmit = (tokenId: bigint) => {
    reset();
    writeContract({
      address: CONTEST_CONTRACT_ADDRESS,
      abi: CONTEST_ABI,
      functionName: "submit",
      args: [tokenId],
      gas: BigInt(1_500_000),
    });
  };

  const doVote = (entryId: number) => {
    reset();
    writeContract({
      address: CONTEST_CONTRACT_ADDRESS,
      abi: CONTEST_ABI,
      functionName: "vote",
      args: [BigInt(entryId)],
      gas: BigInt(800_000),
    });
  };

  const doFinalize = () => {
    reset();
    writeContract({
      address: CONTEST_CONTRACT_ADDRESS,
      abi: CONTEST_ABI,
      functionName: "finalize",
      gas: BigInt(1_500_000),
    });
  };

  const doReturn = (contestId: number, ids: number[]) => {
    const batch = ids.slice(0, RETURN_BATCH);
    reset();
    writeContract({
      address: CONTEST_CONTRACT_ADDRESS,
      abi: CONTEST_ABI,
      functionName: "returnEntries",
      args: [BigInt(contestId), batch.map((i) => BigInt(i))],
      gas: BigInt(300_000 + 250_000 * batch.length),
    });
  };

  // ── derived state ──
  const current = data?.current ?? null;
  const ended = !!current && nowSec > current.endTime;
  const open = !!current && !ended;
  const secondsLeft = current ? Math.max(0, current.endTime - nowSec) : 0;

  const sortedEntries = useMemo(
    () => [...(data?.entries ?? [])].sort((a, b) => b.votes - a.votes || a.id - b.id),
    [data?.entries]
  );

  const lastResults = data?.past.find((p) => p.contest.finalized && p.winners.length > 0) ?? null;
  const currentUnreturned = (data?.entries ?? []).filter((e) => !e.returned).map((e) => e.id);
  const pendingReturns = [
    ...(ended && current && currentUnreturned.length > 0
      ? [{ contestId: current.id, ids: currentUnreturned, mine: currentUnreturned.filter((id) => data?.entries[id]?.owner.toLowerCase() === address?.toLowerCase()).length }]
      : []),
    ...(data?.past ?? [])
      .filter((p) => p.unreturnedIds.length > 0)
      .map((p) => ({ contestId: p.contest.id, ids: p.unreturnedIds, mine: p.myPendingIds.length })),
  ];

  const canSubmitMore = !!data && data.my.entriesCount < data.maxEntriesPerWallet;

  // ── render ──
  if (data && !data.configured) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold mb-3">Конкурс NFT</h1>
        <p className="text-gray-500">Контракт конкурсу ще не підключено. Обліковий запис адміністратора має додати змінну NEXT_PUBLIC_CONTEST_CONTRACT_ADDRESS.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Конкурс NFT</h1>
          {current && (
            <p className="text-gray-500 mt-1 text-sm">
              Конкурс №{current.id}: {formatDate(current.startTime)} – {formatDate(current.endTime)} (за київським часом)
            </p>
          )}
        </div>
        {!isConnected && <ConnectButton />}
      </div>

      {loadError && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800 mb-6">{loadError}</div>
      )}

      {/* Status strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="card p-5 text-center">
          <p className={`text-lg font-extrabold ${open ? "text-green-600" : "text-gray-500"}`}>
            {!current ? "..." : open ? "Триває" : "Завершено"}
          </p>
          <p className="text-sm text-gray-500 mt-0.5">Статус</p>
        </div>
        <div className="card p-5 text-center">
          <p className="text-lg font-extrabold text-brand-600">{current ? formatCountdown(secondsLeft) : "..."}</p>
          <p className="text-sm text-gray-500 mt-0.5">До завершення</p>
        </div>
        <div className="card p-5 text-center">
          <p className="text-lg font-extrabold text-gray-900">{current ? current.entryCount : "..."}</p>
          <p className="text-sm text-gray-500 mt-0.5">Учасників</p>
        </div>
        <div className="card p-5 text-center">
          <p className="text-lg font-extrabold text-gray-900">{current ? current.voteCount : "..."}</p>
          <p className="text-sm text-gray-500 mt-0.5">Голосів</p>
        </div>
      </div>

      {/* Transaction status */}
      {(busy || confirmed || writeError) && (
        <div
          className={`rounded-xl px-4 py-3 text-sm font-medium mb-6 border ${
            writeError
              ? "bg-red-50 text-red-800 border-red-200"
              : confirmed
              ? "bg-green-50 text-green-800 border-green-200"
              : "bg-yellow-50 text-yellow-800 border-yellow-200"
          }`}
        >
          {writeError
            ? errorText(writeError)
            : confirmed
            ? "Транзакцію підтверджено."
            : isPending
            ? "Підтвердіть транзакцію у гаманці."
            : "Очікуємо підтвердження в мережі."}
          {txHash && (
            <a
              href={`https://sepolia.etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-3 underline opacity-80 hover:opacity-100"
            >
              Переглянути в Etherscan
            </a>
          )}
        </div>
      )}

      {/* Results of the previous contest */}
      {lastResults && (
        <section className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Переможці конкурсу №{lastResults.contest.id}</h2>
          <p className="text-sm text-gray-500 mb-4">Підсумки підведено {formatDate(lastResults.contest.endTime)}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {lastResults.winners.map((w, i) => (
              <WinnerCard key={w.id} entry={w} place={i} />
            ))}
          </div>
        </section>
      )}

      {/* Contest ended but not finalized yet */}
      {ended && current && (
        <section className="card p-6 mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Конкурс №{current.id} завершено</h2>
          <p className="text-sm text-gray-500 mb-4">
            Голосування закрито. Натисніть кнопку, щоб зафіксувати переможців і відкрити наступний конкурс на 3 місяці.
            Дію може виконати будь-який гаманець.
          </p>
          {(data?.leaders.length ?? 0) > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-5">
              {data!.leaders.map((w, i) => (
                <WinnerCard key={w.id} entry={w} place={i} />
              ))}
            </div>
          )}
          {isConnected ? (
            <button onClick={doFinalize} disabled={busy} className="btn-primary">
              Завершити конкурс і відкрити новий
            </button>
          ) : (
            <ConnectButton />
          )}
        </section>
      )}

      {/* Return of locked NFTs */}
      {pendingReturns.length > 0 && (
        <section className="card p-6 mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Повернення NFT</h2>
          <p className="text-sm text-gray-500 mb-4">
            Після завершення конкурсу NFT повертаються власникам. Повернути токени може будь-який гаманець, токен завжди
            потрапляє до початкового власника.
          </p>
          <div className="space-y-3">
            {pendingReturns.map((r) => (
              <div key={r.contestId} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-gray-100 px-4 py-3">
                <p className="text-sm text-gray-700">
                  Конкурс №{r.contestId}: очікують повернення {r.ids.length} NFT
                  {r.mine > 0 ? `, з них ваших: ${r.mine}` : ""}
                </p>
                <button onClick={() => doReturn(r.contestId, r.ids)} disabled={busy || !isConnected} className="btn-secondary">
                  Повернути {Math.min(r.ids.length, RETURN_BATCH)} NFT
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Submit own NFT */}
      {open && (
        <section className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Подати NFT на конкурс</h2>
          <p className="text-sm text-gray-500 mb-4">
            NFT блокується на контракті конкурсу до завершення і повертається власнику після завершення. Ліміт: до{" "}
            {data?.maxEntriesPerWallet ?? 0} робіт від одного гаманця
            {data ? ` (ви подали: ${data.my.entriesCount})` : ""}.
          </p>

          {!isConnected ? (
            <ConnectButton />
          ) : tokensLoading ? (
            <p className="text-sm text-gray-500">Завантаження ваших NFT...</p>
          ) : myTokens.length === 0 ? (
            <p className="text-sm text-gray-500">У вашому гаманці немає NFT колекції StudNFT.</p>
          ) : (
            <>
              {!approved && (
                <div className="rounded-xl bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-900 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span>Спочатку дозвольте контракту конкурсу приймати ваші NFT (одноразова дія).</span>
                  <button onClick={doApprove} disabled={busy} className="btn-primary">
                    Дозволити
                  </button>
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {myTokens.map((t) => (
                  <div key={t.tokenId.toString()} className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                    <div className="relative aspect-square bg-gray-50">
                      <NftImage src={t.image} alt={t.name} />
                      <span className="absolute top-2 left-2 bg-white/80 backdrop-blur text-xs font-semibold text-gray-700 px-2 py-0.5 rounded-full">
                        #{t.tokenId.toString()}
                      </span>
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-semibold text-gray-900 truncate mb-2">{t.name || `NFT #${t.tokenId}`}</p>
                      <button
                        onClick={() => doSubmit(t.tokenId)}
                        disabled={busy || !approved || !canSubmitMore}
                        className="btn-primary w-full !px-3 !py-2"
                      >
                        Подати
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      )}

      {/* Entries and voting */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Роботи учасників</h2>
        <p className="text-sm text-gray-500 mb-4">
          Один гаманець має один голос у конкурсі. Голосувати за власну роботу не можна.
          {data?.my.hasVoted ? " Ваш голос уже враховано." : ""}
        </p>

        {!data ? (
          <p className="text-sm text-gray-500">Завантаження...</p>
        ) : sortedEntries.length === 0 ? (
          <div className="card p-12 text-center text-gray-500">У поточному конкурсі ще немає робіт.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {sortedEntries.map((e) => {
              const isMine = !!address && e.owner.toLowerCase() === address.toLowerCase();
              const myVote = data.my.votedFor === e.id;
              const disabled = busy || !open || !isConnected || data.my.hasVoted || isMine;
              return (
                <div key={e.id} className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
                  <div className="relative aspect-square bg-gray-50">
                    <NftImage src={e.image} alt={e.name} />
                    <span className="absolute top-2 left-2 bg-white/80 backdrop-blur text-xs font-semibold text-gray-700 px-2 py-0.5 rounded-full">
                      #{e.tokenId}
                    </span>
                    {isMine && (
                      <span className="absolute top-2 right-2 bg-brand-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                        Ваша робота
                      </span>
                    )}
                    {myVote && (
                      <span className="absolute bottom-2 right-2 bg-green-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                        Ваш голос
                      </span>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="font-semibold text-gray-900 truncate">{e.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5 font-mono">{shortenAddress(e.owner)}</p>
                    <div className="flex items-center justify-between mt-3">
                      <p className="text-sm font-semibold text-brand-600">{e.votes} голосів</p>
                      <button onClick={() => doVote(e.id)} disabled={disabled} className="btn-primary !px-4 !py-2">
                        Голосувати
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Archive */}
      {(data?.past ?? []).filter((p) => p.contest.finalized).length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Архів конкурсів</h2>
          <div className="space-y-8">
            {data!.past
              .filter((p) => p.contest.finalized)
              .map((p) => (
                <div key={p.contest.id}>
                  <p className="text-sm font-semibold text-gray-700 mb-3">
                    Конкурс №{p.contest.id} ({formatDate(p.contest.startTime)} – {formatDate(p.contest.endTime)})
                  </p>
                  {p.winners.length === 0 ? (
                    <p className="text-sm text-gray-500">Переможців немає: голоси не подано.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                      {p.winners.map((w, i) => (
                        <WinnerCard key={w.id} entry={w} place={i} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}
