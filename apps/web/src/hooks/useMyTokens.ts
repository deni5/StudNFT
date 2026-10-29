"use client";
import { useEffect, useState } from "react";
import { NFT_CONTRACT_ADDRESS } from "@/lib/contracts";

export function useMyTokens(address?: string) {
  const [tokenIds, setTokenIds] = useState<bigint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) { setLoading(false); return; }
    setLoading(true);
    // Use Alchemy API via our wallet-nfts endpoint
    // Filter only StudNFT contract tokens
    fetch(`/api/wallet-nfts?address=${address}`)
      .then(r => r.json())
      .then(data => {
        const studNFTs = (data.nfts ?? []).filter(
          (n: any) => n.contractAddress.toLowerCase() === NFT_CONTRACT_ADDRESS.toLowerCase()
        );
        const ids = studNFTs.map((n: any) => BigInt(n.tokenId));
        setTokenIds(ids);
      })
      .catch(() => setTokenIds([]))
      .finally(() => setLoading(false));
  }, [address]);

  return { tokenIds, loading };
}
