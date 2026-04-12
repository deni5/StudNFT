"use client";
import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/marketplace", label: "Marketplace" },
  { href: "/mint", label: "Mint" },
  { href: "/my-nfts", label: "My NFTs" },
];

export function Header() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
        <Link href="/" className="font-bold text-xl text-blue-600">StudNFT</Link>
        <nav className="hidden sm:flex items-center gap-1">
          {NAV.map(({ href, label }) => (
            <Link key={href} href={href} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${pathname.startsWith(href) ? "bg-blue-50 text-blue-600" : "text-gray-600 hover:bg-gray-50"}`}>
              {label}
            </Link>
          ))}
        </nav>
        <ConnectButton chainStatus="icon" showBalance={false} />
      </div>
    </header>
  );
}
