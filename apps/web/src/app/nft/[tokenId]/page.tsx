"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { parseEther } from "viem";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useNFTMetadata } from "@/hooks/useNFTMetadata";
import { STUD_NFT_ABI, MARKETPLACE_ABI, NFT_CONTRACT_ADDRESS, MARKETPLACE_CONTRACT_ADDRESS } from "@/lib/contracts";
import { formatEth, shortenAddress } from "@/lib/utils";
import { TxStatus } from "@/components/TxStatus";

export default function NFTDetailPage({ params }: { params: { tokenId: string } }) {
  const tokenId = BigInt(params.tokenId);
  const { address, isConnected } = useAccount();
  const { metadata, loading } = useNFTMetadata(tokenId);
  const [listPrice, setListPrice] = useState("");
  const [activeListingId, setActiveListingId] = useState<bigint | null>(null);
  const [activeListingPrice, setActiveListingPrice] = useState<bigint | null>(null);
  const [listingSeller, setListingSeller] = useState<string | null>(null);

  const { data: isApproved, refetch: refetchApproval } = useReadContract({
    address: NFT_CONTRACT_ADDRESS,
    abi: STUD_NFT_ABI,
    functionName: "isApprovedForAll",
    args: [address ?? "0x0000000000000000000000000000000000000000", MARKETPLACE_CONTRACT_ADDRESS],
    query: { enabled: !!address },
  });

  const { refetch: refetchListings } = useReadContract({
    address: MARKETPLACE_CONTRACT_ADDRESS,
    abi: MARKETPLACE_ABI,
    functionName: "getActiveListings",
    query: {
      refetchInterval: 3_000,
      select: (data: unknown) => {
        const listings = data as Array<{ listingId: bigint; tokenId: bigint; price: bigint; seller: string; active: boolean }>;
        const found = listings?.find(l => l.tokenId === tokenId && l.active);
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

  const { writeContract, data: txHash, isPending, error: txError, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const isOwner = address && metadata && address.toLowerCase() === metadata.owner.toLowerCase();
  const isBuyer = isConnected && !isOwner;

  const handleApprove = () => { reset(); writeContract({ address: NFT_CONTRACT_ADDRESS, abi: STUD_NFT_ABI, functionName: "setApprovalForAll", args: [MARKETPLACE_CONTRACT_ADDRESS, true], gas: BigInt(100_000) }, { onSuccess: () => refetchApproval() }); };
  const handleList = () => { if (!listPrice) return; reset(); writeContract({ address: MARKETPLACE_CONTRACT_ADDRESS, abi: MARKETPLACE_ABI, functionName: "listNFT", args: [NFT_CONTRACT_ADDRESS, tokenId, parseEther(listPrice)], gas: BigInt(300_000) }, { onSuccess: () => refetchListings() }); };
  const handleCancel = () => { if (activeListingId === null) return; reset(); writeContract({ address: MARKETPLACE_CONTRACT_ADDRESS, abi: MARKETPLACE_ABI, functionName: "cancelListing", args: [activeListingId], gas: BigInt(150_000) }, { onSuccess: () => refetchListings() }); };
  const handleBuy = () => { if (activeListingId === null || activeListingPrice === null) return; reset(); writeContract({ address: MARKETPLACE_CONTRACT_ADDRESS, abi: MARKETPLACE_ABI, functionName: "buyNFT", args: [activeListingId], value: activeListingPrice, gas: BigInt(500_000) }, { onSuccess: () => refetchListings() }); };

  if (loading) return <div className="max-w-5xl mx-auto px-4 py-12 text-center text-gray-400">Loading...</div>;
  if (!metadata) return <div className="max-w-md mx-auto py-20 text-center"><h1 className="text-2xl font-bold mb-4">NFT not found</h1><Link href="/marketplace" className="btn-primary">Back</Link></div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-50 border border-gray-100">
          {metadata.image ? <Image src={metadata.image} alt={metadata.name} fill className="object-contain" unoptimized /> : <div className="absolute inset-0 flex items-center justify-center text-gray-200 text-8xl">?</div>}
        </div>
        <div className="flex flex-col">
          <span className="text-sm text-gray-400">StudNFT #{tokenId.toString()}</span>
          <h1 className="text-3xl font-extrabold text-gray-900 mt-1">{metadata.name}</h1>
          <div className="mt-3 text-sm"><span className="text-gray-400">Owner </span><Link href={`/profile/${metadata.owner}`} className="text-blue-600 font-mono">{shortenAddress(metadata.owner)}</Link></div>
          {metadata.description && <p className="mt-4 text-gray-600 text-sm">{metadata.description}</p>}
          {metadata.attributes && metadata.attributes.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {metadata.attributes.map((attr, i) => (
                <div key={i} className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2">
                  <p className="text-xs text-blue-500 font-medium uppercase">{attr.trait_type}</p>
                  <p className="text-sm font-bold text-blue-800">{attr.value}</p>
                </div>
              ))}
            </div>
          )}
          {activeListingPrice !== null && (
            <div className="mt-6 card p-5">
              <p className="text-sm text-gray-500">Price</p>
              <p className="text-3xl font-extrabold text-blue-700">{formatEth(activeListingPrice)}</p>
              {listingSeller && <p className="text-xs text-gray-400 mt-1">by {shortenAddress(listingSeller)}</p>}
            </div>
          )}
          <div className="mt-6 space-y-3">
            {!isConnected && <ConnectButton />}
            {isBuyer && activeListingId !== null && <button onClick={handleBuy} disabled={isPending || isConfirming} className="btn-primary w-full py-3">{isPending || isConfirming ? "Processing..." : `Buy for ${formatEth(activeListingPrice!)}`}</button>}
            {isOwner && !isApproved && <button onClick={handleApprove} disabled={isPending || isConfirming} className="btn-secondary w-full py-3">{isPending || isConfirming ? "Approving..." : "Approve Marketplace"}</button>}
            {isOwner && isApproved && activeListingId === null && (
              <div className="flex gap-2">
                <input className="input" placeholder="Price in ETH" type="number" min="0" step="0.001" value={listPrice} onChange={e => setListPrice(e.target.value)} />
                <button onClick={handleList} disabled={!listPrice || isPending || isConfirming} className="btn-primary shrink-0">{isPending || isConfirming ? "Listing..." : "List"}</button>
              </div>
            )}
            {isOwner && activeListingId !== null && <button onClick={handleCancel} disabled={isPending || isConfirming} className="btn-secondary w-full py-3 text-red-600 border-red-200">{isPending || isConfirming ? "Cancelling..." : "Cancel Listing"}</button>}
            <TxStatus hash={txHash} isPending={isPending || isConfirming} isSuccess={isSuccess} isError={!!txError} errorMessage={txError?.message} />
          </div>
        </div>
      </div>
    </div>
  );
}
