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

function toPublicGateway(url: string): string {
  if (!url) return "";
  // ipfs:// protocol
  if (url.startsWith("ipfs://")) {
    return url.replace("ipfs://", "https://ipfs.io/ipfs/");
  }
  // Private Pinata gateway → public
  if (url.includes(".mypinata.cloud/ipfs/")) {
    const hash = url.split("/ipfs/")[1];
    return `https://ipfs.io/ipfs/${hash}`;
  }
  // gateway.pinata.cloud → ipfs.io
  if (url.includes("gateway.pinata.cloud/ipfs/")) {
    const hash = url.split("/ipfs/")[1];
    return `https://ipfs.io/ipfs/${hash}`;
  }
  // Raw IPFS hash (no protocol, no domain)
  if (url.match(/^(Qm[a-zA-Z0-9]{44}|baf[a-zA-Z0-9]+)$/)) {
    return `https://ipfs.io/ipfs/${url}`;
  }
  return url;
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
      setMetadata({ tokenId, owner: owner as string, tokenURI: uri as string, ...parsed, image: toPublicGateway(parsed.image) });
      setLoading(false);
      return;
    }
    const fetchUri = toPublicGateway(uri as string);
    fetch(fetchUri).then(r => r.json()).then(json => {
      setMetadata({
        tokenId,
        owner: owner as string,
        tokenURI: uri as string,
        name: json.name ?? `NFT #${tokenId}`,
        description: json.description ?? "",
        image: toPublicGateway(json.image ?? ""),
        attributes: json.attributes,
      });
    }).catch(() => {
      setMetadata({ tokenId, owner: owner as string, tokenURI: uri as string, name: `NFT #${tokenId}`, description: "", image: "" });
    }).finally(() => setLoading(false));
  }, [owner, uri, tokenId]);

  return { metadata, loading };
}
