"use client";
import { useEffect, useState } from "react";
import { NFT_CONTRACT_ADDRESS } from "@/lib/contracts";

export interface MyTokenItem {
  tokenId: bigint;
  name: string;
  image: string;
}

export function useMyTokens(address?: string) {
  const [items, setItems] = useState<MyTokenItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) { setLoading(false); return; }
    setLoading(true);
    // Data comes from our /api/wallet-nfts (Alchemy); only StudNFT tokens, newest first
    fetch(`/api/wallet-nfts?address=${address}`)
      .then(r => r.json())
      .then(data => {
        const list: MyTokenItem[] = (data.nfts ?? [])
          .filter((n: any) => n.contractAddress.toLowerCase() === NFT_CONTRACT_ADDRESS.toLowerCase())
          .map((n: any) => ({ tokenId: BigInt(n.tokenId), name: n.name ?? "", image: n.image ?? "" }));
        list.sort((a, b) => (a.tokenId < b.tokenId ? 1 : a.tokenId > b.tokenId ? -1 : 0));
        setItems(list);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [address]);

  return { tokenIds: items.map(i => i.tokenId), items, loading };
}
