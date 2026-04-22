"use client";

import { useReadContract } from "wagmi";
import { useMemo } from "react";
import { lpAutopilotAbi, lpAutopilotAddress } from "@/lib/contract";
import { priceDriftPercentFromTicks } from "@/lib/uniswap-math";
import { isAddressEqual, zeroAddress } from "viem";
import { ONCHAIN_POLL_MS } from "@/lib/addresses";

export type PositionState = {
  owner: `0x${string}`;
  token0: `0x${string}`;
  token1: `0x${string}`;
  fee: number;
  currentTick: number;
  centerTick: number;
  rangeTicks: number;
  inRange: boolean;
};

export function usePosition(tokenId: bigint | undefined) {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useReadContract({
    address: lpAutopilotAddress,
    abi: lpAutopilotAbi,
    functionName: "getPositionState",
    args: tokenId !== undefined && tokenId > BigInt(0) ? [tokenId] : undefined,
    query: {
      enabled: tokenId !== undefined && tokenId > BigInt(0),
      refetchInterval: ONCHAIN_POLL_MS,
      refetchOnWindowFocus: true,
    },
  });

  const value = useMemo(() => {
    if (!data) return { positionState: null as PositionState | null, notDeposited: true };
    const t = data as readonly [
      `0x${string}`,
      `0x${string}`,
      `0x${string}`,
      number | bigint,
      number | bigint,
      number | bigint,
      number | bigint,
      boolean,
    ];
    const [owner, token0, token1, fee, currentTick, centerTick, rangeTicks, inRange] = t;
    if (isAddressEqual(owner, zeroAddress)) {
      return { positionState: null as PositionState | null, notDeposited: true };
    }
    return {
      notDeposited: false,
      positionState: {
        owner,
        token0,
        token1,
        fee: Number(fee),
        currentTick: Number(currentTick),
        centerTick: Number(centerTick),
        rangeTicks: Number(rangeTicks),
        inRange,
      } satisfies PositionState,
    };
  }, [data]);

  const currentTick = value.positionState?.currentTick ?? 0;
  const inRange = value.positionState?.inRange ?? false;
  const drift = useMemo(() => {
    if (!value.positionState) return 0;
    return priceDriftPercentFromTicks(value.positionState.centerTick, value.positionState.currentTick);
  }, [value.positionState]);

  return {
    positionState: value.positionState,
    notDeposited: value.notDeposited,
    currentTick,
    inRange,
    drift,
    isLoading: tokenId !== undefined && isLoading,
    isFetching: isFetching && !isLoading,
    isError,
    error,
    refetch,
  };
}
