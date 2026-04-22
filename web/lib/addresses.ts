import type { Address } from "viem";

/** Arbitrum Sepolia (matches `contracts/script/Deploy.s.sol`) */
export const ARBITRUM_SEPOLIA_NPM: Address = "0x6b2937Bde17889EDCf8fbD8dE31C3C2a70Bc4d65";
export const ARBITRUM_SEPOLIA_V3_FACTORY: Address =
  "0x248AB79Bbb9bC29bB72f7Cd42F17e054Fc40188e";

/** Uniswap web app (set network in UI to Arbitrum Sepolia) */
export const UNISWAP_ARBITRUM_SEPOLIA_APP = "https://app.uniswap.org/";

export const ONCHAIN_POLL_MS = 15_000;
