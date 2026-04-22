"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUserNpmPositions } from "@/lib/hooks/useUserNpmPositions";
import { isAutopilotConfigured } from "@/lib/contract";
import { UNISWAP_ARBITRUM_SEPOLIA_APP } from "@/lib/addresses";

function SkeletonLine({ className }: { className?: string }) {
  return <div className={`h-3 animate-pulse rounded-sm bg-[#262626] ${className ?? ""}`} />;
}

export default function PositionsPage() {
  const { isConnected, isConnecting, address } = useAccount();
  const { data: positions, isLoading, isError, error } = useUserNpmPositions();

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <div className="border-b border-[#262626] bg-[#0a0a0a] px-3 py-2">
        <h1 className="font-mono text-sm text-[#a3a3a3]">Uniswap v3 — Arbitrum Sepolia</h1>
      </div>
      <main className="flex-1 p-3">
        {!isAutopilotConfigured && (
          <p className="mb-3 font-mono text-xs text-amber-200/90">
            Set <span className="text-[#ededed]">NEXT_PUBLIC_LP_AUTOPILOT_ADDRESS</span> to your
            deployed contract.
          </p>
        )}
        {!isConnected && !isConnecting && (
          <p className="font-mono text-sm text-[#666]">Connect a wallet to load your position NFTs.</p>
        )}
        {(isConnecting || (isConnected && isLoading)) && (
          <div className="grid gap-2 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="border-[#262626] bg-[#111]">
                <CardHeader className="pb-2">
                  <SkeletonLine className="h-3 w-2/3" />
                </CardHeader>
                <CardContent className="space-y-2">
                  <SkeletonLine className="h-2 w-1/2" />
                  <SkeletonLine className="h-2 w-3/4" />
                  <SkeletonLine className="h-2 w-1/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        {isError && (
          <p className="font-mono text-xs text-red-400">
            {error instanceof Error ? error.message : "Failed to load positions."}
          </p>
        )}
        {isConnected && !isLoading && !isError && positions && positions.length === 0 && (
          <div className="max-w-md space-y-2 rounded-sm border border-[#262626] bg-[#111] p-4">
            <p className="font-mono text-sm text-[#a3a3a3]">No Uniswap v3 positions in this wallet.</p>
            <p className="text-xs text-[#666]">
              Add liquidity on Arbitrum Sepolia in the Uniswap app, then refresh this page.
            </p>
            <a
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                "mt-1 inline-flex font-mono text-xs h-7",
              )}
              href={UNISWAP_ARBITRUM_SEPOLIA_APP}
              target="_blank"
              rel="noreferrer"
            >
              Open Uniswap
            </a>
          </div>
        )}
        {isConnected && !isLoading && !isError && positions && positions.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {positions.map((p) => (
              <Card
                key={p.tokenId.toString()}
                className="border-[#262626] bg-[#111] transition-colors hover:border-[#333]"
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-left font-mono text-sm font-normal text-[#ededed]">
                    {p.symbol0}/{p.symbol1}
                    <span className="ml-1.5 text-xs text-[#666]">#{p.tokenId.toString()}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5 text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="text-[#666]">Fee</span>
                    <span className="text-right font-mono text-[#a3a3a3]">{p.feeLabel}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-[#666]">Tick range</span>
                    <span className="text-right font-mono text-[#a3a3a3]">
                      {p.tickLower} <span className="text-[#666]">→</span> {p.tickUpper}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-[#666]">Liquidity</span>
                    <span className="text-right font-mono text-[#a3a3a3]">
                      {p.liquidity.toString()}
                    </span>
                  </div>
                  <div className="pt-1">
                    {isAutopilotConfigured ? (
                      <Link
                        className={cn(
                          buttonVariants({ size: "sm" }),
                          "w-full h-7 justify-center font-mono text-xs",
                        )}
                        href={`/deposit/${p.tokenId.toString()}`}
                      >
                        Deposit to Autopilot
                      </Link>
                    ) : (
                      <span
                        className="inline-flex w-full cursor-not-allowed items-center justify-center rounded-md border border-[#333] h-7 font-mono text-xs text-[#666]"
                        title="Configure autopilot address"
                      >
                        Deposit to Autopilot
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        {isConnected && address && (
          <p className="mt-3 font-mono text-[10px] text-[#555]">Wallet {address}</p>
        )}
      </main>
    </div>
  );
}
