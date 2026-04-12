import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { sepolia } from "wagmi/chains";

export const wagmiConfig = getDefaultConfig({
  appName: "StudNFT",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "studnft-local",
  chains: [sepolia],
  ssr: true,
});
