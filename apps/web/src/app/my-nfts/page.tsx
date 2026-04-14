"use client";

import Link from "next/link";
import { useAccount, useReadContract } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { MARKETPLACE_ABI, MARKETPLACE_CONTRACT_ADDRESS } from "@/lib/contracts";
import { useMyTokens } from "@/hooks/useMyTokens";
import { useNFTMetadata } from "@/hooks/useNFTMetadata";
import { formatEth, shortenAddress } from "@/lib/utils";

interface Listing { listingId: bigint; nftContract: `0x${string}`; tokenId: bigint; seller: `0x${string}`; price: bigint; active: boolean; }

function NFTTile({ tokenId, listing }: { tokenId: bigint; listing?: Listing }) {
  const { metadata, loading } = useNFTMetadata(tokenId);
  if (loading) return <div className="rounded-2xl border border-gray-100 bg-white animate-pulse overflow-hidden"><div className="aspect-square bg-gray-100" /><div className="p-4 h-16" /></div>;
  return (
    <Link href={`/nft/${tokenId}`} className="rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden group block">
      <div className="relative aspect-square bg-gray-50">
        {metadata?.image ? <img src={metadata.image} alt={metadata?.name ?? ""} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" /> : <div className="absolute inset-0 flex items-center justify-center text-gray-300 text-5xl">?</div>}
        <span className="absolute top-2 left-2 bg-white/80 backdrop-blur text-xs font-semibold text-gray-700 px-2 py-0.5 rounded-full">#{tokenId.toString()}</span>
        {listing?.active && <span className="absolute top-2 right-2 bg-green-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">Listed</span>}
      </div>
      <div className="p-4">
        <p className="font-semibold text-gray-900 truncate">{metadata?.name || `NFT #${tokenId}`}</p>
        {listing?.active ? <p className="text-xs text-green-600 mt-0.5">{formatEth(listing.price)}</p> : <p className="text-xs text-blue-500 mt-0.5">List for sale →</p>}
      </div>
    </Link>
  );
}

export default function MyNFTsPage() {
  const { address, isConnected } = useAccount();
  const { tokenIds, loading: tokensLoading } = useMyTokens(address);

  const { data: userListingsRaw } = useReadContract({
    address: MARKETPLACE_CONTRACT_ADDRESS,
    abi: MARKETPLACE_ABI,
    functionName: "getUserListings",
    args: [address ?? "0x0000000000000000000000000000000000000000"],
    query: { enabled: !!address, refetchInterval: 5_000 },
  });

  const userListings = (userListingsRaw as Listing[] | undefined) ?? [];
  const soldListings = userListings.filter(l => !l.active);
  const listingByTokenId = new Map(userListings.map(l => [l.tokenId.toString(), l]));

  if (!isConnected) return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <h1 className="text-2xl font-bold mb-4">My NFTs</h1>
      <ConnectButton />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">My NFTs</h1>
          <p className="text-gray-500 mt-1 text-sm font-mono">{shortenAddress(address!)}</p>
        </div>
        <Link href="/mint" className="btn-primary">+ Mint New</Link>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-10">
        <div className="card p-5 text-center">
          <p className="text-2xl font-extrabold text-blue-600">{tokensLoading ? "..." : tokenIds.length}</p>
          <p className="text-sm text-gray-500 mt-0.5">Minted</p>
        </div>
        <div className="card p-5 text-center">
          <p className="text-2xl font-extrabold text-green-600">{userListings.filter(l => l.active).length}</p>
          <p className="text-sm text-gray-500 mt-0.5">Listed</p>
        </div>
        <div className="card p-5 text-center">
          <p className="text-2xl font-extrabold text-gray-500">{soldListings.length}</p>
          <p className="text-sm text-gray-500 mt-0.5">Sold</p>
        </div>
      </div>

      {tokensLoading && <div className="card p-16 text-center text-gray-400">Loading your NFTs...</div>}

      {!tokensLoading && tokenIds.length === 0 && (
        <div className="card p-16 text-center">
          <p className="text-gray-500 text-lg mb-6">No NFTs minted yet.</p>
          <Link href="/mint" className="btn-primary">Mint your first NFT</Link>
        </div>
      )}

      {!tokensLoading && tokenIds.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Collection ({tokenIds.length})</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {tokenIds.map(id => <NFTTile key={id.toString()} tokenId={id} listing={listingByTokenId.get(id.toString())} />)}
          </div>
        </section>
      )}

      {soldListings.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Sold ({soldListings.length})</h2>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100"><th className="text-left px-5 py-3 text-gray-500 font-medium">Token</th><th className="text-left px-5 py-3 text-gray-500 font-medium">Sold for</th></tr></thead>
              <tbody>
                {soldListings.map(l => (
                  <tr key={l.listingId.toString()} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-3"><Link href={`/nft/${l.tokenId}`} className="text-blue-600 hover:underline font-medium">NFT #{l.tokenId.toString()}</Link></td>
                    <td className="px-5 py-3 text-gray-700">{formatEth(l.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
