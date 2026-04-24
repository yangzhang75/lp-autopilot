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
    <div className="w-full max-w-2xl">
      <p className="mb-1 font-mono text-[10px] uppercase text-[#666]">Autopilot band (center ± range ticks)</p>
      <div className="relative h-9 w-full overflow-hidden rounded-sm border border-[#262626]">
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
      <div className="mt-0.5 flex justify-between font-mono text-[10px] text-[#666]">
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
      <div className="border-b border-[#262626] bg-[#0a0a0a] px-3 py-1.5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="font-mono text-sm text-[#a3a3a3]">
            Position
            {tokenId !== undefined ? <span className="ml-1.5 text-[#ededed]">#{tokenId.toString()}</span> : null}
          </h1>
        </div>
        <p className="mt-0.5 font-mono text-[10px] text-[#555]">Auto refresh every {ONCHAIN_POLL_MS / 1000}s</p>
      </div>

      <main className="flex-1 space-y-3 p-3">
        <WrongNetworkBanner />
        {!isConnected && positionState && !notDeposited && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-[#333] bg-[#111] px-3 py-2">
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
              <div key={i} className="h-16 rounded-sm border border-[#262626] bg-[#111] animate-pulse" />
            ))}
          </div>
        )}

        {tokenId && !isLoading && notDeposited && (
          <div className="max-w-md rounded-sm border border-[#333] bg-[#111] p-3 font-mono text-sm text-[#a3a3a3]">
            This id is not deposited in Autopilot.
            <div className="mt-2">
              <Link className="text-[#888] underline hover:text-[#ededed]" href={`/deposit/${tokenId.toString()}`}>
                Open deposit
              </Link>
            </div>
          </div>
        )}

        {positionState && !notDeposited && (
          <>
            {isExited && (
              <div className="max-w-2xl rounded-sm border border-amber-800/50 bg-amber-950/30 px-3 py-2 font-mono text-xs text-amber-100/90">
                V1 exit: liquidity was removed and the NFT was burned. Pending token0/token1 in the contract. Withdraw to
                return any remaining ERC20s (this position key no longer has an active LP NFT in Autopilot).
                {positionState.pending0 + positionState.pending1 > BigInt(0) ? (
                  <span className="mt-1 block text-[10px] text-amber-200/80">
                    Pending (raw): {positionState.pending0.toString()} (t0) · {positionState.pending1.toString()} (t1)
                  </span>
                ) : null}
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              <div className="border border-[#262626] bg-[#111] p-2">
                <p className="text-[10px] font-mono uppercase text-[#666]">Status</p>
                {isExited ? (
                  <p className="mt-0.5 font-mono text-3xl font-medium tabular-nums tracking-tight text-amber-200/90">
                    EXITED (v1)
                  </p>
                ) : inRange ? (
                  <p className="badge-in-range-glow mt-0.5 inline-block rounded-sm font-mono text-3xl font-medium tabular-nums tracking-tight text-[#00ff88]">
                    IN RANGE
                  </p>
                ) : (
                  <p className="badge-out-range-glow mt-0.5 inline-block rounded-sm font-mono text-3xl font-medium tabular-nums tracking-tight text-red-400/90">
                    OUT OF RANGE
                  </p>
                )}
              </div>
              <div className="border border-[#262626] bg-[#111] p-2 text-right">
                <p className="text-[10px] font-mono uppercase text-[#666]">Current price</p>
                <p className="mt-0.5 font-mono text-3xl tabular-nums tracking-tight text-[#ededed] break-all text-right leading-none">
                  {currentPriceLabel}
                </p>
                <p className="mt-0.5 text-[10px] text-[#666] tabular-nums">tick {positionState.currentTick}</p>
              </div>
              <div className="border border-[#262626] bg-[#111] p-2 text-right">
                <p className="text-[10px] font-mono uppercase text-[#666]">Center</p>
                <p className="mt-0.5 font-mono text-3xl tabular-nums tracking-tight text-[#ededed] break-all text-right leading-none">
                  {centerPriceLabel}
                </p>
                <p className="mt-0.5 text-[10px] text-[#666] tabular-nums">tick {positionState.centerTick}</p>
              </div>
              <div className="border border-[#262626] bg-[#111] p-2 text-right">
                <p className="text-[10px] font-mono uppercase text-[#666]">Drift</p>
                <p className="mt-0.5 font-mono text-3xl tabular-nums tracking-tight">
                  <DriftValue d={drift} />
                </p>
                <p className="mt-0.5 text-[10px] text-[#666]">from center, price</p>
              </div>
              <div className="border border-[#262626] bg-[#111] p-2 text-right sm:col-span-2 lg:col-span-1">
                <p className="text-[10px] font-mono uppercase text-[#666]">Total fees earned (est. USD)</p>
                <p className="mt-0.5 font-mono text-3xl text-[#ededed] tabular-nums tracking-tight">
                  {evLoading ? "—" : "$" + feeSeries.totalFeesUsd.toFixed(2)}
                </p>
                {feeSeries.hasPriceUnknown && !evLoading && (
                  <p className="mt-0.5 text-[9px] text-amber-200/80" title="Unknown token: fee leg omitted.">
                    Partial/unknown leg (token not ETH/stable heuristic)
                  </p>
                )}
                {!evLoading && (
                  <p className="mt-0.5 text-[9px] text-amber-200/80">USD uses a fixed $3,500 ETH heuristic (demo).</p>
                )}
              </div>
            </div>

            <div className="border-t border-[#262626] pt-3">
              <DashboardFeeChart points={feeSeries.points} loading={evLoading} />
            </div>

            <div className="grid gap-3 border-t border-[#262626] pt-3 md:grid-cols-2">
              <RangeBar
                center={positionState.centerTick}
                current={positionState.currentTick}
                range={positionState.rangeTicks}
                inRange={inBand}
              />
              <div className="flex flex-col justify-end gap-1">
                <p className="text-[10px] font-mono text-[#666]">Atomic rebalance (exit + re-mint)</p>
                <Button
                  type="button"
                  className="h-8 w-full max-w-xs font-mono text-xs"
                  disabled={
                    !isAutopilotConfigured || wrongNetwork || inRange || !hasActiveNft || busy || !isConnected
                  }
                  onClick={onRebalance}
                >
                  {busy ? <TxPendingLabel label="Sending transaction" /> : "Rebalance now"}
                </Button>
                {inRange && hasActiveNft && !isExited && (
                  <p className="mt-2 text-xs leading-relaxed text-[#888]">
                    Position is within range — no rebalance needed. When price drifts beyond ±
                    {positionState.rangeTicks} ticks, this button unlocks and anyone can trigger the atomic exit +
                    re-mint.
                  </p>
                )}
                <p className="text-[10px] text-[#666]">Only when out of band. Anyone can call; you pay gas.</p>
                <Button
                  type="button"
                  variant="outline"
                  className="h-8 w-full max-w-xs font-mono text-xs"
                  disabled={!isAutopilotConfigured || wrongNetwork || busy || !isConnected || !isOwner}
                  onClick={onWithdraw}
                >
                  {busy ? <TxPendingLabel label="Sending transaction" /> : "Withdraw position"}
                </Button>
                <p className="text-[10px] leading-relaxed text-[#666]">
                  Exits your position for good: withdraws the NFT + any collected fees + pending tokens back to your
                  wallet. This closes your Autopilot management.
                </p>
                {displayTxError && (
                  <p className="whitespace-pre-wrap break-words font-mono text-[10px] text-red-400/90">
                    {formatTxError(displayTxError)}
                  </p>
                )}
                {reverted && !displayTxError && (
                  <p className="font-mono text-[10px] text-red-400/90">Transaction reverted on chain.</p>
                )}
              </div>
            </div>

            <div className="border-t border-[#262626] pt-3">
              <p className="mb-1 font-mono text-xs text-[#a3a3a3]">Events</p>
              {evLoading && (
                <div className="space-y-1 max-w-4xl">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-7 max-w-4xl animate-pulse rounded-sm bg-[#1a1a1a]" />
                  ))}
                </div>
              )}
              {evError && <p className="text-xs text-red-400">Could not load events.</p>}
              {events && events.length === 0 && !evLoading && (
                <p className="font-mono text-xs text-[#666]">No events for this id yet.</p>
              )}
              {events && events.length > 0 && (
                <div className="w-full max-w-4xl overflow-x-auto">
                  <table className="w-full border-collapse text-left font-mono text-xs">
                    <thead>
                      <tr className="border-b border-[#262626] text-[#666]">
                        <th className="py-1 pr-3 font-medium">Time</th>
                        <th className="py-1 pr-3 font-medium">Type</th>
                        <th className="py-1 pr-0 font-medium text-right">Tx</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.map((e) => (
                        <tr key={`${e.transactionHash}-${e.logIndex}`} className="border-b border-[#1a1a1a]">
                          <td className="whitespace-nowrap py-1 pr-3 text-right text-[#a3a3a3]">
                            {new Date(e.blockTimestamp * 1000).toLocaleString()}
                          </td>
                          <td className="whitespace-nowrap py-1 pr-3 text-[#ededed]">
                            {e.kind === "deposited"
                              ? "PositionDeposited"
                              : e.kind === "rebalanced"
                                ? "RebalanceTriggered"
                                : "PositionWithdrawn"}
                          </td>
                          <td className="py-1 text-right text-[#888]">
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
