import type { Abi } from "viem";
import lpAutopilotAbiJson from "./lp-autopilot-abi.json";

export const lpAutopilotAbi = lpAutopilotAbiJson as Abi;

export const lpAutopilotAddress = (process.env.NEXT_PUBLIC_LP_AUTOPILOT_ADDRESS ??
  "0x0000000000000000000000000000000000000000") as `0x${string}`;
