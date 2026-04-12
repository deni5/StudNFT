// src/app/marketplace/page.tsx
"use client";

import { useState, useMemo } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useActiveListings, Listing } from "@/hooks/useActiveListings";
import { useNFTMetadata } from "@/hooks/useNFTMetadata";
import { MARKETPLACE_ABI, MARKETPLACE_CONTRACT_ADDRESS } from "@/lib/contracts";
import { formatEth, shortenAddress } from "@/lib/utils";
import { TxStatus } from "@/components/TxStatus";
import Image from "next/image";
import Link from "next/link";

type SortKey = "newest" | "price_asc" | "price_desc";

function ListingCard({
  listing,
  onBuy,
  buyingId,
}: {
  listing: Listing;
  onBuy: (l: Listing) => void;
  buyingId: bigint | null;
}) {
  const { metadata, loading } = useNFTMetadata(listing.tokenId);
  const { address } = useAccount();
  const isSelf = address?.toLowerCase() === listing.seller.toLowerCase();

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white animate-pulse overflow-hidden">
        <div className="aspect-square bg-gray-100" />
        <div className="p-4 space-y-2">
          <div className="h-4 bg-gray-100 rounded w-3/4" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
          <div className="h-8 bg-gray-100 rounded mt-3" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
      <Link href={`/nft/${listing.tokenId}`} className="block relative aspect-square bg-gray-50">
        {metadata?.image ? (
          <Image
            src={metadata.image}
            alt={metadata.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-300 text-5xl">
            🖼
          </div>
        )}
        <span className="absolute top-2 left-2 bg-white/80 backdrop-blur text-xs font-semibold text-gray-700 px-2 py-0.5 rounded-full">
          #{listing.tokenId.toString()}
        </span>
      </Link>

      <div className="p-4">
        <p className="font-semibold text-gray-900 truncate">
          {metadata?.name || `NFT #${listing.tokenId}`}
        </p>
        <p className="text-xs text-gray-400 mt-0.5 truncate">{shortenAddress(listing.seller)}</p>

        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="font-bold text-brand-700">{formatEth(listing.price)}</span>
          {isSelf ? (
            <span className="text-xs text-gray-400 px-3 py-1.5 rounded-lg border border-gray-100">
              Your listing
            </span>
          ) : (
            <button
              onClick={() => onBuy(listing)}
              disabled={buyingId === listing.listingId}
              className="px-4 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              {buyingId === listing.listingId ? "Buying…" : "Buy"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MarketplacePage() {
  const { listings, isLoading, refetch } = useActiveListings();
  const [sort, setSort] = useState<SortKey>("newest");
  const [search, setSearch] = useState("");
  const [buyingId, setBuyingId] = useState<bigint | null>(null);

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  const sorted = useMemo(() => {
    const filtered = listings.filter(
      (l) =>
        l.tokenId.toString().includes(search) ||
        l.seller.toLowerCase().includes(search.toLowerCase())
    );
    switch (sort) {
      case "price_asc":
        return [...filtered].sort((a, b) => (a.price < b.price ? -1 : 1));
      case "price_desc":
        return [...filtered].sort((a, b) => (a.price > b.price ? -1 : 1));
      default:
        return [...filtered].sort((a, b) => (a.listingId > b.listingId ? -1 : 1));
    }
  }, [listings, sort, search]);

  const handleBuy = (listing: Listing) => {
    setBuyingId(listing.listingId);
    writeContract(
      {
        address: MARKETPLACE_CONTRACT_ADDRESS,
        abi: MARKETPLACE_ABI,
        functionName: "buyNFT",
        args: [listing.listingId],
        value: listing.price,
        gas: BigInt(300_000),
      },
      {
        onSuccess: () => {
          setTimeout(() => {
            setBuyingId(null);
            refetch();
          }, 3000);
        },
        onError: () => setBuyingId(null),
      }
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">Marketplace</h1>
          <p className="text-gray-500 mt-1">
            {isLoading ? "Loading…" : `${listings.length} active listing${listings.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="flex gap-2">
          <input
            className="input max-w-xs"
            placeholder="Search by ID or address…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="input w-auto"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
          >
            <option value="newest">Newest</option>
            <option value="price_asc">Price ↑</option>
            <option value="price_desc">Price ↓</option>
          </select>
        </div>
      </div>

      {/* TX status */}
      {(isPending || isSuccess || error) && (
        <div className="mb-6">
          <TxStatus
            hash={hash}
            isPending={isPending}
            isSuccess={isSuccess}
            isError={!!error}
            errorMessage={error?.message}
            label="Purchase"
          />
        </div>
      )}

      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-gray-100 bg-white animate-pulse overflow-hidden">
              <div className="aspect-square bg-gray-100" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-100 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
                <div className="h-8 bg-gray-100 rounded mt-3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && sorted.length === 0 && (
        <div className="card p-20 text-center">
          <p className="text-5xl mb-4">🛒</p>
          <p className="text-gray-500 text-lg">
            {search ? "No listings match your search." : "No active listings yet."}
          </p>
          <Link href="/mint" className="btn-primary mt-6 inline-block">
            Mint the first NFT
          </Link>
        </div>
      )}

      {!isLoading && sorted.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {sorted.map((listing) => (
            <ListingCard
              key={listing.listingId.toString()}
              listing={listing}
              onBuy={handleBuy}
              buyingId={buyingId}
            />
          ))}
        </div>
      )}
    </div>
  );
}
