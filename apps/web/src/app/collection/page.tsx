"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { NFT_CONTRACT_ADDRESS } from "@/lib/contracts";
import { shortenAddress } from "@/lib/utils";

interface WalletNFT {
  contractAddress: string;
  tokenId: string;
  name: string;
  description: string;
  image: string;
  collection: string;
}

function NFTCard({ nft }: { nft: WalletNFT }) {
  const isOurs = nft.contractAddress.toLowerCase() === NFT_CONTRACT_ADDRESS.toLowerCase();
  const href = isOurs ? `/nft/${nft.tokenId}` : `https://sepolia.etherscan.io/token/${nft.contractAddress}?a=${nft.tokenId}`;
  const isExternal = !isOurs;

  return (
    
      href={href}
      target={isExternal ? "_blank" : undefined}
      rel={isExternal ? "noopener noreferrer" : undefined}
      className="rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden group block"
    >
      <div className="relative aspect-square bg-gray-50">
        {nft.image ? (
          <img
            src={nft.image}
            alt={nft.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-200 text-5xl">?</div>
        )}
        <span className="absolute top-2 left-2 bg-white/80 backdrop-blur text-xs font-semibold text-gray-700 px-2 py-0.5 rounded-full">
          #{nft.tokenId}
        </span>
        {isOurs && (
          <span className="absolute top-2 right-2 bg-blue-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
            StudNFT
          </span>
        )}
      </div>
      <div className="p-4">
        <p className="font-semibold text-gray-900 truncate">{nft.name}</p>
        <p className="text-xs text-gray-400 mt-0.5 truncate">{nft.collection}</p>
        {!isOurs && (
          <p className="text-xs text-gray-300 mt-0.5 truncate font-mono">{shortenAddress(nft.contractAddress)}</p>
        )}
      </div>
    </a>
  );
}

export default function CollectionPage() {
  const { address, isConnected } = useAccount();
  const [nfts, setNfts] = useState<WalletNFT[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "studnft" | "external">("all");

  useEffect(() => {
    if (!address) { setLoading(false); return; }
    setLoading(true);
    fetch(`/api/wallet-nfts?address=${address}`)
      .then(r => r.json())
      .then(data => setNfts(data.nfts ?? []))
      .catch(() => setNfts([]))
      .finally(() => setLoading(false));
  }, [address]);

  if (!isConnected) return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <h1 className="text-2xl font-bold mb-4">My Collection</h1>
      <p className="text-gray-500 mb-8">Підключіть гаманець щоб побачити всі NFT.</p>
      <ConnectButton />
    </div>
  );

  const studNFTs = nfts.filter(n => n.contractAddress.toLowerCase() === NFT_CONTRACT_ADDRESS.toLowerCase());
  const externalNFTs = nfts.filter(n => n.contractAddress.toLowerCase() !== NFT_CONTRACT_ADDRESS.toLowerCase());

  const filtered = filter === "all" ? nfts : filter === "studnft" ? studNFTs : externalNFTs;

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">My Collection</h1>
          <p className="text-gray-500 mt-1 text-sm font-mono">{shortenAddress(address!)}</p>
        </div>
        <Link href="/mint" className="btn-primary">+ Mint New</Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="card p-5 text-center">
          <p className="text-2xl font-extrabold text-blue-600">{loading ? "..." : nfts.length}</p>
          <p className="text-sm text-gray-500 mt-0.5">Total NFTs</p>
        </div>
        <div className="card p-5 text-center">
          <p className="text-2xl font-extrabold text-blue-500">{loading ? "..." : studNFTs.length}</p>
          <p className="text-sm text-gray-500 mt-0.5">StudNFT</p>
        </div>
        <div className="card p-5 text-center">
          <p className="text-2xl font-extrabold text-gray-500">{loading ? "..." : externalNFTs.length}</p>
          <p className="text-sm text-gray-500 mt-0.5">External</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6">
        {[
          { key: "all", label: "All" },
          { key: "studnft", label: "StudNFT" },
          { key: "external", label: "External" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key as any)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              filter === key
                ? "bg-blue-500 text-white"
                : "border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-gray-100 bg-white animate-pulse overflow-hidden">
              <div className="aspect-square bg-gray-100" />
              <div className="p-4 space-y-2">
                <div className="h-4 bg-gray-100 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="card p-16 text-center">
          <p className="text-gray-500 text-lg mb-6">Немає NFT в цій категорії.</p>
          <Link href="/mint" className="btn-primary">Mint your first NFT</Link>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {filtered.map((nft, i) => <NFTCard key={i} nft={nft} />)}
        </div>
      )}
    </div>
  );
}
