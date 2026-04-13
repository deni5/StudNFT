"use client";

import Link from "next/link";
import { useAccount, useReadContract } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { MARKETPLACE_ABI, MARKETPLACE_CONTRACT_ADDRESS } from "@/lib/contracts";
import { formatEth, shortenAddress } from "@/lib/utils";

interface Listing {
  listingId: bigint;
  nftContract: `0x${string}`;
  tokenId: bigint;
  seller: `0x${string}`;
  price: bigint;
  active: boolean;
}

export default function MyNFTsPage() {
  const { address, isConnected } = useAccount();

  const { data: userListingsRaw, isLoading } = useReadContract({
    address: MARKETPLACE_CONTRACT_ADDRESS,
    abi: MARKETPLACE_ABI,
    functionName: "getUserListings",
    args: [address ?? "0x0000000000000000000000000000000000000000"],
    query: { enabled: !!address, refetchInterval: 5_000 },
  });

  const userListings = (userListingsRaw as Listing[] | undefined) ?? [];
  const activeListings = userListings.filter(l => l.active);
  const soldListings = userListings.filter(l => !l.active);

  if (!isConnected) return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <h1 className="text-2xl font-bold mb-4">My NFTs</h1>
      <p className="text-gray-500 mb-8">Connect your wallet to view your collection.</p>
      <ConnectButton />
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">My NFTs</h1>
          <p className="text-gray-500 mt-1 text-sm font-mono">{shortenAddress(address!)}</p>
        </div>
        <Link href="/mint" className="btn-primary">+ Mint New</Link>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-10">
        <div className="card p-5 text-center">
          <p className="text-2xl font-extrabold text-green-600">{activeListings.length}</p>
          <p className="text-sm text-gray-500 mt-0.5">Listed</p>
        </div>
        <div className="card p-5 text-center">
          <p className="text-2xl font-extrabold text-gray-500">{soldListings.length}</p>
          <p className="text-sm text-gray-500 mt-0.5">Sold</p>
        </div>
        <div className="card p-5 text-center">
          <p className="text-2xl font-extrabold text-blue-600">
            {soldListings.length > 0 ? formatEth(soldListings.reduce((s, l) => s + l.price, 0n)) : "—"}
          </p>
          <p className="text-sm text-gray-500 mt-0.5">Earnings</p>
        </div>
      </div>

      {isLoading && <div className="card p-16 text-center text-gray-400">Loading...</div>}

      {!isLoading && activeListings.length === 0 && soldListings.length === 0 && (
        <div className="card p-16 text-center">
          <p className="text-gray-500 text-lg mb-6">No listings yet.</p>
          <Link href="/mint" className="btn-primary">Mint your first NFT</Link>
        </div>
      )}

      {activeListings.length > 0 && (
        <section className="mb-10">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Active Listings ({activeListings.length})</h2>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Token</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Price</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {activeListings.map(l => (
                  <tr key={l.listingId.toString()} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-3">
                      <Link href={`/nft/${l.tokenId}`} className="text-blue-600 hover:underline font-medium">
                        NFT #{l.tokenId.toString()}
                      </Link>
                    </td>
                    <td className="px-5 py-3 font-bold text-blue-700">{formatEth(l.price)}</td>
                    <td className="px-5 py-3">
                      <Link href={`/nft/${l.tokenId}`} className="text-sm text-gray-500 hover:text-gray-700 underline">Manage</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {soldListings.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Sold ({soldListings.length})</h2>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Token</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Sold for</th>
                </tr>
              </thead>
              <tbody>
                {soldListings.map(l => (
                  <tr key={l.listingId.toString()} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-3">
                      <Link href={`/nft/${l.tokenId}`} className="text-blue-600 hover:underline font-medium">
                        NFT #{l.tokenId.toString()}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-gray-700">{formatEth(l.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
