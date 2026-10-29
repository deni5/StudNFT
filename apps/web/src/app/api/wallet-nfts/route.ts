import { NextRequest, NextResponse } from "next/server";

const ALCHEMY_KEY = "alch_4UumlkeRYhf8v5LyXZ6aW";
const BASE_URL = `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_KEY}`;

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address");
  if (!address) return NextResponse.json({ nfts: [] });

  try {
    const res = await fetch(
      `${BASE_URL}/getNFTsForOwner?owner=${address}&withMetadata=true&pageSize=100`,
      { headers: { "Accept": "application/json" } }
    );
    const data = await res.json();

    // Debug: log raw first item
    if (data.ownedNfts?.length > 0) {
      console.log("Raw NFT sample:", JSON.stringify(data.ownedNfts[0], null, 2));
    }

    const nfts = (data.ownedNfts ?? []).map((nft: any) => {
      // tokenId can be hex string like "0x1a" or decimal string
      const rawId = nft.tokenId ?? nft.id?.tokenId ?? "0";
      const tokenId = rawId.startsWith("0x")
        ? parseInt(rawId, 16).toString()
        : rawId;

      return {
        contractAddress: nft.contract?.address ?? "",
        tokenId,
        name: nft.name ?? nft.rawMetadata?.name ?? `NFT #${tokenId}`,
        description: nft.description ?? nft.rawMetadata?.description ?? "",
        image: nft.image?.cachedUrl ?? nft.image?.originalUrl ?? nft.rawMetadata?.image ?? "",
        collection: nft.contract?.name ?? "Unknown",
      };
    });

    return NextResponse.json({ nfts }, {
      headers: { "Cache-Control": "public, max-age=30" }
    });
  } catch (e) {
    return NextResponse.json({ nfts: [], error: String(e) });
  }
}
