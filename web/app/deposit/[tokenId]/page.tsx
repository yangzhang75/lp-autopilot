"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAccount, useChainId, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { arbitrumSepolia } from "wagmi/chains";
import type { Hash } from "viem";
import { isAddressEqual } from "viem";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { isAutopilotConfigured, lpAutopilotAbi, lpAutopilotAddress } from "@/lib/contract";
import { ARBITRUM_SEPOLIA_NPM } from "@/lib/addresses";
import { nonfungiblePositionManagerAbi } from "@/lib/abis/positionManager";
import { useQueryClient } from "@tanstack/react-query";
import { formatFeeTier } from "@/lib/uniswap-math";
import { erc20SymbolDecimalsAbi } from "@/lib/abis/erc20";
import { useReadContracts } from "wagmi";
import { readNpmPositionTuple } from "@/lib/read-npm-position";
import { formatTxError } from "@/lib/tx-error";
import { WalletCta } from "@/components/wallet-cta";
import { WrongNetworkBanner } from "@/components/wrong-network-banner";
import { TxPendingLabel } from "@/components/tx-pending-label";

// shared tuple reader — inline minimal import
function useParseTokenId() {
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

export default function DepositPage() {
  const tokenId = useParseTokenId();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [rangeStr, setRangeStr] = useState("600");
  const [pending, setPending] = useState<"approve" | "deposit" | null>(null);

  const { data: positionRaw } = useReadContract({
    address: ARBITRUM_SEPOLIA_NPM,
    abi: nonfungiblePositionManagerAbi,
    functionName: "positions",
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: { enabled: tokenId !== undefined },
  });

  const { data: owner } = useReadContract({
    address: ARBITRUM_SEPOLIA_NPM,
    abi: nonfungiblePositionManagerAbi,
    functionName: "ownerOf",
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: { enabled: tokenId !== undefined && !!isConnected },
  });

  const { data: isApprovedForAll, refetch: refetchA } = useReadContract({
    address: ARBITRUM_SEPOLIA_NPM,
    abi: nonfungiblePositionManagerAbi,
    functionName: "isApprovedForAll",
    args: address && lpAutopilotAddress ? [address, lpAutopilotAddress] : undefined,
    query: { enabled: Boolean(address && isConnected) },
  });

  const { data: getApproved, refetch: refetchB } = useReadContract({
    address: ARBITRUM_SEPOLIA_NPM,
    abi: nonfungiblePositionManagerAbi,
    functionName: "getApproved",
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: { enabled: tokenId !== undefined && isConnected },
  });

  const pos = useMemo(() => {
    if (positionRaw == null) return null;
    return readNpmPositionTuple(positionRaw as never);
  }, [positionRaw]);

  const { data: metas } = useReadContracts({
    allowFailure: true,
    contracts: pos
      ? [
          { address: pos.token0, abi: erc20SymbolDecimalsAbi, functionName: "symbol" as const },
          { address: pos.token1, abi: erc20SymbolDecimalsAbi, functionName: "symbol" as const },
        ]
      : [],
    query: { enabled: Boolean(pos) },
  });

  const sym0 =
    metas?.[0] && metas[0].status === "success" && typeof metas[0].result === "string"
      ? metas[0].result
      : null;
  const sym1 =
    metas?.[1] && metas[1].status === "success" && typeof metas[1].result === "string"
      ? metas[1].result
      : null;

  const approved = Boolean(
    isApprovedForAll === true || (getApproved && isAddressEqual(getApproved, lpAutopilotAddress)),
  );

  const rangeTicks = useMemo(() => {
    const n = Math.floor(Number(rangeStr));
    if (!Number.isFinite(n) || n < 1) return null;
    if (n > 8_000_000) return null;
    return n;
  }, [rangeStr]);

  const { writeContract, data: hash, error: writeError, isPending, reset } = useWriteContract();
  const {
    isLoading: isConfirming,
    data: receipt,
    isError: isWaitError,
    error: waitError,
  } = useWaitForTransactionReceipt({ hash: hash as Hash | undefined });
  const displayTxError = writeError ?? (isWaitError && waitError ? waitError : null);
  const reverted = receipt?.status === "reverted";

  const refetchApproval = useCallback(async () => {
    await Promise.all([refetchA(), refetchB(), queryClient.invalidateQueries({ queryKey: ["npm-positions", address] })]);
  }, [refetchA, refetchB, queryClient, address]);

  useEffect(() => {
    if (!receipt || receipt.status !== "success" || !pending) return;
    (async () => {
      if (pending === "approve") {
        await refetchApproval();
        setPending(null);
        reset();
      } else if (pending === "deposit") {
        setPending(null);
        reset();
        if (tokenId !== undefined) {
          await queryClient.invalidateQueries();
          router.replace(`/dashboard/${tokenId.toString()}`);
        }
      }
    })();
  }, [receipt, pending, refetchApproval, queryClient, reset, router, tokenId]);

  const onApprove = () => {
    if (tokenId === undefined || !isAutopilotConfigured) return;
    setPending("approve");
    writeContract({
      address: ARBITRUM_SEPOLIA_NPM,
      abi: nonfungiblePositionManagerAbi,
      functionName: "approve",
      args: [lpAutopilotAddress, tokenId],
    });
  };

  const onDeposit = () => {
    if (tokenId === undefined || rangeTicks === null || !isAutopilotConfigured) return;
    setPending("deposit");
    writeContract({
      address: lpAutopilotAddress,
      abi: lpAutopilotAbi,
      functionName: "deposit",
      args: [tokenId, rangeTicks],
    });
  };

  const wrongNetwork = isConnected && chainId !== arbitrumSepolia.id;
  const ownerOk = owner && address && isAddressEqual(owner, address);
  const busy = isPending || isConfirming;

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <div className="border-b border-[#262626] bg-[#0a0a0a]">
        <div className="mx-auto w-full max-w-6xl px-3 py-2 md:px-4">
          <h1 className="font-mono text-sm text-[#a3a3a3]">
            Deposit
            {tokenId !== undefined ? (
              <span className="ml-1.5 text-[#ededed]">#{tokenId.toString()}</span>
            ) : null}
          </h1>
        </div>
      </div>
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-4 px-3 py-5 md:px-4 md:py-6">
        <WrongNetworkBanner />
        {!isAutopilotConfigured && (
          <p className="font-mono text-xs text-amber-200/90">
            Configure <span className="text-[#ededed]">NEXT_PUBLIC_LP_AUTOPILOT_ADDRESS</span> first.
          </p>
        )}
        {tokenId === undefined && (
          <p className="font-mono text-xs text-red-400/90">Invalid position id in URL.</p>
        )}
        {isConnected && tokenId !== undefined && owner != null && !ownerOk && (
          <p className="font-mono text-xs text-red-400/90">
            This position NFT is not in your connected wallet.
          </p>
        )}

        {isConnected && tokenId && pos && ownerOk && !wrongNetwork && (
          <div className="grid max-w-lg gap-4">
            <Card className="border-[#262626] bg-[#0d0d0d]">
              <CardHeader className="pb-2">
                <CardTitle className="font-mono text-sm font-normal text-[#ededed]">
                  #{tokenId.toString()}{" "}
                  {sym0 && sym1 ? (
                    <span className="text-[#a3a3a3]">
                      {sym0}/{sym1}
                    </span>
                  ) : null}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 font-mono text-xs text-[#a3a3a3]">
                <div className="flex justify-between">
                  <span className="text-[#666]">Fee</span>
                  <span className="text-right tabular-nums">{formatFeeTier(pos.fee)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#666]">Tick range</span>
                  <span className="text-right tabular-nums">
                    {pos.tickLower} → {pos.tickUpper}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#666]">Liquidity</span>
                  <span className="truncate text-right tabular-nums">{pos.liquidity.toString()}</span>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2 rounded-sm border border-[#262626] bg-[#0d0d0d] p-4">
              <Label htmlFor="rt" className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#888]">
                Range ticks
              </Label>
              <Input
                id="rt"
                value={rangeStr}
                onChange={(e) => setRangeStr(e.target.value)}
                className="h-9 max-w-[200px] border-[#262626] bg-[#080808] font-mono text-sm tabular-nums"
              />
              <p className="text-[11px] leading-relaxed text-[#666]">
                Autopilot tracks pool price. When the tick drifts more than this many ticks either side
                of the <span className="text-[#a3a3a3]">center tick at deposit</span>, a rebalance is
                possible. 600 ≈ ±6% move in price (approximation).
              </p>
              {rangeTicks === null && (
                <p className="font-mono text-xs text-red-400/90">
                  Enter a valid positive int24 (e.g. 600).
                </p>
              )}
            </div>

            <div className="space-y-3 rounded-sm border border-[#262626] bg-[#0d0d0d] p-4">
              <div className="space-y-1.5">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#888]">Step 1 · Approve</p>
                <Button
                  type="button"
                  className="h-9 w-full font-mono text-xs"
                  onClick={onApprove}
                  disabled={!isAutopilotConfigured || wrongNetwork || approved || busy || rangeTicks === null}
                >
                  {approved ? (
                    "✓ Autopilot can move this NFT"
                  ) : busy && pending === "approve" ? (
                    <TxPendingLabel label="Approving" />
                  ) : (
                    "Approve Autopilot on NFT"
                  )}
                </Button>
              </div>

              <div className="space-y-1.5 border-t border-[#1f1f1f] pt-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#888]">Step 2 · Deposit</p>
                <Button
                  type="button"
                  className="h-9 w-full font-mono text-xs"
                  onClick={onDeposit}
                  disabled={!isAutopilotConfigured || wrongNetwork || !approved || busy || rangeTicks === null}
                >
                  {busy && pending === "deposit" ? (
                    <TxPendingLabel label={isConfirming ? "Confirming" : "Depositing"} />
                  ) : (
                    "Deposit to Autopilot"
                  )}
                </Button>
              </div>

              {isConfirming && (
                <div
                  className="h-1 w-full animate-pulse rounded-sm bg-[#262626]"
                  title="Transaction confirming"
                />
              )}
              {displayTxError && (
                <p className="whitespace-pre-wrap break-words font-mono text-xs text-red-400/90">
                  {formatTxError(displayTxError)}
                </p>
              )}
              {reverted && !displayTxError && (
                <p className="font-mono text-xs text-red-400/90">Transaction reverted on chain.</p>
              )}
            </div>
          </div>
        )}

        {!isConnected && (
          <WalletCta
            title="Wallet not connected"
            body="Connect a wallet on Arbitrum Sepolia, then you can approve and deposit your position NFT into Autopilot."
          />
        )}
      </main>
    </div>
  );
}
