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
      const tokenId = rawId.startsWith("0x")
        ? parseInt(rawId, 16).toString()
        : rawId;

      const contractAddress = nft.contract?.address ?? "";
      const isOurs = contractAddress.toLowerCase() === STUD_NFT;

      let name = nft.name ?? nft.rawMetadata?.name ?? `NFT #${tokenId}`;
      let image = nft.image?.cachedUrl ?? nft.image?.originalUrl ?? nft.rawMetadata?.image ?? "";
      let description = nft.description ?? nft.rawMetadata?.description ?? "";

      // For our contract - fetch metadata from tokenURI via Alchemy
      if (isOurs && (!image || name === `NFT #${tokenId}`)) {
        try {
          const metaRes = await fetch(
            `${BASE_URL}/getNFTMetadata?contractAddress=${contractAddress}&tokenId=${tokenId}&refreshCache=false`,
            { headers: { "Accept": "application/json" } }
          );
          const meta = await metaRes.json();

          // Try to decode base64 tokenURI
          const tokenUri = meta.tokenUri?.raw ?? meta.tokenUri?.gateway ?? "";
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

          if (!image) {
            image = meta.rawMetadata?.image ?? meta.image?.cachedUrl ?? meta.image?.originalUrl ?? "";
          }
          if (name === `NFT #${tokenId}`) {
            name = meta.rawMetadata?.name ?? meta.name ?? name;
          }
        } catch {}
      }

      return {
        contractAddress,
        tokenId,
        name,
        description,
        image: toProxyUrl(image),
        collection: nft.contract?.name ?? (isOurs ? "StudNFT" : "Unknown"),
      };
    }));

    return NextResponse.json({ nfts }, {
      headers: { "Cache-Control": "public, max-age=30" }
    });
  } catch (e) {
    return NextResponse.json({ nfts: [], error: String(e) });
  }
}
