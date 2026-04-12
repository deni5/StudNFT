"use client";
import Link from "next/link";

export default function HomePage() {
  return (
    <div>
      <section className="bg-gradient-to-br from-blue-50 via-white to-purple-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <span className="inline-block mb-4 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold uppercase tracking-wide">
            Sepolia Testnet
          </span>
          <h1 className="text-5xl font-extrabold text-gray-900">
            Student NFT <span className="text-blue-500">Marketplace</span>
          </h1>
          <p className="mt-4 text-lg text-gray-500 max-w-xl mx-auto">
            Mint your digital creations and trade NFTs on Ethereum Sepolia testnet.
          </p>
          <div className="mt-8 flex gap-3 justify-center flex-wrap">
            <Link href="/mint" className="px-8 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold text-base transition-colors">
              Mint NFT
            </Link>
            <Link href="/marketplace" className="px-8 py-3 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold text-base transition-colors">
              Browse Marketplace
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 py-16 grid grid-cols-1 sm:grid-cols-3 gap-6 text-center">
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-8">
          <p className="text-4xl mb-3">🎨</p>
          <h2 className="font-bold text-lg text-gray-900">Mint</h2>
          <p className="text-gray-500 text-sm mt-2">Create your own ERC-721 NFT with name, image and properties.</p>
          <Link href="/mint" className="mt-4 inline-block text-blue-500 text-sm font-medium hover:underline">Start minting →</Link>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-8">
          <p className="text-4xl mb-3">🛒</p>
          <h2 className="font-bold text-lg text-gray-900">Trade</h2>
          <p className="text-gray-500 text-sm mt-2">List your NFTs for sale or buy from other students.</p>
          <Link href="/marketplace" className="mt-4 inline-block text-blue-500 text-sm font-medium hover:underline">Browse listings →</Link>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-8">
          <p className="text-4xl mb-3">👛</p>
          <h2 className="font-bold text-lg text-gray-900">Collect</h2>
          <p className="text-gray-500 text-sm mt-2">Manage your collection and track your sales history.</p>
          <Link href="/my-nfts" className="mt-4 inline-block text-blue-500 text-sm font-medium hover:underline">My NFTs →</Link>
        </div>
      </section>
    </div>
  );
}
