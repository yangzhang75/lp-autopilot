import type { PublicClient, Hash } from "viem";
import { lpAutopilotAbi, lpAutopilotAddress } from "@/lib/contract";
import { ONCHAIN_POLL_MS, lpAutopilotFromBlock } from "@/lib/addresses";

export type PositionEventRow = {
  kind: "deposited" | "rebalanced" | "withdrawn";
  logIndex: number;
  blockNumber: bigint;
  blockTimestamp: number;
  transactionHash: Hash;
  details: { rangeTicks?: number; oldCenter?: number; newCenter?: number; fee0?: string; fee1?: string; owner?: string };
};

export { ONCHAIN_POLL_MS as positionEventsRefetchInterval };

function blockTimestampCache() {
  const m = new Map<bigint, number>();
  return {
    get: (n: bigint) => m.get(n),
    set: (n: bigint, t: number) => m.set(n, t),
  };
}

export async function getPositionEvents(
  publicClient: PublicClient,
  tokenId: bigint,
): Promise<PositionEventRow[]> {
  const fromBlock = lpAutopilotFromBlock;
  const [deposits, rebalances, withdrawals] = await Promise.all([
    publicClient.getContractEvents({
      address: lpAutopilotAddress,
      abi: lpAutopilotAbi,
      eventName: "PositionDeposited",
      args: { tokenId },
      fromBlock,
      toBlock: "latest",
    }),
    publicClient.getContractEvents({
      address: lpAutopilotAddress,
      abi: lpAutopilotAbi,
      eventName: "RebalanceTriggered",
      args: { positionKey: tokenId },
      fromBlock,
      toBlock: "latest",
    }),
    publicClient.getContractEvents({
      address: lpAutopilotAddress,
      abi: lpAutopilotAbi,
      eventName: "PositionWithdrawn",
      args: { tokenId },
      fromBlock,
      toBlock: "latest",
    }),
  ]);

  const cache = blockTimestampCache();
  const needed = new Set<bigint>();
  for (const l of deposits) {
    if (l.blockNumber) needed.add(l.blockNumber);
  }
  for (const l of rebalances) {
    if (l.blockNumber) needed.add(l.blockNumber);
  }
  for (const l of withdrawals) {
    if (l.blockNumber) needed.add(l.blockNumber);
  }

  const blockNums = Array.from(needed);
  const blocks = await Promise.all(
    blockNums.map((b) => publicClient.getBlock({ blockNumber: b })),
  );
  for (let i = 0; i < blocks.length; i++) {
    const bn = blockNums[i]!;
    cache.set(bn, Number(blocks[i].timestamp));
  }

  const out: PositionEventRow[] = [];

  for (const l of deposits) {
    if (!l.blockNumber || !l.args || l.transactionHash == null) continue;
    const a = l.args as { rangeTicks: number | bigint };
    out.push({
      kind: "deposited",
      logIndex: Number(l.logIndex ?? 0),
      blockNumber: l.blockNumber,
      blockTimestamp: cache.get(l.blockNumber) ?? 0,
      transactionHash: l.transactionHash,
      details: { rangeTicks: Number(a.rangeTicks) },
    });
  }
  for (const l of rebalances) {
    if (!l.blockNumber || !l.args || l.transactionHash == null) continue;
    const a = l.args as {
      oldCenterTick: number | bigint;
      newCenterTick: number | bigint;
      feesCollected0: bigint;
      feesCollected1: bigint;
    };
    out.push({
      kind: "rebalanced",
      logIndex: Number(l.logIndex ?? 0),
      blockNumber: l.blockNumber,
      blockTimestamp: cache.get(l.blockNumber) ?? 0,
      transactionHash: l.transactionHash,
      details: {
        oldCenter: Number(a.oldCenterTick),
        newCenter: Number(a.newCenterTick),
        fee0: a.feesCollected0.toString(),
        fee1: a.feesCollected1.toString(),
      },
    });
  }
  for (const l of withdrawals) {
    if (!l.blockNumber || !l.args || l.transactionHash == null) continue;
    const a = l.args as { owner: `0x${string}` };
    out.push({
      kind: "withdrawn",
      logIndex: Number(l.logIndex ?? 0),
      blockNumber: l.blockNumber,
      blockTimestamp: cache.get(l.blockNumber) ?? 0,
      transactionHash: l.transactionHash,
      details: { owner: a.owner },
    });
  }

  out.sort((a, b) => {
    if (a.blockNumber !== b.blockNumber) {
      return a.blockNumber < b.blockNumber ? 1 : -1;
    }
    return b.logIndex - a.logIndex;
  });
  return out;
}

export type AutopilotGlobalStats = {
  positionDeposits: number;
  rebalances: number;
  withdrawals: number;
};

export async function getAutopilotGlobalStats(publicClient: PublicClient): Promise<AutopilotGlobalStats> {
  const fromBlock = lpAutopilotFromBlock;
  const [deposits, rebalances, wds] = await Promise.all([
    publicClient.getContractEvents({
      address: lpAutopilotAddress,
      abi: lpAutopilotAbi,
      eventName: "PositionDeposited",
      fromBlock,
      toBlock: "latest",
    }),
    publicClient.getContractEvents({
      address: lpAutopilotAddress,
      abi: lpAutopilotAbi,
      eventName: "RebalanceTriggered",
      fromBlock,
      toBlock: "latest",
    }),
    publicClient.getContractEvents({
      address: lpAutopilotAddress,
      abi: lpAutopilotAbi,
      eventName: "PositionWithdrawn",
      fromBlock,
      toBlock: "latest",
    }),
  ]);
  return { positionDeposits: deposits.length, rebalances: rebalances.length, withdrawals: wds.length };
}
