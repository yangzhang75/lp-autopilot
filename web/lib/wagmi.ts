import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { arbitrumSepolia } from "wagmi/chains";

// WalletConnect Cloud project id — set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in production.
export const wagmiConfig = getDefaultConfig({
  appName: "LP Autopilot",
  projectId:
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "00000000000000000000000000000000",
  chains: [arbitrumSepolia],
  ssr: true,
});
