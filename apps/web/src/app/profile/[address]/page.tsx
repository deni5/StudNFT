// src/app/profile/[address]/page.tsx
"use client";

import { use, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useReadContract } from "wagmi";
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

function ProfileNFTCard({ tokenId, listing }: { tokenId: bigint; listing?: Listing }) {
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
        {listing?.active && (
          <span className="absolute top-2 right-2 bg-brand-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
            {formatEth(listing.price)}
          </span>
        )}
      </div>
      <div className="p-4">
        <p className="font-semibold text-gray-900 truncate">{metadata?.name || `NFT #${tokenId}`}</p>
        {listing?.active ? (
          <p className="text-xs text-brand-600 font-medium mt-0.5">Listed · {formatEth(listing.price)}</p>
        ) : (
          <p className="text-xs text-gray-400 mt-0.5">In collection</p>
        )}
      </div>
    </Link>
  );
}

function OwnedTokenGate({
  tokenId,
  profileAddress,
  listing,
}: {
  tokenId: bigint;
  profileAddress: string;
  listing?: Listing;
}) {
  const { data: owner } = useReadContract({
    address: NFT_CONTRACT_ADDRESS,
    abi: STUD_NFT_ABI,
    functionName: "ownerOf",
    args: [tokenId],
  });

  const owns = owner && (owner as string).toLowerCase() === profileAddress.toLowerCase();
  if (!owns && !listing) return null;

  return <ProfileNFTCard tokenId={tokenId} listing={listing} />;
}

export default function ProfilePage({ params }: { params: Promise<{ address: string }> }) {
  const { address: profileAddress } = use(params);
  const checksumAddress = profileAddress as `0x${string}`;

  const { data: totalSupply } = useReadContract({
    address: NFT_CONTRACT_ADDRESS,
    abi: STUD_NFT_ABI,
    functionName: "totalSupply",
    query: { refetchInterval: 15_000 },
  });

  const { data: userListingsRaw } = useReadContract({
    address: MARKETPLACE_CONTRACT_ADDRESS,
    abi: MARKETPLACE_ABI,
    functionName: "getUserListings",
    args: [checksumAddress],
    query: { refetchInterval: 5_000 },
  });

  const userListings = (userListingsRaw as Listing[] | undefined) ?? [];

  const tokenIds = useMemo(() => {
    if (!totalSupply) return [];
    return Array.from({ length: Number(totalSupply) }, (_, i) => BigInt(i));
  }, [totalSupply]);

  const listingByTokenId = useMemo(() => {
    const map = new Map<string, Listing>();
    for (const l of userListings) {
      map.set(l.tokenId.toString(), l);
    }
    return map;
  }, [userListings]);

  const activeListings = userListings.filter((l) => l.active);
  const soldListings = userListings.filter((l) => !l.active);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      {/* Profile header */}
      <div className="card p-8 mb-8 flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-100 to-purple-100 flex items-center justify-center text-4xl shrink-0">
          🎓
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Student Wallet</h1>
          <p className="font-mono text-sm text-gray-500 mt-1 break-all">{checksumAddress}</p>
          <div className="flex gap-4 mt-3 text-sm">
            <span className="text-gray-500">
              <strong className="text-gray-900">{activeListings.length}</strong> active listings
            </span>
            <span className="text-gray-500">
              <strong className="text-gray-900">{soldListings.length}</strong> sold
            </span>
          </div>
        </div>
        <div className="sm:ml-auto flex gap-2">
          <a
            href={`https://sepolia.etherscan.io/address/${checksumAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary text-xs"
          >
            Etherscan ↗
          </a>
        </div>
      </div>

      {/* Active listings */}
      {activeListings.length > 0 && (
        <section className="mb-12">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Active Listings ({activeListings.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {activeListings.map((l) => (
              <ProfileNFTCard
                key={l.listingId.toString()}
                tokenId={l.tokenId}
                listing={l}
              />
            ))}
          </div>
        </section>
      )}

      {/* Collection */}
      <section>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Collection</h2>
        {tokenIds.length === 0 ? (
          <div className="card p-16 text-center">
            <p className="text-gray-400">No NFTs minted yet on this network.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {tokenIds.map((id) => (
              <OwnedTokenGate
                key={id.toString()}
                tokenId={id}
                profileAddress={checksumAddress.toLowerCase()}
                listing={listingByTokenId.get(id.toString())}
              />
            ))}
          </div>
        )}
      </section>

      {/* Sold history */}
      {soldListings.length > 0 && (
        <section className="mt-12">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Sold ({soldListings.length})
          </h2>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Token</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Price</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Listing ID</th>
                </tr>
              </thead>
              <tbody>
                {soldListings.map((l) => (
                  <tr key={l.listingId.toString()} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-3">
                      <Link
                        href={`/nft/${l.tokenId}`}
                        className="text-brand-600 hover:underline font-medium"
                      >
                        #{l.tokenId.toString()}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-gray-700">{formatEth(l.price)}</td>
                    <td className="px-5 py-3 text-gray-400">#{l.listingId.toString()}</td>
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
