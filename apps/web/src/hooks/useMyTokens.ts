"use client";
import { useEffect, useState } from "react";
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";
import { NFT_CONTRACT_ADDRESS } from "@/lib/contracts";

// Block when StudNFT contract was deployed on Sepolia
const DEPLOY_BLOCK = 10640000n;

export function useMyTokens(address?: string) {
  const [tokenIds, setTokenIds] = useState<bigint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) { setLoading(false); return; }

    const client = createPublicClient({
      chain: sepolia,
      transport: http("https://sepolia.infura.io/v3/2ca257ec21864f79bd68782dfd3eb391"),
    });

    const CHUNK = 9000n;

    async function fetchAllLogs() {
      const latest = await client.getBlockNumber();
      const allIds: bigint[] = [];

      for (let from = DEPLOY_BLOCK; from <= latest; from += CHUNK) {
        const to = from + CHUNK - 1n > latest ? latest : from + CHUNK - 1n;
        try {
          const logs = await client.getLogs({
            address: NFT_CONTRACT_ADDRESS,
            event: {
              name: "Minted",
              type: "event",
              inputs: [
                { name: "tokenId", type: "uint256", indexed: true },
                { name: "owner", type: "address", indexed: true },
                { name: "tokenURI", type: "string", indexed: false },
              ],
            },
            args: { owner: address as `0x${string}` },
            fromBlock: from,
            toBlock: to,
          });
          for (const log of logs) {
            allIds.push((log.args as any).tokenId as bigint);
          }
        } catch (e) {
          console.error("getLogs chunk error", e);
        }
      }
      setTokenIds(allIds);
      setLoading(false);
    }

    fetchAllLogs();
  }, [address]);

  return { tokenIds, loading };
}
