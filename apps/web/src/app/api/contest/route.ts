import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, fallback, http, isAddress } from "viem";
import { sepolia } from "viem/chains";
import {
  CONTEST_ABI,
  NFT_TOKEN_URI_ABI,
  type ContestEntryView,
  type ContestInfoView,
  type ContestResponse,
} from "@/lib/contest";

// Always read fresh chain data: never serve cached RPC responses
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 30;

const ZERO = "0x0000000000000000000000000000000000000000";
const CONTEST = process.env.NEXT_PUBLIC_CONTEST_CONTRACT_ADDRESS as `0x${string}` | undefined;
const NFT = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS as `0x${string}` | undefined;
const PAST_LIMIT = 6;

function emptyResponse(configured: boolean, error?: string): ContestResponse {
  return {
    configured,
    now: Math.floor(Date.now() / 1000),
    maxEntriesPerWallet: 0,
    current: null,
    entries: [],
    leaders: [],
    my: { hasVoted: false, votedFor: null, entriesCount: 0 },
    past: [],
    ...(error ? { error } : {}),
  };
}

function toProxyUrl(url: string): string {
  if (!url) return "";
  let hash = "";
  if (url.startsWith("ipfs://")) hash = url.replace("ipfs://", "");
  else if (url.includes("/ipfs/")) hash = url.split("/ipfs/")[1];
  else if (/^(Qm[a-zA-Z0-9]{44}|baf[a-zA-Z0-9]+)$/.test(url)) hash = url;
  else return url;
  return `/api/ipfs/${hash}`;
}

function decodeTokenUri(uri: string): { name: string; description: string; image: string } | null {
  try {
    const prefix = "data:application/json;base64,";
    if (uri.startsWith(prefix)) {
      const json = JSON.parse(Buffer.from(uri.slice(prefix.length), "base64").toString("utf-8"));
      return {
        name: String(json.name ?? ""),
        description: String(json.description ?? ""),
        image: String(json.image ?? ""),
      };
    }
  } catch {}
  return null;
}

type RawEntry = { id: bigint; owner: string; tokenId: bigint; votes: bigint; returned: boolean };
type RawContest = {
  id: bigint;
  startTime: bigint;
  endTime: bigint;
  finalized: boolean;
  entryCount: bigint;
  voteCount: bigint;
};

const toContest = (c: RawContest): ContestInfoView => ({
  id: Number(c.id),
  startTime: Number(c.startTime),
  endTime: Number(c.endTime),
  finalized: c.finalized,
  entryCount: Number(c.entryCount),
  voteCount: Number(c.voteCount),
});

