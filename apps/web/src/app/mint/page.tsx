"use client";
import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { STUD_NFT_ABI, NFT_CONTRACT_ADDRESS } from "@/lib/contracts";
import { buildTokenURI } from "@/lib/utils";
import { TxStatus } from "@/components/TxStatus";

export default function MintPage() {
  const { isConnected } = useAccount();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [attrs, setAttrs] = useState([{ trait_type: "", value: "" }]);

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleMint = () => {
    const validAttrs = attrs.filter(a => a.trait_type && a.value);
    const tokenURI = buildTokenURI({ name, description, image: imageUrl, ...(validAttrs.length > 0 && { attributes: validAttrs }) });
    writeContract({ address: NFT_CONTRACT_ADDRESS, abi: STUD_NFT_ABI, functionName: "mint", args: [tokenURI], gas: BigInt(500_000) });
  };

  if (!isConnected) return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <h1 className="text-2xl font-bold mb-4">Connect wallet to mint</h1>
      <ConnectButton />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-extrabold text-gray-900 mb-8">Mint NFT</h1>
      <div className="card p-8 space-y-6">
        <div>
          <label className="label">Name *</label>
          <input className="input" placeholder="My Artwork" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input resize-none" rows={3} placeholder="Describe your NFT..." value={description} onChange={e => setDescription(e.target.value)} />
        </div>
        <div>
          <label className="label">Image URL</label>
          <input className="input" placeholder="https://... or ipfs://..." value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
          {imageUrl && (
            <div className="mt-3 rounded-xl overflow-hidden border border-gray-100 h-48 bg-gray-50">
              <img src={imageUrl} alt="Preview" className="w-full h-full object-contain" onError={e => (e.target as HTMLImageElement).style.display = "none"} />
            </div>
          )}
        </div>
        <div>
          <label className="label">Attributes</label>
          <div className="space-y-2">
            {attrs.map((a, i) => (
              <div key={i} className="flex gap-2">
                <input className="input" placeholder="Trait" value={a.trait_type} onChange={e => setAttrs(prev => prev.map((x, j) => j === i ? { ...x, trait_type: e.target.value } : x))} />
                <input className="input" placeholder="Value" value={a.value} onChange={e => setAttrs(prev => prev.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} />
                <button onClick={() => setAttrs(prev => prev.filter((_, j) => j !== i))} className="px-3 rounded-xl border border-gray-200 text-gray-400 hover:text-red-500">x</button>
              </div>
            ))}
          </div>
          <button onClick={() => setAttrs(prev => [...prev, { trait_type: "", value: "" }])} className="mt-2 text-sm text-blue-500 font-medium">+ Add attribute</button>
        </div>
        <TxStatus hash={hash} isPending={isPending || isConfirming} isSuccess={isSuccess} isError={!!error} errorMessage={error?.message} label="Mint" />
        {isSuccess && (
          <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
            NFT minted! Go to <a href="/my-nfts" className="underline font-semibold">My NFTs</a> to view it.
          </div>
        )}
        <button onClick={handleMint} disabled={!name.trim() || isPending || isConfirming} className="btn-primary w-full py-3 text-base">
          {isPending || isConfirming ? "Minting..." : "Mint NFT"}
        </button>
      </div>
    </div>
  );
}
