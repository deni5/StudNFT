"use client";
import { useState, useEffect } from "react";
import { useReadContract } from "wagmi";
import { STUD_NFT_ABI, NFT_CONTRACT_ADDRESS } from "@/lib/contracts";
import { parseTokenURI } from "@/lib/utils";

export interface NFTMetadata {
  tokenId: bigint;
  owner: string;
  tokenURI: string;
  name: string;
  description: string;
  image: string;
  attributes?: { trait_type: string; value: string }[];
}

function extractHash(url: string): string | null {
  if (!url) return null;
  if (url.startsWith("ipfs://")) return url.replace("ipfs://", "");
  if (url.includes("/ipfs/")) return url.split("/ipfs/")[1];
  if (url.match(/^(Qm[a-zA-Z0-9]{44}|baf[a-zA-Z0-9]+)$/)) return url;
  return null;
}

function toProxyUrl(url: string): string {
  if (!url) return "";
  const hash = extractHash(url);
  if (hash) return `/api/ipfs/${hash}`;
  return url;
}

export function useNFTMetadata(tokenId: bigint) {
  const [metadata, setMetadata] = useState<NFTMetadata | null>(null);
  const [loading, setLoading] = useState(true);

  const { data: owner } = useReadContract({ 
    address: NFT_CONTRACT_ADDRESS, 
    abi: STUD_NFT_ABI, 
    functionName: "ownerOf", 
    args: [tokenId] 
  });
  const { data: uri } = useReadContract({ 
    address: NFT_CONTRACT_ADDRESS, 
    abi: STUD_NFT_ABI, 
    functionName: "tokenURI", 
    args: [tokenId] 
  });

  useEffect(() => {
    if (!owner || !uri) return;
    const parsed = parseTokenURI(uri as string);
    if (parsed) {
      setMetadata({ 
        tokenId, 
        owner: owner as string, 
        tokenURI: uri as string, 
        ...parsed, 
        image: toProxyUrl(parsed.image) 
      });
      setLoading(false);
      return;
    }
    const fetchUri = toProxyUrl(uri as string);
    fetch(fetchUri)
      .then(r => r.json())
      .then(json => {
        setMetadata({
          tokenId,
          owner: owner as string,
          tokenURI: uri as string,
          name: json.name ?? `NFT #${tokenId}`,
          description: json.description ?? "",
          image: toProxyUrl(json.image ?? ""),
          attributes: json.attributes,
        });
      })
      .catch(() => {
        setMetadata({ 
          tokenId, 
          owner: owner as string, 
          tokenURI: uri as string, 
          name: `NFT #${tokenId}`, 
          description: "", 
          image: "" 
        });
      })
      .finally(() => setLoading(false));
  }, [owner, uri, tokenId]);

  return { metadata, loading };
}
