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

    const nfts = (data.ownedNfts ?? []).map((nft: any) => ({
      contractAddress: nft.contract?.address ?? "",
      tokenId: nft.tokenId ?? "0",
      name: nft.name ?? nft.rawMetadata?.name ?? `NFT #${nft.tokenId}`,
      description: nft.description ?? nft.rawMetadata?.description ?? "",
      image: nft.image?.cachedUrl ?? nft.image?.originalUrl ?? nft.rawMetadata?.image ?? "",
      collection: nft.contract?.name ?? "Unknown",
    }));

    return NextResponse.json({ nfts }, {
      headers: { "Cache-Control": "public, max-age=30" }
    });
  } catch (e) {
    return NextResponse.json({ nfts: [], error: String(e) });
  }
}
