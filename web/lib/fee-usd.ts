const ETH_OR_WETH = new Set([
  "ETH",
  "WETH",
  "WETH9",
  "WETH.ETH",
  "WETH-ETH", // arbitrum-style
]);
const USDC_LIKE = new Set(["USDC", "USDC.E", "USDC.ARBI", "USDT", "DAI"]);

const ETH_USD = 3_500;
const STABLE_USD = 1;

/**
 * Heuristic: ETH/WETH = $3500, stable-like = $1, else unknown.
 * Used only for Autopilot “fees in USD” estimates (hackathon demo).
 */
export function usdPerTokenUnitFromSymbol(rawSymbol: string): number | null {
  const s = rawSymbol.trim();
  if (ETH_OR_WETH.has(s.toUpperCase()) || s.toUpperCase().endsWith("ETH")) {
    return ETH_USD;
  }
  if (USDC_LIKE.has(s) || s.toLowerCase().includes("usdc") || s.toLowerCase() === "usdt") {
    return STABLE_USD;
  }
  if (s.toLowerCase().includes("dai")) return STABLE_USD;
  return null;
}

export function rawTokenToUsd(
  amountWei: bigint,
  decimals: number,
  usdPerToken: number,
): number {
  const f = 10 ** decimals;
  return (Number(amountWei) / f) * usdPerToken;
}

export function sumFeesUsdFromRebalance(
  fee0: bigint,
  fee1: bigint,
  dec0: number,
  dec1: number,
  sym0: string,
  sym1: string,
): { usd0: number; usd1: number; hasUnknown: boolean; total: number } {
  const p0 = usdPerTokenUnitFromSymbol(sym0);
  const p1 = usdPerTokenUnitFromSymbol(sym1);
  let usd0 = 0;
  let usd1 = 0;
  let hasUnknown = false;
  if (p0 == null) hasUnknown = true;
  else usd0 = rawTokenToUsd(fee0, dec0, p0);
  if (p1 == null) hasUnknown = true;
  else usd1 = rawTokenToUsd(fee1, dec1, p1);
  return { usd0, usd1, hasUnknown, total: usd0 + usd1 };
}
