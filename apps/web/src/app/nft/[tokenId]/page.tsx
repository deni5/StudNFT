// src/app/nft/[tokenId]/page.tsx
"use client";

import { use, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { parseEther } from "viem";
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useNFTMetadata } from "@/hooks/useNFTMetadata";
import {
  STUD_NFT_ABI,
  MARKETPLACE_ABI,
  NFT_CONTRACT_ADDRESS,
  MARKETPLACE_CONTRACT_ADDRESS,
} from "@/lib/contracts";
import { formatEth, shortenAddress } from "@/lib/utils";
import { TxStatus } from "@/components/TxStatus";

export default function NFTDetailPage({ params }: { params: Promise<{ tokenId: string }> }) {
  const { tokenId: tokenIdStr } = use(params);
  const tokenId = BigInt(tokenIdStr);
  const { address, isConnected } = useAccount();

  const { metadata, loading } = useNFTMetadata(tokenId);

  // Check if the marketplace is approved for user's NFTs
  const { data: isApproved, refetch: refetchApproval } = useReadContract({
    address: NFT_CONTRACT_ADDRESS,
    abi: STUD_NFT_ABI,
    functionName: "isApprovedForAll",
    args: [address ?? "0x0000000000000000000000000000000000000000", MARKETPLACE_CONTRACT_ADDRESS],
    query: { enabled: !!address, refetchInterval: 3_000 },
  });

  // Check for active listing of this token
  // We iterate over active listings to find one for this tokenId
  const [listPrice, setListPrice] = useState("");
  const [activeListingId, setActiveListingId] = useState<bigint | null>(null);
  const [activeListingPrice, setActiveListingPrice] = useState<bigint | null>(null);
  const [listingSeller, setListingSeller] = useState<string | null>(null);

  const { refetch: refetchListings } = useReadContract({
    address: MARKETPLACE_CONTRACT_ADDRESS,
    abi: MARKETPLACE_ABI,
    functionName: "getActiveListings",
    query: {
      refetchInterval: 3_000,
      select: (data: unknown) => {
        const listings = data as Array<{
          listingId: bigint;
          tokenId: bigint;
          price: bigint;
          seller: string;
          active: boolean;
        }>;
        const found = listings?.find(
          (l) => l.tokenId === tokenId && l.active
        );
        if (found) {
          setActiveListingId(found.listingId);
          setActiveListingPrice(found.price);
          setListingSeller(found.seller);
        } else {
          setActiveListingId(null);
          setActiveListingPrice(null);
          setListingSeller(null);
        }
        return found ?? null;
      },
    },
  });

  const {
    writeContract,
    data: txHash,
    isPending,
    error: txError,
    reset,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const isOwner = address && metadata && address.toLowerCase() === metadata.owner.toLowerCase();
  const isBuyer = isConnected && !isOwner;

  // ── Approve marketplace ────────────────────────────────────────────────────
  const handleApprove = () => {
    reset();
    writeContract(
      {
        address: NFT_CONTRACT_ADDRESS,
        abi: STUD_NFT_ABI,
        functionName: "setApprovalForAll",
        args: [MARKETPLACE_CONTRACT_ADDRESS, true],
        gas: BigInt(100_000),
      },
      { onSuccess: () => refetchApproval() }
    );
  };

  // ── List NFT ───────────────────────────────────────────────────────────────
  const handleList = () => {
    if (!listPrice) return;
    reset();
    writeContract(
      {
        address: MARKETPLACE_CONTRACT_ADDRESS,
        abi: MARKETPLACE_ABI,
        functionName: "listNFT",
        args: [NFT_CONTRACT_ADDRESS, tokenId, parseEther(listPrice)],
        gas: BigInt(300_000),
      },
      { onSuccess: () => refetchListings() }
    );
  };

  // ── Cancel listing ─────────────────────────────────────────────────────────
  const handleCancel = () => {
    if (activeListingId === null) return;
    reset();
    writeContract(
      {
        address: MARKETPLACE_CONTRACT_ADDRESS,
        abi: MARKETPLACE_ABI,
        functionName: "cancelListing",
        args: [activeListingId],
        gas: BigInt(150_000),
      },
      { onSuccess: () => refetchListings() }
    );
  };

  // ── Buy NFT ────────────────────────────────────────────────────────────────
  const handleBuy = () => {
    if (activeListingId === null || activeListingPrice === null) return;
    reset();
    writeContract(
      {
        address: MARKETPLACE_CONTRACT_ADDRESS,
        abi: MARKETPLACE_ABI,
        functionName: "buyNFT",
        args: [activeListingId],
        value: activeListingPrice,
        gas: BigInt(300_000),
      },
      { onSuccess: () => refetchListings() }
    );
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 animate-pulse">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="aspect-square bg-gray-100 rounded-2xl" />
          <div className="space-y-4">
            <div className="h-8 bg-gray-100 rounded w-2/3" />
            <div className="h-4 bg-gray-100 rounded w-1/3" />
            <div className="h-24 bg-gray-100 rounded mt-6" />
          </div>
        </div>
      </div>
    );
  }

  if (!metadata) {
    return (
      <div className="max-w-md mx-auto py-20 text-center">
        <p className="text-5xl mb-4">🔍</p>
        <h1 className="text-2xl font-bold mb-2">NFT not found</h1>
        <Link href="/marketplace" className="btn-primary mt-4 inline-block">
          Back to Marketplace
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Image */}
        <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-50 border border-gray-100">
          {metadata.image ? (
            <Image
              src={metadata.image}
              alt={metadata.name}
              fill
              className="object-contain"
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-200 text-8xl">
              🖼
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-sm text-gray-400 font-medium">
                StudNFT #{tokenId.toString()}
              </span>
              <h1 className="text-3xl font-extrabold text-gray-900 mt-1">{metadata.name}</h1>
            </div>
            <Link
              href={`https://sepolia.etherscan.io/token/${NFT_CONTRACT_ADDRESS}?a=${tokenId}`}
              target="_blank"
              className="text-xs text-gray-400 hover:text-gray-700 shrink-0 mt-1"
            >
              Etherscan ↗
            </Link>
          </div>

          {/* Owner */}
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="text-gray-400">Owner</span>
            <Link
              href={`/profile/${metadata.owner}`}
              className="text-brand-600 hover:text-brand-800 font-mono"
            >
              {shortenAddress(metadata.owner)}
            </Link>
          </div>

          {/* Description */}
          {metadata.description && (
            <p className="mt-4 text-gray-600 text-sm leading-relaxed">{metadata.description}</p>
          )}

          {/* Attributes */}
          {metadata.attributes && metadata.attributes.length > 0 && (
            <div className="mt-6">
              <p className="text-sm font-semibold text-gray-700 mb-2">Properties</p>
              <div className="flex flex-wrap gap-2">
                {metadata.attributes.map((attr, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-brand-100 bg-brand-50 px-3 py-2 text-center"
                  >
                    <p className="text-xs text-brand-500 font-medium uppercase tracking-wider">
                      {attr.trait_type}
                    </p>
                    <p className="text-sm font-bold text-brand-800 mt-0.5">{attr.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Listing info */}
          {activeListingPrice !== null && (
            <div className="mt-6 card p-5">
              <p className="text-sm text-gray-500">Current price</p>
              <p className="text-3xl font-extrabold text-brand-700 mt-1">
                {formatEth(activeListingPrice)}
              </p>
              {listingSeller && (
                <p className="text-xs text-gray-400 mt-1">
                  Listed by{" "}
                  <Link href={`/profile/${listingSeller}`} className="underline">
                    {shortenAddress(listingSeller)}
                  </Link>
                </p>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 space-y-3">
            {!isConnected && (
              <div className="flex justify-center">
                <ConnectButton />
              </div>
            )}

            {/* Buyer */}
            {isBuyer && activeListingId !== null && (
              <button
                onClick={handleBuy}
                disabled={isPending || isConfirming}
                className="btn-primary w-full py-3 text-base"
              >
                {isPending || isConfirming
                  ? "Processing…"
                  : `Buy for ${formatEth(activeListingPrice!)}`}
              </button>
            )}

            {/* Owner — approve + list */}
            {isOwner && (
              <>
                {!isApproved && (
                  <button
                    onClick={handleApprove}
                    disabled={isPending || isConfirming}
                    className="btn-secondary w-full py-3"
                  >
                    {isPending || isConfirming ? "Approving…" : "Approve Marketplace"}
                  </button>
                )}

                {isApproved && activeListingId === null && (
                  <div className="flex gap-2">
                    <input
                      className="input"
                      placeholder="Price in ETH"
                      type="number"
                      min="0"
                      step="0.001"
                      value={listPrice}
                      onChange={(e) => setListPrice(e.target.value)}
                    />
                    <button
                      onClick={handleList}
                      disabled={!listPrice || isPending || isConfirming}
                      className="btn-primary shrink-0"
                    >
                      {isPending || isConfirming ? "Listing…" : "List for Sale"}
                    </button>
                  </div>
                )}

                {isOwner && activeListingId !== null && (
                  <button
                    onClick={handleCancel}
                    disabled={isPending || isConfirming}
                    className="btn-secondary w-full py-3 text-red-600 border-red-200 hover:border-red-300 hover:bg-red-50"
                  >
                    {isPending || isConfirming ? "Cancelling…" : "Cancel Listing"}
                  </button>
                )}
              </>
            )}

            {/* TX Status */}
            <TxStatus
              hash={txHash}
              isPending={isPending || isConfirming}
              isSuccess={isSuccess}
              isError={!!txError}
              errorMessage={txError?.message}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
