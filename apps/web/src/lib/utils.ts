import { formatEther } from "viem";

export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function formatEth(wei: bigint): string {
  return parseFloat(formatEther(wei)).toLocaleString("en-US", { maximumFractionDigits: 4 }) + " ETH";
}

export function buildTokenURI(meta: { name: string; description: string; image: string; attributes?: { trait_type: string; value: string }[] }): string {
  const json = JSON.stringify(meta);
  const encoded = btoa(unescape(encodeURIComponent(json)));
  return `data:application/json;base64,${encoded}`;
}

export function parseTokenURI(uri: string): { name: string; description: string; image: string; attributes?: { trait_type: string; value: string }[] } | null {
  try {
    if (uri.startsWith("data:application/json;base64,")) {
      return JSON.parse(atob(uri.replace("data:application/json;base64,", "")));
    }
    if (uri.startsWith("data:application/json,")) {
      return JSON.parse(decodeURIComponent(uri.replace("data:application/json,", "")));
    }
    return null;
  } catch { return null; }
}
