import type { PositionEventRow } from "@/lib/events";
import { sumFeesUsdFromRebalance } from "@/lib/fee-usd";

export type CumulativeFeePoint = {
  at: number;
  tLabel: string;
  cumulativeUsd: number;
  /** increment from this rebalance only, if any */
  stepUsd: number;
};

/**
 * `events` from getPositionEvents (newest-first). Builds chronological
 * cumulative-fee points from deposit and each rebalanced row.
 */
export function buildCumulativeFeeSeries(
  events: PositionEventRow[],
  dec0: number,
  dec1: number,
  sym0: string,
  sym1: string,
): { points: CumulativeFeePoint[]; totalFeesUsd: number; depositAt: number | null; hasPriceUnknown: boolean } {
  const chrono = [...events].sort((a, b) => {
    if (a.blockNumber !== b.blockNumber) {
      return a.blockNumber < b.blockNumber ? -1 : 1;
    }
    return a.logIndex - b.logIndex;
  });
  const deposits = chrono.filter((e) => e.kind === "deposited");
  const rebalances = chrono.filter((e) => e.kind === "rebalanced");
  const firstDeposit = deposits[0] ?? null;
  const depositAt = firstDeposit ? firstDeposit.blockTimestamp : null;
  if (depositAt == null) {
    return { points: [], totalFeesUsd: 0, depositAt: null, hasPriceUnknown: true };
  }

  const points: CumulativeFeePoint[] = [
    {
      at: depositAt * 1000,
      tLabel: new Date(depositAt * 1000).toLocaleString(),
      cumulativeUsd: 0,
      stepUsd: 0,
    },
  ];
  let cum = 0;
  let hasPriceUnknown = false;
  for (const e of rebalances) {
    if (!e.details.fee0 || e.details.fee1 == null) continue;
    const f0 = BigInt(e.details.fee0);
    const f1 = BigInt(e.details.fee1);
    const m = sumFeesUsdFromRebalance(f0, f1, dec0, dec1, sym0, sym1);
    if (m.hasUnknown) hasPriceUnknown = true;
    cum += m.total;
    const ts = e.blockTimestamp;
    points.push({
      at: ts * 1000,
      tLabel: new Date(ts * 1000).toLocaleString(),
      cumulativeUsd: cum,
      stepUsd: m.total,
    });
  }
  if (points.length === 1) {
    const t = depositAt * 1000 + 3_600_000;
    points.push({
      at: t,
      tLabel: new Date(t).toLocaleString() + " (no rebalances — flat line at $0)",
      cumulativeUsd: 0,
      stepUsd: 0,
    });
  }
  return { points, totalFeesUsd: cum, depositAt, hasPriceUnknown };
}
