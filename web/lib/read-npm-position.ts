import type { Address } from "viem";

export type NpmPositionTuple = {
  token0: Address;
  token1: Address;
  fee: number;
  tickLower: number;
  tickUpper: number;
  liquidity: bigint;
};

export function readNpmPositionTuple(
  p:
    | {
        token0: Address;
        token1: Address;
        fee: number;
        tickLower: number;
        tickUpper: number;
        liquidity: bigint;
      }
    | readonly [unknown, unknown, Address, Address, number, number, number, bigint],
): NpmPositionTuple {
  if (p && typeof p === "object" && "token0" in p) {
    const o = p as {
      token0: Address;
      token1: Address;
      fee: number;
      tickLower: number;
      tickUpper: number;
      liquidity: bigint;
    };
    return {
      token0: o.token0,
      token1: o.token1,
      fee: Number(o.fee),
      tickLower: Number(o.tickLower),
      tickUpper: Number(o.tickUpper),
      liquidity: o.liquidity,
    };
  }
  const t = p as readonly unknown[];
  return {
    token0: t[2] as Address,
    token1: t[3] as Address,
    fee: Number(t[4]),
    tickLower: Number(t[5]),
    tickUpper: Number(t[6]),
    liquidity: t[7] as bigint,
  };
}
