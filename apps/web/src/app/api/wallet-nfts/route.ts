import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY ?? "";
const BASE_URL = `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_KEY}`;
const STUD_NFT = "0x19a9d64fe37e02f7a07f3749fc1c58a6bcea5e77";

function toProxyUrl(url: string): string {
  if (!url) return "";
  let hash = "";
  if (url.startsWith("ipfs://")) hash = url.replace("ipfs://", "");
  else if (url.includes("/ipfs/")) hash = url.split("/ipfs/")[1];
  else if (url.match(/^(Qm[a-zA-Z0-9]{44}|baf[a-zA-Z0-9]+)$/)) hash = url;
  else return url;
  return `https://studnft.vercel.app/api/ipfs/${hash}`;
}

async function fetchMetaFromUri(uri: string): Promise<{ name?: string; image?: string; description?: string } | null> {
  try {
    const url = uri.startsWith("ipfs://")
      ? uri.replace("ipfs://", "https://cloudflare-ipfs.com/ipfs/")
      : uri.includes("pinata.cloud")
      ? uri.replace("gateway.pinata.cloud", "cloudflare-ipfs.com")
      : uri;

    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("json")) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address");
  if (!address) return NextResponse.json({ nfts: [] });

  try {
    const all = request.nextUrl.searchParams.get("all") === "1";
    const ownedNfts: any[] = [];
    let pageKey: string | undefined;
    for (let page = 0; page < 10; page++) {
      const url =
        `${BASE_URL}/getNFTsForOwner?owner=${address}&withMetadata=true&pageSize=100` +
        (all ? "" : `&contractAddresses[]=${STUD_NFT}`) +
        (pageKey ? `&pageKey=${encodeURIComponent(pageKey)}` : "");
      const res = await fetch(url, { headers: { "Accept": "application/json" } });
      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        return NextResponse.json({ nfts: [], error: `Alchemy ${res.status}: ${text.slice(0, 300)}`, url: ALCHEMY_KEY ? url.replace(ALCHEMY_KEY, "***") : url });
      }
      ownedNfts.push(...(data.ownedNfts ?? []));
      pageKey = data.pageKey;
      if (!pageKey) break;
    }

    const nfts = await Promise.all(ownedNfts.map(async (nft: any) => {
      const rawId = nft.tokenId ?? nft.id?.tokenId ?? "0";
      const tokenId = rawId.startsWith("0x") ? parseInt(rawId, 16).toString() : rawId;
      const contractAddress = nft.contract?.address ?? "";
      const isOurs = contractAddress.toLowerCase() === STUD_NFT;

      let name = nft.name ?? nft.rawMetadata?.name ?? "";
      let image = nft.image?.cachedUrl ?? nft.image?.originalUrl ?? nft.rawMetadata?.image ?? "";
      let description = nft.description ?? nft.rawMetadata?.description ?? "";

      // Decode base64 on-chain URI for our contract
      if (isOurs) {
        const tokenUri = nft.tokenUri?.raw ?? nft.tokenUri?.gateway ?? "";
        if (tokenUri.startsWith("data:application/json;base64,")) {
          try {
            const decoded = JSON.parse(
              Buffer.from(tokenUri.replace("data:application/json;base64,", ""), "base64").toString("utf-8")
            );
            name = decoded.name ?? name;
            image = decoded.image ?? image;
            description = decoded.description ?? description;
          } catch {}
        }
      }

      // For external NFTs — fetch tokenURI manually if image/name missing
      if (!isOurs && (!image || !name)) {
        const tokenUri = nft.tokenUri?.raw ?? nft.tokenUri?.gateway ?? "";
        if (tokenUri) {
          const meta = await fetchMetaFromUri(tokenUri);
          if (meta) {
            name = meta.name ?? name;
            image = meta.image ?? image;
            description = meta.description ?? description;
          }
        }
      }

      return {
        contractAddress,
        tokenId,
        name: name || `NFT #${tokenId}`,
        description,
        image: toProxyUrl(image),
        collection: nft.contract?.name ?? (isOurs ? "StudNFT" : "Unknown"),
      };
    }));

    // Supplement with freshly minted tokens that Alchemy has not indexed yet
    try {
      const known = new Set(
        nfts.filter((n: any) => n.contractAddress.toLowerCase() === STUD_NFT).map((n: any) => String(n.tokenId))
      );
      const rpc = async (body: any) =>
        (await fetch(BASE_URL, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(8000),
        })).json();
      const pad = (n: bigint) => n.toString(16).padStart(64, "0");
      const sup = await rpc({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to: STUD_NFT, data: "0x18160ddd" }, "latest"] });
      const supply = Number(BigInt(sup.result));
      const cand: number[] = [];
      for (let i = Math.max(0, supply - 30); i <= supply; i++) if (!known.has(String(i))) cand.push(i);
      if (cand.length) {
        const owners = await rpc(
          cand.map((i, k) => ({ jsonrpc: "2.0", id: k, method: "eth_call", params: [{ to: STUD_NFT, data: "0x6352211e" + pad(BigInt(i)) }, "latest"] }))
        );
        const mine = cand.filter((_, k) => {
          const r = Array.isArray(owners) ? owners.find((o: any) => o.id === k) : null;
          return r?.result && ("0x" + r.result.slice(26)).toLowerCase() === address.toLowerCase();
        });
        if (mine.length) {
          const uris = await rpc(
            mine.map((i, k) => ({ jsonrpc: "2.0", id: k, method: "eth_call", params: [{ to: STUD_NFT, data: "0xc87b56dd" + pad(BigInt(i)) }, "latest"] }))
          );
          mine.forEach((i, k) => {
            try {
              const r = uris.find((o: any) => o.id === k);
              const b = Buffer.from(r.result.slice(2), "hex");
              const len = Number(BigInt("0x" + b.subarray(32, 64).toString("hex")));
              const uri = b.subarray(64, 64 + len).toString("utf-8");
              let name = "", description = "", image = "";
              if (uri.startsWith("data:application/json;base64,")) {
                const j = JSON.parse(Buffer.from(uri.replace("data:application/json;base64,", ""), "base64").toString("utf-8"));
                name = j.name ?? ""; description = j.description ?? ""; image = j.image ?? "";
              }
              nfts.push({
                contractAddress: STUD_NFT,
                tokenId: String(i),
                name: name || `NFT #${i}`,
                description,
                image: toProxyUrl(image),
                collection: "StudNFT",
              });
            } catch {}
          });
        }
      }
    } catch {}

    nfts.sort((a: any, b: any) =>
      Number(b.contractAddress.toLowerCase() === STUD_NFT) - Number(a.contractAddress.toLowerCase() === STUD_NFT)
    );
    return NextResponse.json({ nfts }, {
      headers: { "Cache-Control": "public, max-age=15" }
    });
  } catch (e) {
    return NextResponse.json({ nfts: [], error: String(e) });
  }
}
