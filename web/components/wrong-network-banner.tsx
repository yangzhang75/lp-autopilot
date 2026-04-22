"use client";

import { arbitrumSepolia } from "wagmi/chains";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { Button } from "@/components/ui/button";

type Props = { className?: string };

export function WrongNetworkBanner({ className }: Props) {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();
  const wrong = isConnected && chainId !== arbitrumSepolia.id;
  if (!wrong) return null;
  return (
    <div
      className={[
        "mb-3 flex flex-wrap items-center justify-between gap-2 rounded-sm border border-amber-500/30 bg-amber-500/10 px-3 py-2",
        className ?? "",
      ].join(" ")}
    >
      <p className="font-mono text-xs text-amber-100/90">
        Wrong network. Switch to Arbitrum Sepolia to use this app.
      </p>
      <Button
        type="button"
        size="sm"
        className="h-7 font-mono text-xs"
        onClick={() => switchChain({ chainId: arbitrumSepolia.id })}
        disabled={isPending}
      >
        {isPending ? "Switching…" : "Arbitrum Sepolia"}
      </Button>
    </div>
  );
}
