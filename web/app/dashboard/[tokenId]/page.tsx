"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { isAddressEqual, type Hash } from "viem";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useChainId, usePublicClient, useReadContracts, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { arbitrumSepolia } from "wagmi/chains";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { DashboardFeeChart } from "@/components/dashboard-fee-chart";
import { WrongNetworkBanner } from "@/components/wrong-network-banner";
import { isAutopilotConfigured, lpAutopilotAbi, lpAutopilotAddress } from "@/lib/contract";
import { getPositionEvents, positionEventsRefetchInterval } from "@/lib/events";
import { buildCumulativeFeeSeries } from "@/lib/fee-series";
import { usePosition } from "@/lib/hooks/usePosition";
import { formatTxError } from "@/lib/tx-error";
import { erc20SymbolDecimalsAbi } from "@/lib/abis/erc20";
import { formatPrice1Per0Label, formatTokenAmountString } from "@/lib/uniswap-math";
import { ONCHAIN_POLL_MS } from "@/lib/addresses";
import { TxHashLink } from "@/components/tx-hash-link";
import { TxPendingLabel } from "@/components/tx-pending-label";
import { cn } from "@/lib/utils";

const ARBISCAN = "https://sepolia.arbiscan.io";

function useTokenId() {
  const p = useParams();
  return useMemo(() => {
    const s = p?.tokenId;
    if (typeof s !== "string" || !/^\d+$/.test(s)) return undefined;
    try {
      return BigInt(s);
    } catch {
      return undefined;
    }
  }, [p]);
}

function DriftValue({ d }: { d: number }) {
  const s = d >= 0 ? `+${formatTokenAmountString(d)}%` : `${formatTokenAmountString(d)}%`;
  return <span className="tabular-nums text-[#ededed]">{s}</span>;
}

