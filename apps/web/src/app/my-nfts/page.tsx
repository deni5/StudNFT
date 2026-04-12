// src/app/my-nfts/page.tsx
"use client";

import { useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAccount, useReadContract } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  STUD_NFT_ABI,
  MARKETPLACE_ABI,
  NFT_CONTRACT_ADDRESS,
  MARKETPLACE_CONTRACT_ADDRESS,
} from "@/lib/contracts";
import { useNFTMetadata } from "@/hooks/useNFTMetadata";
import { formatEth, shortenAddress } from "@/lib/utils";

interface Listing {
  listingId: bigint;
  nftContract: `0x${string}`;
  tokenId: bigint;
  seller: `0x${string}`;
  price: bigint;
  active: boolean;
}

// Single NFT tile (resolves metadata on demand)
function MyNFTTile({ tokenId, listing }: { tokenId: bigint; listing?: Listing }) {
  const { metadata, loading } = useNFTMetadata(tokenId);

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-100 bg-white animate-pulse overflow-hidden">
        <div className="aspect-square bg-gray-100" />
        <div className="p-4 space-y-2">
          <div className="h-4 bg-gray-100 rounded w-3/4" />
          <div className="h-3 bg-gray-100 rounded w-1/2" />
        </div>
      </div>
    );
  }

  const badge = listing?.active ? (
    <span className="absolute top-2 right-2 bg-green-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
      Listed
    </span>
  ) : listing && !listing.active ? (
    <span className="absolute top-2 right-2 bg-gray-400 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
      Sold
    </span>
  ) : null;

  return (
    <Link
      href={`/nft/${tokenId}`}
      className="rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden group block"
    >
      <div className="relative aspect-square bg-gray-50">
        {metadata?.image ? (
          <Image
            src={metadata.image}
            alt={metadata?.name ?? ""}
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
          #{tokenId.toString()}
        </span>
        {badge}
      </div>
      <div className="p-4">
        <p className="font-semibold text-gray-900 truncate">{metadata?.name || `NFT #${tokenId}`}</p>
        {listing?.active && (
          <p className="text-xs text-green-600 font-medium mt-0.5">{formatEth(listing.price)}</p>
        )}
        {listing && !listing.active && (
          <p className="text-xs text-gray-400 mt-0.5">Sold for {formatEth(listing.price)}</p>
        )}
        {!listing && <p className="text-xs text-gray-400 mt-0.5">Not listed</p>}
      </div>
    </Link>
  );
}

export default function MyNFTsPage() {
  const { address, isConnected } = useAccount();

  // Total supply to enumerate tokens
  const { data: totalSupply } = useReadContract({
    address: NFT_CONTRACT_ADDRESS,
    abi: STUD_NFT_ABI,
    functionName: "totalSupply",
    query: { refetchInterval: 10_000 },
  });

  // User's listings (all, including sold/cancelled)
  const { data: userListingsRaw } = useReadContract({
    address: MARKETPLACE_CONTRACT_ADDRESS,
    abi: MARKETPLACE_ABI,
    functionName: "getUserListings",
    args: [address ?? "0x0000000000000000000000000000000000000000"],
    query: { enabled: !!address, refetchInterval: 5_000 },
  });

  const userListings = (userListingsRaw as Listing[] | undefined) ?? [];

  // Enumerate all token IDs owned by current user via ownerOf loop
  // We use a helper component that filters per tokenId to avoid N read hooks
  const tokenIds = useMemo(() => {
    if (!totalSupply) return [];
    return Array.from({ length: Number(totalSupply) }, (_, i) => BigInt(i));
  }, [totalSupply]);

  // Build listing map: tokenId → Listing
  const listingByTokenId = useMemo(() => {
    const map = new Map<string, Listing>();
    for (const l of userListings) {
      map.set(l.tokenId.toString(), l);
    }
    return map;
  }, [userListings]);

  if (!isConnected) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <p className="text-5xl mb-4">👛</p>
        <h1 className="text-2xl font-bold mb-2">My NFTs</h1>
        <p className="text-gray-500 mb-8">Connect your wallet to view your collection.</p>
        <ConnectButton />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">My NFTs</h1>
          <p className="text-gray-500 mt-1 text-sm font-mono">{shortenAddress(address!)}</p>
        </div>
        <Link href="/mint" className="btn-primary">
          + Mint New
        </Link>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        {[
          {
            label: "Listed",
            value: userListings.filter((l) => l.active).length,
            color: "text-green-600",
          },
          {
            label: "Sold",
            value: userListings.filter((l) => !l.active).length,
            color: "text-gray-500",
          },
          {
            label: "Earnings",
            value:
              userListings.filter((l) => !l.active).length > 0
                ? formatEth(
                    userListings
                      .filter((l) => !l.active)
                      .reduce((s, l) => s + l.price, 0n)
                  )
                : "—",
            color: "text-brand-600",
          },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-5 text-center">
            <p className={`text-2xl font-extrabold ${color}`}>{value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* All tokens — filter by owner is done inside OwnedTokenGate */}
      {tokenIds.length === 0 ? (
        <div className="card p-16 text-center">
          <p className="text-5xl mb-4">🎨</p>
          <p className="text-gray-500 text-lg">No NFTs have been minted yet.</p>
          <Link href="/mint" className="btn-primary mt-6 inline-block">
            Mint your first NFT
          </Link>
        </div>
      ) : (
        <OwnedGrid
          tokenIds={tokenIds}
          ownerAddress={address!}
          listingByTokenId={listingByTokenId}
        />
      )}
    </div>
  );
}

// ─── OwnedGrid — renders only tokens owned by the user ───────────────────────
function OwnedGrid({
  tokenIds,
  ownerAddress,
  listingByTokenId,
}: {
  tokenIds: bigint[];
  ownerAddress: string;
  listingByTokenId: Map<string, Listing>;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {tokenIds.map((id) => (
        <OwnerGate
          key={id.toString()}
          tokenId={id}
          ownerAddress={ownerAddress}
          listing={listingByTokenId.get(id.toString())}
        />
      ))}
    </div>
  );
}

function OwnerGate({
  tokenId,
  ownerAddress,
  listing,
}: {
  tokenId: bigint;
  ownerAddress: string;
  listing?: Listing;
}) {
  const { data: owner } = useReadContract({
    address: NFT_CONTRACT_ADDRESS,
    abi: STUD_NFT_ABI,
    functionName: "ownerOf",
    args: [tokenId],
    query: { refetchInterval: 10_000 },
  });

  // Only render if this wallet owns the token OR has an active listing for it
  const owns = owner && (owner as string).toLowerCase() === ownerAddress.toLowerCase();
  const hasListing = listing !== undefined;

  if (!owns && !hasListing) return null;

  return <MyNFTTile tokenId={tokenId} listing={listing} />;
}
