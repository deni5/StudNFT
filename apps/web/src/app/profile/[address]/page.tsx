"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo } from "react";
import { useReadContract } from "wagmi";
import { STUD_NFT_ABI, MARKETPLACE_ABI, NFT_CONTRACT_ADDRESS, MARKETPLACE_CONTRACT_ADDRESS } from "@/lib/contracts";
import { useNFTMetadata } from "@/hooks/useNFTMetadata";
import { formatEth, shortenAddress } from "@/lib/utils";

interface Listing { listingId: bigint; nftContract: `0x${string}`; tokenId: bigint; seller: `0x${string}`; price: bigint; active: boolean; }

function ProfileNFTCard({ tokenId, listing }: { tokenId: bigint; listing?: Listing }) {
  const { metadata, loading } = useNFTMetadata(tokenId);
  if (loading) return <div className="rounded-2xl border border-gray-100 bg-white animate-pulse overflow-hidden"><div className="aspect-square bg-gray-100" /><div className="p-4 h-16 bg-gray-50" /></div>;
  return (
    <Link href={`/nft/${tokenId}`} className="rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden group block">
      <div className="relative aspect-square bg-gray-50">
        {metadata?.image ? <Image src={metadata.image} alt={metadata?.name ?? ""} fill className="object-cover group-hover:scale-105 transition-transform duration-300" unoptimized /> : <div className="absolute inset-0 flex items-center justify-center text-gray-300 text-5xl">?</div>}
        <span className="absolute top-2 left-2 bg-white/80 backdrop-blur text-xs font-semibold text-gray-700 px-2 py-0.5 rounded-full">#{tokenId.toString()}</span>
        {listing?.active && <span className="absolute top-2 right-2 bg-blue-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">{formatEth(listing.price)}</span>}
      </div>
      <div className="p-4">
        <p className="font-semibold text-gray-900 truncate">{metadata?.name || `NFT #${tokenId}`}</p>
        {listing?.active ? <p className="text-xs text-blue-600 mt-0.5">Listed</p> : <p className="text-xs text-gray-400 mt-0.5">In collection</p>}
      </div>
    </Link>
  );
}

function OwnedTokenGate({ tokenId, profileAddress, listing }: { tokenId: bigint; profileAddress: string; listing?: Listing }) {
  const { data: owner } = useReadContract({ address: NFT_CONTRACT_ADDRESS, abi: STUD_NFT_ABI, functionName: "ownerOf", args: [tokenId] });
  const owns = owner && (owner as string).toLowerCase() === profileAddress.toLowerCase();
  if (!owns && !listing) return null;
  return <ProfileNFTCard tokenId={tokenId} listing={listing} />;
}

export default function ProfilePage({ params }: { params: { address: string } }) {
  const profileAddress = params.address as `0x${string}`;

  const { data: totalSupply } = useReadContract({ address: NFT_CONTRACT_ADDRESS, abi: STUD_NFT_ABI, functionName: "totalSupply", query: { refetchInterval: 15_000 } });
  const { data: userListingsRaw } = useReadContract({ address: MARKETPLACE_CONTRACT_ADDRESS, abi: MARKETPLACE_ABI, functionName: "getUserListings", args: [profileAddress], query: { refetchInterval: 5_000 } });

  const userListings = (userListingsRaw as Listing[] | undefined) ?? [];
  const tokenIds = useMemo(() => { if (!totalSupply) return []; return Array.from({ length: Number(totalSupply) }, (_, i) => BigInt(i)); }, [totalSupply]);
  const listingByTokenId = useMemo(() => { const map = new Map<string, Listing>(); for (const l of userListings) map.set(l.tokenId.toString(), l); return map; }, [userListings]);

  const activeListings = userListings.filter(l => l.active);
  const soldListings = userListings.filter(l => !l.active);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="card p-8 mb-8 flex items-center gap-6">
        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-2xl shrink-0">👤</div>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Wallet Profile</h1>
          <p className="font-mono text-sm text-gray-500 mt-1 break-all">{profileAddress}</p>
          <div className="flex gap-4 mt-2 text-sm text-gray-500">
            <span><strong className="text-gray-900">{activeListings.length}</strong> active</span>
            <span><strong className="text-gray-900">{soldListings.length}</strong> sold</span>
          </div>
        </div>
        <a href={`https://sepolia.etherscan.io/address/${profileAddress}`} target="_blank" rel="noopener noreferrer" className="ml-auto btn-secondary text-xs">Etherscan</a>
      </div>

      {activeListings.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-bold mb-4">Active Listings</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {activeListings.map(l => <ProfileNFTCard key={l.listingId.toString()} tokenId={l.tokenId} listing={l} />)}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-xl font-bold mb-4">Collection</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {tokenIds.map(id => <OwnedTokenGate key={id.toString()} tokenId={id} profileAddress={profileAddress.toLowerCase()} listing={listingByTokenId.get(id.toString())} />)}
        </div>
      </section>
    </div>
  );
}
