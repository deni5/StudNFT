"use client";
import { useEffect, useState } from "react";

export function useMyTokens(address?: string) {
  const [tokenIds, setTokenIds] = useState<bigint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) { setLoading(false); return; }
    setLoading(true);
    fetch(`/api/my-tokens?address=${address}`)
      .then(r => r.json())
      .then(data => {
        setTokenIds((data.tokenIds ?? []).map((id: string) => BigInt(id)));
      })
      .catch(() => setTokenIds([]))
      .finally(() => setLoading(false));
  }, [address]);

  return { tokenIds, loading };
}
