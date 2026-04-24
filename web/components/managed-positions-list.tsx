"use client";

import Link from "next/link";
import { useAccount, useChainId } from "wagmi";
import { arbitrumSepolia } from "wagmi/chains";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useManagedPositions } from "@/lib/hooks/useManagedPositions";
import { isAutopilotConfigured } from "@/lib/contract";

function SkeletonLine({ className }: { className?: string }) {
  return <div className={`h-3 animate-pulse rounded-sm bg-[#262626] ${className ?? ""}`} />;
}

function formatDepositedAgo(timestampSec: number): string {
  if (timestampSec <= 0) return "unknown";
  const now = Math.floor(Date.now() / 1000);
  const d = now - timestampSec;
  if (d < 45) return "just now";
  if (d < 3600) {
    const m = Math.floor(d / 60);
    return `${m} minute${m === 1 ? "" : "s"} ago`;
  }
  if (d < 86400) {
    const h = Math.floor(d / 3600);
    return `${h} hour${h === 1 ? "" : "s"} ago`;
  }
  if (d < 86400 * 7) {
    const day = Math.floor(d / 86400);
    return `${day} day${day === 1 ? "" : "s"} ago`;
  }
  return new Date(timestampSec * 1000).toLocaleDateString();
}

export function ManagedPositionsList() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const onArbSepolia = chainId === arbitrumSepolia.id;
  const { data, isLoading, isError, error, isFetching, isSuccess } = useManagedPositions();
  const active = data?.active ?? [];
  const withdrawn = data?.withdrawn ?? [];

  if (!isAutopilotConfigured) {
    return null;
  }

  return (
    <section className="border-t border-[#262626] pt-6">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#888]">
          Managed by Autopilot
        </h2>
      </div>

      {!isConnected && (
        <p className="font-mono text-xs text-[#666]">
          Connect your wallet on Arbitrum Sepolia to see positions managed by Autopilot.
        </p>
      )}
      {isConnected && !onArbSepolia && (
        <p className="font-mono text-xs text-amber-200/90">
          Switch to Arbitrum Sepolia to load your managed positions.
        </p>
      )}

      {isConnected && onArbSepolia && isLoading && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="border-[#262626] bg-[#0d0d0d]">
              <CardHeader className="pb-2">
                <SkeletonLine className="h-3 w-1/2" />
              </CardHeader>
              <CardContent className="space-y-2">
                <SkeletonLine className="h-2 w-2/3" />
                <SkeletonLine className="h-2 w-1/2" />
                <SkeletonLine className="h-8 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isConnected && onArbSepolia && isError && (
        <p className="font-mono text-xs text-red-400/90">
          {error instanceof Error ? error.message : "Failed to load managed positions."}
        </p>
      )}

      {isConnected &&
        onArbSepolia &&
        isSuccess &&
        !isError &&
        active.length === 0 &&
        withdrawn.length === 0 && (
        <div className="max-w-md rounded-sm border border-dashed border-[#262626] p-5">
          <p className="font-mono text-sm text-[#a3a3a3]">No managed positions yet.</p>
          <p className="mt-1 text-xs leading-relaxed text-[#666]">
            Deposit one of your wallet NFTs above to start automated rebalancing.
          </p>
        </div>
      )}

      {isConnected &&
        onArbSepolia &&
        !isLoading &&
        !isError &&
        active.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {active.map((p) => (
            <Card
              key={p.tokenId.toString()}
              className={cn(
                "border-[#262626] bg-[#0d0d0d] transition-all duration-150 ease-out",
                "hover:-translate-y-px hover:border-[#00ff88]",
                isFetching && "opacity-90",
              )}
            >
              <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 pb-2">
                <CardTitle className="text-left font-mono text-sm font-normal text-[#ededed]">
                  Position #{p.tokenId.toString()}
                </CardTitle>
                <span
                  className={cn(
                    "shrink-0 rounded-sm px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide",
                    p.inRange
                      ? "badge-in-range-glow bg-[#00ff88]/15 text-[#00ff88]"
                      : "badge-out-range-glow bg-red-500/15 text-red-400",
                  )}
                >
                  {p.inRange ? "IN RANGE" : "OUT OF RANGE"}
                </span>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <p className="font-mono text-[#a3a3a3]">
                  {p.symbol0} / {p.symbol1}{" "}
                  <span className="text-[#666]">{p.feeLabel}</span>
                </p>
                <div className="flex justify-between gap-2 text-[#666]">
                  <span>Range</span>
                  <span className="text-right font-mono text-[#a3a3a3]">
                    ±{p.rangeTicks} ticks
                  </span>
                </div>
                <div className="flex justify-between gap-2 text-[#666]">
                  <span>Deposited</span>
                  <span className="text-right font-mono text-[#a3a3a3]">
                    {formatDepositedAgo(p.depositedTimestamp)}
                  </span>
                </div>
                <div className="pt-1">
                  <Link
                    className={cn(
                      buttonVariants({ size: "sm" }),
                      "h-8 w-full justify-center bg-[#00ff88] font-mono text-xs text-[#0a0a0a] hover:bg-[#00dd77]",
                    )}
                    href={`/dashboard/${p.tokenId.toString()}`}
                  >
                    Open dashboard →
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {isConnected &&
        onArbSepolia &&
        !isLoading &&
        !isError &&
        withdrawn.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-wide text-[#555]">Withdrawn</p>
          <ul className="space-y-1.5">
            {withdrawn.map((p) => (
              <li
                key={p.tokenId.toString()}
                className="rounded-sm border border-[#1a1a1a] bg-[#0d0d0d] px-3 py-2 font-mono text-[11px] text-[#555]"
              >
                Position #{p.tokenId.toString()} · {p.symbol0}/{p.symbol1} {p.feeLabel} · ±
                {p.rangeTicks} ticks · deposited {formatDepositedAgo(p.depositedTimestamp)} ·{" "}
                <span className="text-[#444]">Withdrawn</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
