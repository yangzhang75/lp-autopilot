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
import { WalletCta } from "@/components/wallet-cta";
import { WrongNetworkBanner } from "@/components/wrong-network-banner";
import { ManagedPositionsList } from "@/components/managed-positions-list";

function SkeletonLine({ className }: { className?: string }) {
  return <div className={`h-3 animate-pulse rounded-sm bg-[#262626] ${className ?? ""}`} />;
}

export default function PositionsPage() {
  const { isConnected, isConnecting, address } = useAccount();
  const { data: positions, isLoading, isError, error } = useUserNpmPositions();

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <div className="border-b border-[#262626] bg-[#0a0a0a]">
        <div className="mx-auto w-full max-w-6xl px-3 py-2 md:px-4">
          <h1 className="font-mono text-sm text-[#a3a3a3]">
            Uniswap v3 · <span className="text-[#ededed]">Arbitrum Sepolia</span>
          </h1>
        </div>
      </div>
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-3 py-5 md:px-4 md:py-6">
        <WrongNetworkBanner />
        {!isAutopilotConfigured && (
          <p className="font-mono text-xs text-amber-200/90">
            Set <span className="text-[#ededed]">NEXT_PUBLIC_LP_AUTOPILOT_ADDRESS</span> to your
            deployed contract.
          </p>
        )}

        <section>
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#888]">
              Wallet NFTs
            </h2>
            <span className="font-mono text-[10px] text-[#555]">NonfungiblePositionManager</span>
          </div>
          {isConnecting && <p className="font-mono text-sm text-[#888]">Connecting wallet…</p>}
          {!isConnected && !isConnecting && (
            <WalletCta
              title="No wallet connected"
              body="Connect a wallet on Arbitrum Sepolia to list your Uniswap v3 position NFTs from the NonfungiblePositionManager."
            />
          )}
          {(isConnecting || (isConnected && isLoading)) && (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="border-[#262626] bg-[#0d0d0d]">
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
            <p className="font-mono text-xs text-red-400/90">
              {error instanceof Error ? error.message : "Failed to load positions."}
            </p>
          )}
          {isConnected && !isLoading && !isError && positions && positions.length === 0 && (
            <div className="max-w-md rounded-sm border border-dashed border-[#262626] bg-transparent p-5">
              <p className="font-mono text-sm text-[#a3a3a3]">No Uniswap v3 NFTs in this wallet.</p>
              <p className="mt-1 text-xs leading-relaxed text-[#666]">
                Add liquidity on Arbitrum Sepolia in the Uniswap app, then refresh this page.
              </p>
              <a
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "mt-3 inline-flex h-8 font-mono text-xs",
                )}
                href={UNISWAP_ARBITRUM_SEPOLIA_APP}
                target="_blank"
                rel="noreferrer"
              >
                Open Uniswap ↗
              </a>
            </div>
          )}
          {isConnected && !isLoading && !isError && positions && positions.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {positions.map((p) => (
                <Card
                  key={p.tokenId.toString()}
                  className="border-[#262626] bg-[#0d0d0d] transition-all duration-150 ease-out hover:-translate-y-px hover:border-[#00ff88]"
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
                      <span className="text-right font-mono tabular-nums text-[#a3a3a3]">{p.feeLabel}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-[#666]">Tick range</span>
                      <span className="text-right font-mono tabular-nums text-[#a3a3a3]">
                        {p.tickLower} <span className="text-[#555]">→</span> {p.tickUpper}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-[#666]">Liquidity</span>
                      <span className="truncate text-right font-mono tabular-nums text-[#a3a3a3]">
                        {p.liquidity.toString()}
                      </span>
                    </div>
                    <div className="pt-2">
                      {isAutopilotConfigured ? (
                        <Link
                          className={cn(
                            buttonVariants({ size: "sm" }),
                            "h-8 w-full justify-center font-mono text-xs",
                          )}
                          href={`/deposit/${p.tokenId.toString()}`}
                        >
                          Deposit to Autopilot
                        </Link>
                      ) : (
                        <span
                          className="inline-flex h-8 w-full cursor-not-allowed items-center justify-center rounded-md border border-[#333] font-mono text-xs text-[#666]"
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
        </section>

        <ManagedPositionsList />

        {isConnected && address && (
          <p className="font-mono text-[10px] text-[#555]">Wallet {address}</p>
        )}
      </main>
    </div>
  );
}
