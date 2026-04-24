"use client";

import { useQuery } from "@tanstack/react-query";
import { useAccount, useChainId, usePublicClient } from "wagmi";
import { arbitrumSepolia } from "wagmi/chains";
import type { Address, Hash } from "viem";
import { isAddressEqual, zeroAddress } from "viem";
import { lpAutopilotAbi, lpAutopilotAddress, isAutopilotConfigured } from "@/lib/contract";
import { lpAutopilotFromBlock, ONCHAIN_POLL_MS } from "@/lib/addresses";
import { erc20SymbolDecimalsAbi } from "@/lib/abis/erc20";
import { formatFeeTier } from "@/lib/uniswap-math";

export type ManagedPositionRow = {
  tokenId: bigint;
  token0: Address;
  token1: Address;
  symbol0: string;
  symbol1: string;
  feeLabel: string;
  rangeTicks: number;
  inRange: boolean;
  depositedTimestamp: number;
  transactionHash: Hash;
};

export type WithdrawnManagedRow = {
  tokenId: bigint;
  symbol0: string;
  symbol1: string;
  feeLabel: string;
  rangeTicks: number;
  depositedTimestamp: number;
};

function blockTimestampCache() {
  const m = new Map<bigint, number>();
  return {
    get: (n: bigint) => m.get(n),
    set: (n: bigint, t: number) => m.set(n, t),
  };
}

export function useManagedPositions() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const onArbSepolia = chainId === arbitrumSepolia.id;

  return useQuery({
    queryKey: ["managed-positions", address, chainId],
    queryFn: async () => {
      if (!publicClient || !address) {
        return { active: [] as ManagedPositionRow[], withdrawn: [] as WithdrawnManagedRow[] };
      }

      const logs = await publicClient.getContractEvents({
        address: lpAutopilotAddress,
        abi: lpAutopilotAbi,
        eventName: "PositionDeposited",
        args: { owner: address },
        fromBlock: lpAutopilotFromBlock,
        toBlock: "latest",
      });

      type DepositMeta = {
        token0: Address;
        token1: Address;
        fee: number;
        rangeTicks: number;
        blockNumber: bigint;
        logIndex: number;
        transactionHash: Hash;
      };

      const byToken = new Map<bigint, DepositMeta>();

      for (const l of logs) {
        if (!l.blockNumber || !l.args || l.transactionHash == null) continue;
        const a = l.args as {
          tokenId: bigint;
          token0: Address;
          token1: Address;
          fee: number | bigint;
          rangeTicks: number | bigint;
        };
        const prev = byToken.get(a.tokenId);
        const logIndex = Number(l.logIndex ?? 0);
        if (
          !prev ||
          l.blockNumber < prev.blockNumber ||
          (l.blockNumber === prev.blockNumber && logIndex < prev.logIndex)
        ) {
          byToken.set(a.tokenId, {
            token0: a.token0,
            token1: a.token1,
            fee: Number(a.fee),
            rangeTicks: Number(a.rangeTicks),
            blockNumber: l.blockNumber,
            logIndex,
            transactionHash: l.transactionHash,
          });
        }
      }

      const tokenIds = Array.from(byToken.keys());
      if (tokenIds.length === 0) {
        return { active: [] as ManagedPositionRow[], withdrawn: [] as WithdrawnManagedRow[] };
      }

      const cache = blockTimestampCache();
      const neededBlocks = new Set<bigint>();
      for (const id of tokenIds) {
        neededBlocks.add(byToken.get(id)!.blockNumber);
      }
      const blockNums = Array.from(neededBlocks);
      const blocks = await Promise.all(
        blockNums.map((b) => publicClient.getBlock({ blockNumber: b })),
      );
      for (let i = 0; i < blockNums.length; i++) {
        cache.set(blockNums[i]!, Number(blocks[i]!.timestamp));
      }

      const stateResults = await Promise.all(
        tokenIds.map((tokenId) =>
          publicClient.readContract({
            address: lpAutopilotAddress,
            abi: lpAutopilotAbi,
            functionName: "getPositionState",
            args: [tokenId],
          }),
        ),
      );

      const uniqueTokens = new Set<Address>();
      for (const id of tokenIds) {
        const m = byToken.get(id)!;
        uniqueTokens.add(m.token0);
        uniqueTokens.add(m.token1);
      }
      const sym = new Map<Address, string>();
      for (const a of Array.from(uniqueTokens)) {
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

      const active: ManagedPositionRow[] = [];
      const withdrawn: WithdrawnManagedRow[] = [];

      for (let i = 0; i < tokenIds.length; i++) {
        const tokenId = tokenIds[i]!;
        const meta = byToken.get(tokenId)!;
        const st = stateResults[i] as readonly [
          Address,
          Address,
          Address,
          number | bigint,
          number | bigint,
          number | bigint,
          number | bigint,
          boolean,
          bigint,
          bigint,
          bigint,
        ];
        const [owner, stToken0, stToken1, ,, , rangeTicks, inRange] = st;
        const depositedTs = cache.get(meta.blockNumber) ?? 0;
        const symbol0 = sym.get(meta.token0) ?? "?";
        const symbol1 = sym.get(meta.token1) ?? "?";
        const feeLabel = formatFeeTier(meta.fee);

        if (isAddressEqual(owner, zeroAddress)) {
          withdrawn.push({
            tokenId,
            symbol0,
            symbol1,
            feeLabel,
            rangeTicks: meta.rangeTicks,
            depositedTimestamp: depositedTs,
          });
          continue;
        }

        if (!isAddressEqual(owner, address)) continue;

        active.push({
          tokenId,
          token0: stToken0,
          token1: stToken1,
          symbol0,
          symbol1,
          feeLabel,
          rangeTicks: Number(rangeTicks),
          inRange,
          depositedTimestamp: depositedTs,
          transactionHash: meta.transactionHash,
        });
      }

      const sortByDeposit = (a: { depositedTimestamp: number; tokenId: bigint }, b: typeof a) => {
        if (b.depositedTimestamp !== a.depositedTimestamp) {
          return b.depositedTimestamp - a.depositedTimestamp;
        }
        return a.tokenId < b.tokenId ? 1 : -1;
      };
      active.sort(sortByDeposit);
      withdrawn.sort(sortByDeposit);

      return { active, withdrawn };
    },
    enabled: Boolean(
      publicClient && address && isConnected && onArbSepolia && isAutopilotConfigured,
    ),
    refetchInterval: ONCHAIN_POLL_MS,
  });
}
