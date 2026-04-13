"use client";

import { useState } from "react";
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

  const { data: isApproved, refetch: refetchApproval } = useReadContract({
    address: NFT_CONTRACT_ADDRESS,
    abi: STUD_NFT_ABI,
    functionName: "isApprovedForAll",
    args: [address ?? "0x0000000000000000000000000000000000000000", MARKETPLACE_CONTRACT_ADDRESS],
    query: { enabled: !!address, refetchInterval: 3_000 },
  });

  const { data: activeListingsData, refetch: refetchListings } = useReadContract({
    address: MARKETPLACE_CONTRACT_ADDRESS,
    abi: MARKETPLACE_ABI,
    functionName: "getActiveListings",
    query: { refetchInterval: 5_000 },
  });

  const listings = (activeListingsData as any[]) ?? [];
  const activeListing = listings.find(l => l.tokenId === tokenId && l.active);

  const { writeContract, data: txHash, isPending, error: txError, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const isOwner = !!(address && metadata && address.toLowerCase() === metadata.owner.toLowerCase());

  const handleApprove = () => {
    reset();
    writeContract({ address: NFT_CONTRACT_ADDRESS, abi: STUD_NFT_ABI, functionName: "setApprovalForAll", args: [MARKETPLACE_CONTRACT_ADDRESS, true], gas: BigInt(100_000) }, { onSuccess: () => refetchApproval() });
  };

  const handleList = () => {
    if (!listPrice) return;
    reset();
    writeContract({ address: MARKETPLACE_CONTRACT_ADDRESS, abi: MARKETPLACE_ABI, functionName: "listNFT", args: [NFT_CONTRACT_ADDRESS, tokenId, parseEther(listPrice)], gas: BigInt(300_000) }, { onSuccess: () => refetchListings() });
  };

  const handleCancel = () => {
    if (!activeListing) return;
    reset();
    writeContract({ address: MARKETPLACE_CONTRACT_ADDRESS, abi: MARKETPLACE_ABI, functionName: "cancelListing", args: [activeListing.listingId], gas: BigInt(150_000) }, { onSuccess: () => refetchListings() });
  };

  const handleBuy = () => {
    if (!activeListing) return;
    reset();
    writeContract({ address: MARKETPLACE_CONTRACT_ADDRESS, abi: MARKETPLACE_ABI, functionName: "buyNFT", args: [activeListing.listingId], value: activeListing.price, gas: BigInt(500_000) }, { onSuccess: () => refetchListings() });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      {loading ? (
        <div className="text-center text-gray-400 py-20">Loading...</div>
      ) : !metadata ? (
        <div className="text-center py-20">
          <h1 className="text-2xl font-bold mb-4">NFT not found</h1>
          <Link href="/marketplace" className="btn-primary">Back to Marketplace</Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-50 border border-gray-100">
            {metadata.image ? (
              <img src={metadata.image} alt={metadata.name} className="w-full h-full object-contain" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-200 text-8xl">?</div>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <div>
              <span className="text-sm text-gray-400">StudNFT #{tokenId.toString()}</span>
              <h1 className="text-3xl font-extrabold text-gray-900 mt-1">{metadata.name}</h1>
              <div className="mt-2 text-sm">
                <span className="text-gray-400">Owner </span>
                <Link href={`/profile/${metadata.owner}`} className="text-blue-600 font-mono">{shortenAddress(metadata.owner)}</Link>
              </div>
            </div>

            {metadata.description && <p className="text-gray-600 text-sm">{metadata.description}</p>}

            {metadata.attributes && metadata.attributes.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {metadata.attributes.map((attr: any, i: number) => (
                  <div key={i} className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2">
                    <p className="text-xs text-blue-500 font-medium uppercase">{attr.trait_type}</p>
                    <p className="text-sm font-bold text-blue-800">{attr.value}</p>
                  </div>
                ))}
              </div>
            )}

            {activeListing && (
              <div className="card p-5">
                <p className="text-sm text-gray-500">Price</p>
                <p className="text-3xl font-extrabold text-blue-700">{formatEth(activeListing.price)}</p>
                <p className="text-xs text-gray-400 mt-1">by {shortenAddress(activeListing.seller)}</p>
              </div>
            )}

            <div className="space-y-3">
              {!isConnected && <div className="flex justify-center"><ConnectButton /></div>}

              {isConnected && !isOwner && activeListing && (
                <button onClick={handleBuy} disabled={isPending || isConfirming} className="btn-primary w-full py-3">
                  {isPending || isConfirming ? "Processing..." : `Buy for ${formatEth(activeListing.price)}`}
                </button>
              )}

              {isOwner && !isApproved && (
                <button onClick={handleApprove} disabled={isPending || isConfirming} className="btn-secondary w-full py-3">
                  {isPending || isConfirming ? "Approving..." : "Approve Marketplace"}
                </button>
              )}

              {isOwner && isApproved && !activeListing && (
                <div className="flex gap-2">
                  <input className="input" placeholder="Price in ETH" type="number" min="0" step="0.001" value={listPrice} onChange={e => setListPrice(e.target.value)} />
                  <button onClick={handleList} disabled={!listPrice || isPending || isConfirming} className="btn-primary shrink-0">
                    {isPending || isConfirming ? "Listing..." : "List"}
                  </button>
                </div>
              )}

              {isOwner && activeListing && (
                <button onClick={handleCancel} disabled={isPending || isConfirming} className="btn-secondary w-full py-3 text-red-600 border-red-200">
                  {isPending || isConfirming ? "Cancelling..." : "Cancel Listing"}
                </button>
              )}

              <TxStatus hash={txHash} isPending={isPending || isConfirming} isSuccess={isSuccess} isError={!!txError} errorMessage={txError?.message} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
