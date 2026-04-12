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

export function useNFTMetadata(tokenId: bigint) {
  const [metadata, setMetadata] = useState<NFTMetadata | null>(null);
  const [loading, setLoading] = useState(true);

  const { data: owner } = useReadContract({ address: NFT_CONTRACT_ADDRESS, abi: STUD_NFT_ABI, functionName: "ownerOf", args: [tokenId] });
  const { data: uri } = useReadContract({ address: NFT_CONTRACT_ADDRESS, abi: STUD_NFT_ABI, functionName: "tokenURI", args: [tokenId] });

  useEffect(() => {
    if (!owner || !uri) return;
    const parsed = parseTokenURI(uri as string);
    if (parsed) {
      setMetadata({ tokenId, owner: owner as string, tokenURI: uri as string, ...parsed });
      setLoading(false);
      return;
    }
    const ipfsUri = (uri as string).startsWith("ipfs://") ? (uri as string).replace("ipfs://", "https://ipfs.io/ipfs/") : uri as string;
    fetch(ipfsUri).then(r => r.json()).then(json => {
      setMetadata({ tokenId, owner: owner as string, tokenURI: uri as string, name: json.name ?? `NFT #${tokenId}`, description: json.description ?? "", image: json.image?.startsWith("ipfs://") ? json.image.replace("ipfs://", "https://ipfs.io/ipfs/") : json.image ?? "", attributes: json.attributes });
    }).catch(() => {
      setMetadata({ tokenId, owner: owner as string, tokenURI: uri as string, name: `NFT #${tokenId}`, description: "", image: "" });
    }).finally(() => setLoading(false));
  }, [owner, uri, tokenId]);

  return { metadata, loading };
}
