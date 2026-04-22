import { parseAbi } from "viem";

export const erc20SymbolDecimalsAbi = parseAbi([
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
]);
