"use client";
import { useEffect, useState } from "react";
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";
import { NFT_CONTRACT_ADDRESS } from "@/lib/contracts";

export function useMyTokens(address?: string) {
  const [tokenIds, setTokenIds] = useState<bigint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) { setLoading(false); return; }

    const client = createPublicClient({
      chain: sepolia,
      transport: http("https://sepolia.infura.io/v3/2ca257ec21864f79bd68782dfd3eb391"),
    });

    client.getLogs({
      address: NFT_CONTRACT_ADDRESS,
      event: { name: "Minted", type: "event", inputs: [{ name: "tokenId", type: "uint256", indexed: true }, { name: "owner", type: "address", indexed: true }, { name: "tokenURI", type: "string", indexed: false }] },
      args: { owner: address as `0x${string}` },
      fromBlock: 0n,
    }).then(logs => {
      const ids = logs.map(l => (l.args as any).tokenId as bigint);
      setTokenIds(ids);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [address]);

  return { tokenIds, loading };
}
