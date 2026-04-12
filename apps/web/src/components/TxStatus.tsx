interface TxStatusProps {
  hash?: `0x${string}`;
  isPending?: boolean;
  isSuccess?: boolean;
  isError?: boolean;
  errorMessage?: string;
  label?: string;
}

export function TxStatus({ hash, isPending, isSuccess, isError, errorMessage, label = "Transaction" }: TxStatusProps) {
  if (!isPending && !isSuccess && !isError) return null;
  return (
    <div className={`rounded-xl px-4 py-3 text-sm font-medium flex items-start gap-3 ${isPending ? "bg-yellow-50 text-yellow-800 border border-yellow-200" : isSuccess ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
      <span className="text-lg">{isPending ? "⏳" : isSuccess ? "✅" : "❌"}</span>
      <div>
        <p className="font-semibold">{isPending ? `${label} pending…` : isSuccess ? `${label} confirmed!` : `${label} failed`}</p>
        {hash && <a href={`https://sepolia.etherscan.io/tx/${hash}`} target="_blank" rel="noopener noreferrer" className="underline opacity-75 hover:opacity-100 mt-0.5 block">View on Etherscan →</a>}
        {isError && errorMessage && <p className="opacity-75 mt-0.5 text-xs">{errorMessage}</p>}
      </div>
    </div>
  );
}