export async function GET(request: NextRequest) {
  if (!CONTEST || !isAddress(CONTEST) || CONTEST.toLowerCase() === ZERO) {
    return NextResponse.json(emptyResponse(false));
  }

  const address = request.nextUrl.searchParams.get("address");
  const account = address && isAddress(address) ? (address as `0x${string}`) : null;

  try {
    const urls: string[] = [];
    if (process.env.CONTEST_RPC_URL) urls.push(process.env.CONTEST_RPC_URL);
    if (process.env.ALCHEMY_API_KEY) urls.push(`https://eth-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`);
    urls.push("https://ethereum-sepolia-rpc.publicnode.com");

    const client = createPublicClient({
      chain: sepolia,
      transport: fallback(urls.map((u) => http(u, { timeout: 8000 }))),
    });

    const read = <T,>(functionName: string, args: unknown[] = []) =>
      client.readContract({ address: CONTEST, abi: CONTEST_ABI, functionName: functionName as any, args: args as any }) as Promise<T>;

    const currentId = await read<bigint>("currentContestId");

    const [contestRaw, entriesRaw, leadersRaw, maxEntries] = await Promise.all([
      read<RawContest>("getContest", [currentId]),
      read<RawEntry[]>("getEntries", [currentId]),
      read<RawEntry[]>("getWinners", [currentId]),
      read<bigint>("maxEntriesPerWallet"),
    ]);

    let my = { hasVoted: false, votedFor: null as number | null, entriesCount: 0 };
    if (account) {
      const [voted, votedFor, count] = await Promise.all([
        read<boolean>("hasVoted", [currentId, account]),
        read<bigint>("votedFor", [currentId, account]),
        read<bigint>("entriesOf", [currentId, account]),
      ]);
      my = { hasVoted: voted, votedFor: votedFor > 0n ? Number(votedFor) - 1 : null, entriesCount: Number(count) };
    }

    // Results of the most recent finished contests
    const pastIds: bigint[] = [];
    for (let id = currentId - 1n; id >= 1n && pastIds.length < PAST_LIMIT; id--) pastIds.push(id);
    const pastRaw = await Promise.all(
      pastIds.map(async (id) => {
        const [contest, winners, all] = await Promise.all([
          read<RawContest>("getContest", [id]),
          read<RawEntry[]>("getWinners", [id]),
          read<RawEntry[]>("getEntries", [id]),
        ]);
        const unreturned = all.filter((e) => !e.returned);
        return {
          contest,
          winners,
          unreturnedIds: unreturned.map((e) => Number(e.id)),
          myPendingIds: account
            ? unreturned.filter((e) => e.owner.toLowerCase() === account.toLowerCase()).map((e) => Number(e.id))
            : [],
        };
      })
    );

    // Metadata (name, image) for every token that is displayed
    const tokenIds = new Set<string>();
    [...entriesRaw, ...leadersRaw, ...pastRaw.flatMap((p) => p.winners)].forEach((e) => tokenIds.add(e.tokenId.toString()));

    const meta = new Map<string, { name: string; description: string; image: string }>();
    if (NFT && tokenIds.size > 0) {
      const ids = Array.from(tokenIds);
      const uris: (string | null)[] = ids.map(() => null);
      try {
        const results = await client.multicall({
          contracts: ids.map((id) => ({
            address: NFT,
            abi: NFT_TOKEN_URI_ABI,
            functionName: "tokenURI" as const,
            args: [BigInt(id)] as const,
          })),
          allowFailure: true,
        });
        results.forEach((r, i) => {
          if (r.status === "success") uris[i] = r.result as string;
        });
      } catch {}
      // Fallback for tokens the multicall did not return
      await Promise.all(
        ids.map(async (id, i) => {
          if (uris[i] !== null) return;
          try {
            uris[i] = (await client.readContract({
              address: NFT,
              abi: NFT_TOKEN_URI_ABI,
              functionName: "tokenURI",
              args: [BigInt(id)],
            })) as string;
          } catch {}
        })
      );
      uris.forEach((uri, i) => {
        const decoded = uri ? decodeTokenUri(uri) : null;
        if (decoded) meta.set(ids[i], decoded);
      });
    }

    const toEntry = (e: RawEntry): ContestEntryView => {
      const m = meta.get(e.tokenId.toString());
      return {
        id: Number(e.id),
        owner: e.owner,
        tokenId: e.tokenId.toString(),
        votes: Number(e.votes),
        returned: e.returned,
        name: m?.name || `NFT #${e.tokenId}`,
        description: m?.description ?? "",
        image: toProxyUrl(m?.image ?? ""),
      };
    };

    const body: ContestResponse = {
      configured: true,
      now: Math.floor(Date.now() / 1000),
      maxEntriesPerWallet: Number(maxEntries),
      current: toContest(contestRaw),
      entries: entriesRaw.map(toEntry),
      leaders: leadersRaw.map(toEntry),
      my,
      past: pastRaw.map((p) => ({
        contest: toContest(p.contest),
        winners: p.winners.map(toEntry),
        unreturnedIds: p.unreturnedIds,
        myPendingIds: p.myPendingIds,
      })),
    };
    return NextResponse.json(body);
  } catch (e) {
    return NextResponse.json(emptyResponse(true, String(e).slice(0, 300)));
  }
}