function RangeBar({
  center,
  current,
  range,
  inRange,
}: {
  center: number;
  current: number;
  range: number;
  inRange: boolean;
}) {
  const left = center - range;
  const right = center + range;
  const pad = Math.max(range, 1) * 0.2;
  const minT = Math.min(left, current) - pad;
  const maxT = Math.max(right, current) + pad;
  const span = maxT - minT || 1;
  const pL = ((left - minT) / span) * 100;
  const pR = ((right - minT) / span) * 100;
  const pC = ((current - minT) / span) * 100;
  return (
    <div className="w-full">
      <div className="relative h-10 w-full overflow-hidden rounded-sm border border-[#262626]">
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(90deg, rgba(180,30,30,0.4) 0% ${pL}%, rgba(0,0,0,0) ${pL}%, rgba(0,0,0,0) ${pR}%, rgba(180,30,30,0.4) ${pR}% 100%)`,
          }}
        />
        <div
          className="absolute bottom-0 top-0"
          style={{
            left: `${pL}%`,
            width: `${pR - pL}%`,
            background: inRange
              ? "linear-gradient(180deg, rgba(0,255,136,0.1) 0%, rgba(0,0,0,0) 100%)"
              : "linear-gradient(180deg, rgba(200,200,200,0.07) 0%, rgba(0,0,0,0) 100%)",
          }}
        />
        <div
          className="absolute top-0 h-full w-px -translate-x-1/2 bg-[#a3a3a3] shadow-sm"
          style={{ left: `${pC}%` }}
          title="current tick"
        />
      </div>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-[#666]">
        <span className="tabular-nums">{minT.toFixed(0)}</span>
        <span className="tabular-nums">{maxT.toFixed(0)}</span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const tokenId = useTokenId();
  const { isConnected, address } = useAccount();
  const { positionState, notDeposited, inRange, drift, isLoading, refetch: refetchPosition } = usePosition(tokenId);
  const hasActiveNft = positionState != null && positionState.activeNftId > BigInt(0);
  const isExited = positionState != null && !notDeposited && !hasActiveNft;
  const inBand = hasActiveNft ? inRange : false;
  const publicClient = usePublicClient();
  const queryClient = useQueryClient();
  const chainId = useChainId();
  const wrongNetwork = isConnected && chainId !== arbitrumSepolia.id;
  const processedHash = useRef<Hash | null>(null);

  const t0 = positionState?.token0;
  const t1 = positionState?.token1;

  const { data: metas } = useReadContracts({
    allowFailure: true,
    contracts: t0 && t1
      ? [
          { address: t0, abi: erc20SymbolDecimalsAbi, functionName: "symbol" as const },
          { address: t0, abi: erc20SymbolDecimalsAbi, functionName: "decimals" as const },
          { address: t1, abi: erc20SymbolDecimalsAbi, functionName: "symbol" as const },
          { address: t1, abi: erc20SymbolDecimalsAbi, functionName: "decimals" as const },
        ]
      : [],
    query: { enabled: Boolean(t0 && t1) },
  });

  const haveMeta = Boolean(
    metas?.[0]?.status === "success" &&
    metas?.[1]?.status === "success" &&
    metas?.[2]?.status === "success" &&
    metas?.[3]?.status === "success" &&
    typeof metas[0].result === "string" &&
    typeof metas[1].result === "number" &&
    typeof metas[2].result === "string" &&
    typeof metas[3].result === "number",
  );

  const sym0 = haveMeta && metas?.[0]?.result != null ? (metas[0].result as string) : "t0";
  const dec0 = haveMeta && metas?.[1]?.result != null ? (metas[1].result as number) : 18;
  const sym1 = haveMeta && metas?.[2]?.result != null ? (metas[2].result as string) : "t1";
  const dec1 = haveMeta && metas?.[3]?.result != null ? (metas[3].result as number) : 18;

  const currentPriceLabel = positionState
    ? haveMeta
      ? formatPrice1Per0Label(
          positionState.currentTick,
          sym0,
          sym1,
          dec0,
          dec1,
        )
      : `tick ${positionState.currentTick}`
    : "—";

  const centerPriceLabel = positionState
    ? haveMeta
      ? formatPrice1Per0Label(
          positionState.centerTick,
          sym0,
          sym1,
          dec0,
          dec1,
        )
      : `tick ${positionState.centerTick}`
    : "—";

  const { data: events, isLoading: evLoading, isError: evError } = useQuery({
    queryKey: ["position-events", tokenId?.toString(), lpAutopilotAddress],
    queryFn: async () => {
      if (!publicClient || tokenId === undefined) return [];
      return getPositionEvents(publicClient, tokenId);
    },
    enabled: Boolean(publicClient && tokenId !== undefined && !notDeposited),
    refetchInterval: positionEventsRefetchInterval,
  });

  const feeSeries = useMemo(() => {
    if (!events || !positionState) {
      return { points: [] as { at: number; tLabel: string; cumulativeUsd: number; stepUsd: number }[], totalFeesUsd: 0, hasPriceUnknown: true };
    }
    return buildCumulativeFeeSeries(
      events,
      dec0,
      dec1,
      sym0,
      sym1,
    );
  }, [events, positionState, dec0, dec1, sym0, sym1]);

  const { writeContract, data: hash, error: writeError, isPending } = useWriteContract();
  const {
    isLoading: isConfirming,
    isSuccess,
    isError: isWaitError,
    error: waitError,
    data: receipt,
  } = useWaitForTransactionReceipt({
    hash: hash as Hash | undefined,
  });
  const busy = isPending || isConfirming;
  const displayTxError = writeError ?? (isWaitError && waitError ? waitError : null);
  const reverted = receipt?.status === "reverted";

  useEffect(() => {
    if (!hash || !isSuccess || !receipt || receipt.status !== "success") return;
    if (processedHash.current === hash) return;
    processedHash.current = hash;
    void (async () => {
      await refetchPosition();
      await queryClient.invalidateQueries({
        queryKey: ["position-events", tokenId?.toString(), lpAutopilotAddress],
      });
    })();
  }, [hash, isSuccess, receipt, refetchPosition, queryClient, tokenId]);

  const onRebalance = useCallback(() => {
    if (tokenId === undefined || inRange || !hasActiveNft) return;
    writeContract({
      address: lpAutopilotAddress,
      abi: lpAutopilotAbi,
      functionName: "checkAndRebalance",
      args: [tokenId],
    });
  }, [tokenId, inRange, hasActiveNft, writeContract]);

  const onWithdraw = useCallback(() => {
    if (tokenId === undefined) return;
    writeContract({
      address: lpAutopilotAddress,
      abi: lpAutopilotAbi,
      functionName: "withdraw",
      args: [tokenId],
    });
  }, [tokenId, writeContract]);

  const isOwner = Boolean(
    address && positionState && isAddressEqual(address, positionState.owner),
  );

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <div className="border-b border-[#262626] bg-[#0a0a0a]">
        <div className="mx-auto w-full max-w-6xl px-3 py-2 md:px-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h1 className="font-mono text-sm text-[#a3a3a3]">
              Position
              {tokenId !== undefined ? (
                <span className="ml-1.5 text-[#ededed]">#{tokenId.toString()}</span>
              ) : null}
            </h1>
            <p className="font-mono text-[10px] uppercase tracking-wide text-[#555]">
              Auto refresh · {ONCHAIN_POLL_MS / 1000}s
            </p>
          </div>
        </div>
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 space-y-4 px-3 py-4 md:px-4 md:py-5">
        <WrongNetworkBanner />
        {!isConnected && positionState && !notDeposited && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-[#262626] bg-[#111] px-3 py-2">
            <p className="font-mono text-xs text-[#a3a3a3]">
              You are viewing public onchain data. Connect a wallet to sign transactions.
            </p>
            <ConnectButton />
          </div>
        )}
        {!isAutopilotConfigured && (
          <p className="font-mono text-xs text-amber-200/90">
            Set <span className="text-[#ededed]">NEXT_PUBLIC_LP_AUTOPILOT_ADDRESS</span> in the web env.
          </p>
        )}

        {tokenId === undefined && <p className="font-mono text-xs text-red-400/90">Invalid id.</p>}

        {isLoading && tokenId !== undefined && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-sm border border-[#262626] bg-[#0d0d0d]" />
            ))}
          </div>
        )}

        {tokenId && !isLoading && notDeposited && (
          <div className="max-w-md rounded-sm border border-[#262626] bg-[#0d0d0d] p-4 font-mono text-sm text-[#a3a3a3]">
            This position id is not deposited in Autopilot.
            <div className="mt-2">
              <Link
                className="font-mono text-xs text-[#00ff88] underline decoration-[#333] underline-offset-2 hover:decoration-[#00ff88]"
                href={`/deposit/${tokenId.toString()}`}
              >
                Open deposit →
              </Link>
            </div>
          </div>
        )}

        {positionState && !notDeposited && (
          <>
            {isExited && (
              <div className="max-w-2xl rounded-sm border border-amber-800/50 bg-amber-950/30 px-3 py-2 font-mono text-xs text-amber-100/90">
                Position exited: liquidity was removed and the LP NFT was burned. Pending token0/token1 sits in the
                contract — withdraw to return any remaining ERC20s to your wallet.
                {positionState.pending0 + positionState.pending1 > BigInt(0) ? (
                  <span className="mt-1 block text-[10px] text-amber-200/80">
                    Pending (raw): {positionState.pending0.toString()} (t0) · {positionState.pending1.toString()} (t1)
                  </span>
                ) : null}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              <div className="rounded-sm border border-[#262626] bg-[#0d0d0d] p-3 transition-colors hover:border-[#333]">
                <p className="font-mono text-[10px] uppercase tracking-wide text-[#666]">Status</p>
                {isExited ? (
                  <p className="mt-1 font-mono text-2xl font-medium tabular-nums tracking-tight text-amber-200/90 lg:text-3xl">
                    EXITED
                  </p>
                ) : inRange ? (
                  <p className="badge-in-range-glow mt-1 inline-block rounded-sm font-mono text-2xl font-medium tabular-nums tracking-tight text-[#00ff88] lg:text-3xl">
                    IN RANGE
                  </p>
                ) : (
                  <p className="badge-out-range-glow mt-1 inline-block rounded-sm font-mono text-2xl font-medium tabular-nums tracking-tight text-red-400/90 lg:text-3xl">
                    OUT OF RANGE
                  </p>
                )}
              </div>
              <div className="rounded-sm border border-[#262626] bg-[#0d0d0d] p-3 text-right transition-colors hover:border-[#333]">
                <p className="font-mono text-[10px] uppercase tracking-wide text-[#666]">Current price</p>
                <p className="mt-1 break-all font-mono text-2xl leading-tight tabular-nums tracking-tight text-[#ededed] lg:text-3xl">
                  {currentPriceLabel}
                </p>
                <p className="mt-1 font-mono text-[10px] tabular-nums text-[#555]">tick {positionState.currentTick}</p>
              </div>
              <div className="rounded-sm border border-[#262626] bg-[#0d0d0d] p-3 text-right transition-colors hover:border-[#333]">
                <p className="font-mono text-[10px] uppercase tracking-wide text-[#666]">Center</p>
                <p className="mt-1 break-all font-mono text-2xl leading-tight tabular-nums tracking-tight text-[#ededed] lg:text-3xl">
                  {centerPriceLabel}
                </p>
                <p className="mt-1 font-mono text-[10px] tabular-nums text-[#555]">tick {positionState.centerTick}</p>
              </div>
              <div className="rounded-sm border border-[#262626] bg-[#0d0d0d] p-3 text-right transition-colors hover:border-[#333]">
                <p className="font-mono text-[10px] uppercase tracking-wide text-[#666]">Drift</p>
                <p className="mt-1 font-mono text-2xl tabular-nums tracking-tight lg:text-3xl">
                  <DriftValue d={drift} />
                </p>
                <p className="mt-1 font-mono text-[10px] text-[#555]">from center, price</p>
              </div>
              <div className="rounded-sm border border-[#262626] bg-[#0d0d0d] p-3 text-right transition-colors hover:border-[#333] sm:col-span-2 lg:col-span-1">
                <p className="font-mono text-[10px] uppercase tracking-wide text-[#666]">Fees (est. USD)</p>
                <p className="mt-1 font-mono text-2xl tabular-nums tracking-tight text-[#ededed] lg:text-3xl">
                  {evLoading ? "—" : "$" + feeSeries.totalFeesUsd.toFixed(2)}
                </p>
                {!evLoading && (
                  <p className="mt-1 font-mono text-[10px] leading-tight text-[#555]">
                    {feeSeries.hasPriceUnknown ? "partial (unknown token leg)" : "ETH=$3,500 heuristic"}
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-sm border border-[#262626] bg-[#0d0d0d] p-4">
              <DashboardFeeChart points={feeSeries.points} loading={evLoading} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="flex flex-col rounded-sm border border-[#262626] bg-[#0d0d0d] p-4">
                <div className="mb-3 flex items-baseline justify-between gap-2">
                  <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#666]">
                    Autopilot band
                  </h3>
                  <span className="font-mono text-[10px] text-[#555]">center ± {positionState.rangeTicks} ticks</span>
                </div>
                <RangeBar
                  center={positionState.centerTick}
                  current={positionState.currentTick}
                  range={positionState.rangeTicks}
                  inRange={inBand}
                />
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-[#1f1f1f] pt-3 font-mono text-xs">
                  <div className="flex justify-between">
                    <dt className="text-[#666]">Lower tick</dt>
                    <dd className="tabular-nums text-[#a3a3a3]">
                      {positionState.centerTick - positionState.rangeTicks}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[#666]">Upper tick</dt>
                    <dd className="tabular-nums text-[#a3a3a3]">
                      {positionState.centerTick + positionState.rangeTicks}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[#666]">Center tick</dt>
                    <dd className="tabular-nums text-[#ededed]">{positionState.centerTick}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-[#666]">Current tick</dt>
                    <dd className={cn(
                      "tabular-nums",
                      inBand ? "text-[#ededed]" : "text-red-400/90",
                    )}>
                      {positionState.currentTick}
                    </dd>
                  </div>
                </dl>
                <p className="mt-3 text-[11px] leading-relaxed text-[#666]">
                  Rebalance unlocks when the current tick leaves the band. Red zones on the bar mark out-of-band price
                  territory.
                </p>
              </div>

              <div className="flex flex-col rounded-sm border border-[#262626] bg-[#0d0d0d] p-4">
                <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[#666]">Actions</h3>
                <div className="space-y-1.5">
                  <p className="font-mono text-[11px] text-[#a3a3a3]">Atomic rebalance</p>
                  <p className="text-[11px] leading-relaxed text-[#666]">
                    Exits the old position, collects fees, and mints a new one centered at current price — all in a
                    single transaction.
                  </p>
                  <Button
                    type="button"
                    className="h-9 w-full font-mono text-xs"
                    disabled={
                      !isAutopilotConfigured || wrongNetwork || inRange || !hasActiveNft || busy || !isConnected
                    }
                    onClick={onRebalance}
                  >
                    {busy ? <TxPendingLabel label="Sending transaction" /> : "Rebalance now"}
                  </Button>
                  {inRange && hasActiveNft && !isExited && (
                    <p className="text-[10px] leading-relaxed text-[#555]">
                      In range — button unlocks when price drifts beyond ±{positionState.rangeTicks} ticks. Anyone can
                      trigger; you pay gas.
                    </p>
                  )}
                  {!inRange && hasActiveNft && (
                    <p className="text-[10px] leading-relaxed text-[#00ff88]/80">
                      Out of band — rebalance available now. Anyone can call; you pay gas.
                    </p>
                  )}
                </div>
                <div className="mt-4 space-y-1.5 border-t border-[#1f1f1f] pt-3">
                  <p className="font-mono text-[11px] text-[#a3a3a3]">Withdraw position</p>
                  <p className="text-[11px] leading-relaxed text-[#666]">
                    Exits for good: returns the LP NFT, collected fees, and any pending tokens to your wallet.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 w-full font-mono text-xs"
                    disabled={!isAutopilotConfigured || wrongNetwork || busy || !isConnected || !isOwner}
                    onClick={onWithdraw}
                  >
                    {busy ? <TxPendingLabel label="Sending transaction" /> : "Withdraw position"}
                  </Button>
                </div>
                {displayTxError && (
                  <p className="mt-3 whitespace-pre-wrap break-words font-mono text-[10px] text-red-400/90">
                    {formatTxError(displayTxError)}
                  </p>
                )}
                {reverted && !displayTxError && (
                  <p className="mt-3 font-mono text-[10px] text-red-400/90">Transaction reverted on chain.</p>
                )}
              </div>
            </div>

            <div className="rounded-sm border border-[#262626] bg-[#0d0d0d] p-4">
              <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[#666]">Events</h3>
              {evLoading && (
                <div className="space-y-1">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-7 animate-pulse rounded-sm bg-[#1a1a1a]" />
                  ))}
                </div>
              )}
              {evError && <p className="font-mono text-xs text-red-400/90">Could not load events.</p>}
              {events && events.length === 0 && !evLoading && (
                <p className="font-mono text-xs text-[#666]">No events for this id yet.</p>
              )}
              {events && events.length > 0 && (
                <div className="w-full overflow-x-auto">
                  <table className="w-full border-collapse text-left font-mono text-xs">
                    <thead>
                      <tr className="border-b border-[#262626] text-[10px] uppercase tracking-wide text-[#666]">
                        <th className="py-2 pr-3 font-medium">Time</th>
                        <th className="py-2 pr-3 font-medium">Event</th>
                        <th className="py-2 pr-0 font-medium text-right">Tx</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.map((e) => (
                        <tr
                          key={`${e.transactionHash}-${e.logIndex}`}
                          className="border-b border-[#1a1a1a] transition-colors hover:bg-[#141414]"
                        >
                          <td className="whitespace-nowrap py-1.5 pr-3 tabular-nums text-[#a3a3a3]">
                            {new Date(e.blockTimestamp * 1000).toLocaleString()}
                          </td>
                          <td className="whitespace-nowrap py-1.5 pr-3 text-[#ededed]">
                            {e.kind === "deposited"
                              ? "PositionDeposited"
                              : e.kind === "rebalanced"
                                ? "RebalanceTriggered"
                                : "PositionWithdrawn"}
                          </td>
                          <td className="py-1.5 text-right text-[#888]">
                            <TxHashLink hash={e.transactionHash} href={`${ARBISCAN}/tx/${e.transactionHash}`} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
