import { NextRequest, NextResponse } from "next/server";

const ALCHEMY_KEY = "alch_4UumlkeRYhf8v5LyXZ6aW";
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
    const res = await fetch(
      `${BASE_URL}/getNFTsForOwner?owner=${address}&withMetadata=true&pageSize=100`,
      { headers: { "Accept": "application/json" } }
    );
    const data = await res.json();

    const nfts = await Promise.all((data.ownedNfts ?? []).map(async (nft: any) => {
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

    return NextResponse.json({ nfts }, {
      headers: { "Cache-Control": "public, max-age=60" }
    });
  } catch (e) {
    return NextResponse.json({ nfts: [], error: String(e) });
  }
}
