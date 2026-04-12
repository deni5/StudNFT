"use client";
import { useReadContract } from "wagmi";
import { MARKETPLACE_ABI, MARKETPLACE_CONTRACT_ADDRESS } from "@/lib/contracts";

export interface Listing {
  listingId: bigint;
  nftContract: `0x${string}`;
  tokenId: bigint;
  seller: `0x${string}`;
  price: bigint;
  active: boolean;
}

export function useActiveListings() {
  const { data, isLoading, refetch } = useReadContract({
    address: MARKETPLACE_CONTRACT_ADDRESS,
    abi: MARKETPLACE_ABI,
    functionName: "getActiveListings",
    query: { refetchInterval: 5_000 },
  });
  return { listings: (data as Listing[] | undefined) ?? [], isLoading, refetch };
}
