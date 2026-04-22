"use client";

import { useQuery } from "@tanstack/react-query";
import { useAccount, usePublicClient } from "wagmi";
import type { Address } from "viem";
import { ARBITRUM_SEPOLIA_NPM, ONCHAIN_POLL_MS } from "@/lib/addresses";
import { nonfungiblePositionManagerAbi } from "@/lib/abis/positionManager";
import { erc20SymbolDecimalsAbi } from "@/lib/abis/erc20";
import { formatFeeTier } from "@/lib/uniswap-math";
import { readNpmPositionTuple } from "@/lib/read-npm-position";

export type NpmPositionCard = {
  tokenId: bigint;
  token0: Address;
  token1: Address;
  symbol0: string;
  symbol1: string;
  fee: number;
  feeLabel: string;
  tickLower: number;
  tickUpper: number;
  liquidity: bigint;
};

export function useUserNpmPositions() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();

  return useQuery({
    queryKey: ["npm-positions", address],
    queryFn: async () => {
      if (!publicClient || !address) return [] as NpmPositionCard[];
      const balance = await publicClient.readContract({
        address: ARBITRUM_SEPOLIA_NPM,
        abi: nonfungiblePositionManagerAbi,
        functionName: "balanceOf",
        args: [address],
      });
      const n = Number(balance);
      const tokenIds: bigint[] = [];
      for (let i = 0; i < n; i++) {
        const id = await publicClient.readContract({
          address: ARBITRUM_SEPOLIA_NPM,
          abi: nonfungiblePositionManagerAbi,
          functionName: "tokenOfOwnerByIndex",
          args: [address, BigInt(i)],
        });
        tokenIds.push(id);
      }
      const posRows = await Promise.all(
        tokenIds.map((tokenId) =>
          publicClient.readContract({
            address: ARBITRUM_SEPOLIA_NPM,
            abi: nonfungiblePositionManagerAbi,
            functionName: "positions",
            args: [tokenId],
          }),
        ),
      );
      const perId: NpmPositionCard[] = tokenIds.map((tokenId, i) => {
        const t = readNpmPositionTuple(posRows[i] as never);
        return {
          tokenId,
          ...t,
          symbol0: "?",
          symbol1: "?",
          feeLabel: formatFeeTier(t.fee),
        };
      });
      const unique = new Set<Address>();
      for (const p of perId) {
        unique.add(p.token0);
        unique.add(p.token1);
      }
      const sym = new Map<Address, string>();
      for (const a of Array.from(unique)) {
        try {
          const s = await publicClient.readContract({
            address: a,
            abi: erc20SymbolDecimalsAbi,
            functionName: "symbol",
          });
          sym.set(a, s);
        } catch {
          sym.set(a, `${a.slice(0, 6)}…`);
        }
      }
      return perId.map((p) => ({
        ...p,
        symbol0: sym.get(p.token0) ?? "?",
        symbol1: sym.get(p.token1) ?? "?",
      }));
    },
    enabled: Boolean(publicClient && address && isConnected),
    refetchInterval: ONCHAIN_POLL_MS,
  });
}
