const RATE = 1.0001;

/** Raw token1/token0 (no decimal adjustment) from tick, Uniswap v3. */
export function tickToPriceRatio(tick: number): number {
  return RATE ** tick;
}

/**
 * token1 per 1 token0, decimal-adjusted (token0, token1 sorted by address in pool).
 */
export function tickToHumanPrice1Per0(
  tick: number,
  token0Decimals: number,
  token1Decimals: number,
): number {
  return tickToPriceRatio(tick) * 10 ** (token0Decimals - token1Decimals);
}

/** Percentage distance from `center` tick to `current` (price change center → current). */
export function priceDriftPercentFromTicks(center: number, current: number): number {
  if (center === current) return 0;
  const r = RATE ** (current - center);
  return (r - 1) * 100;
}

export function formatFeeTier(fee: number): string {
  if (fee === 100) return "0.01%";
  if (fee === 500) return "0.05%";
  if (fee === 3_000) return "0.3%";
  if (fee === 10_000) return "1%";
  return `${(fee / 1_000_000) * 100}%`;
}

export function formatTokenAmountString(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const a = Math.abs(n);
  if (a >= 1_000_000) return n.toExponential(2);
  if (a >= 1) return n.toLocaleString("en-US", { maximumFractionDigits: 4 });
  if (a >= 0.0001) return n.toLocaleString("en-US", { maximumSignificantDigits: 6 });
  return n.toExponential(2);
}

/**
 * Renders a compact label for 1.0001^tick in token1 per token0 with decimals.
 */
export function formatPrice1Per0Label(
  tick: number,
  sym0: string,
  sym1: string,
  dec0: number,
  dec1: number,
): string {
  const p = tickToHumanPrice1Per0(tick, dec0, dec1);
  return `1 ${sym0} = ${formatTokenAmountString(p)} ${sym1}`;
}
