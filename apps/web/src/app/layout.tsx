import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "StudNFT",
  description: "Student NFT Marketplace on Sepolia",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <Providers>
          <Header />
          <main className="min-h-screen">{children}</main>
          <footer className="mt-16 py-8 border-t border-gray-100 text-center text-sm text-gray-400">
            StudNFT · Sepolia Testnet
          </footer>
        </Providers>
      </body>
    </html>
  );
}
