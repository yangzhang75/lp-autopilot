"use client";

import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { arbitrumSepolia } from "wagmi/chains";
import { getRecentGlobalActivity } from "@/lib/events";
import { isAutopilotConfigured, lpAutopilotAddress } from "@/lib/contract";
import { ONCHAIN_POLL_MS } from "@/lib/addresses";
import { TxHashLink } from "@/components/tx-hash-link";

const ARBISCAN_TX = (h: string) => `https://sepolia.arbiscan.io/tx/${h}`;
const ARBISCAN_ADDR = (a: `0x${string}`) =>
  `https://sepolia.arbiscan.io/address/${a}`;

function shortHash(h: string) {
  return `${h.slice(0, 10)}…${h.slice(-6)}`;
}

function shortContract(a: `0x${string}`) {
  return `${a.slice(0, 10)}…${a.slice(-4)}`;
}

export function LiveOnchainActivity() {
  const publicClient = usePublicClient({ chainId: arbitrumSepolia.id });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["global-activity", lpAutopilotAddress],
    queryFn: async () => {
      if (!publicClient) return [];
      return getRecentGlobalActivity(publicClient, 5);
    },
    enabled: Boolean(publicClient && isAutopilotConfigured),
    refetchInterval: ONCHAIN_POLL_MS,
  });

  if (!isAutopilotConfigured) {
    return null;
  }

  return (
    <section className="rounded-sm border border-[#262626] bg-[#141414] p-4">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-mono text-xs uppercase tracking-widest text-[#666]">
          Live onchain activity
        </h2>
        <a
          className="font-mono text-[10px] text-[#888] hover:text-[#00ff88]"
          href={ARBISCAN_ADDR(lpAutopilotAddress)}
          target="_blank"
          rel="noreferrer"
        >
          View contract on Arbiscan
        </a>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-8 animate-pulse rounded-sm bg-[#0d0d0d]" />
          ))}
        </div>
      )}

      {isError && (
        <p className="font-mono text-xs text-[#ff4444]">Could not load activity. Try again later.</p>
      )}

      {!isLoading && !isError && data && data.length === 0 && (
        <div className="rounded-sm border border-[#262626] bg-[#0d0d0d] px-3 py-4 text-center">
          <p className="font-mono text-sm text-[#a3a3a3]">
            Contract deployed at{" "}
            <span className="text-[#ededed]">{shortContract(lpAutopilotAddress)}</span>. Waiting for
            first position.
          </p>
          <a
            className="mt-2 inline-block font-mono text-xs text-[#00ff88] hover:underline"
            href={ARBISCAN_ADDR(lpAutopilotAddress)}
            target="_blank"
            rel="noreferrer"
          >
            View on Arbiscan
          </a>
        </div>
      )}

      {!isLoading && !isError && data && data.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left font-mono text-[11px]">
            <thead>
              <tr className="border-b border-[#262626] text-[#666]">
                <th className="py-1.5 pr-3 font-medium">Tx</th>
                <th className="py-1.5 pr-3 font-medium">Event</th>
                <th className="py-1.5 pr-3 font-medium text-right">Time</th>
                <th className="py-1.5 font-medium text-right">tokenId</th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={`${row.txHash}-${row.logIndex}`} className="border-b border-[#1a1a1a]">
                  <td className="py-1.5 pr-3 tabular-nums">
                    <TxHashLink hash={row.txHash} href={ARBISCAN_TX(row.txHash)}>
                      {shortHash(row.txHash)}
                    </TxHashLink>
                  </td>
                  <td className="py-1.5 pr-3 text-[#ededed]">{row.kind}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums text-[#a3a3a3]">
                    {row.blockTimestamp
                      ? new Date(row.blockTimestamp * 1000).toLocaleString()
                      : "—"}
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-[#888]">
                    {row.tokenId.toString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
