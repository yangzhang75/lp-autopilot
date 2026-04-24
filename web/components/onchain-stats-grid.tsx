"use client";

import { usePublicClient } from "wagmi";
import { useAutopilotGlobalStats } from "@/lib/hooks/useAutopilotGlobalStats";
import { isAutopilotConfigured } from "@/lib/contract";
import { useCountUp } from "@/lib/hooks/useCountUp";
import { cn } from "@/lib/utils";

export function OnchainStatsGrid() {
  const publicClient = usePublicClient();
  const { data: stats, isPending: statsLoad, isSuccess } = useAutopilotGlobalStats();
  const animate = isSuccess && !statsLoad;
  const d0 = useCountUp(stats?.positionDeposits ?? 0, animate);
  const d1 = useCountUp(stats?.rebalances ?? 0, animate);
  const d2 = useCountUp(stats?.withdrawals ?? 0, animate);

  if (!isAutopilotConfigured || !publicClient) {
    return null;
  }

  return (
    <section
      className={cn(
        "rounded-sm border border-[#262626] bg-[#0d0d0d] p-5",
        animate && "animate-[stats-fade-in_0.55s_ease-out_both]",
      )}
    >
      <h2 className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-[#888]">
        Onchain stats
      </h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="border-l-2 border-[#262626] pl-4">
          <p className="font-mono text-3xl tabular-nums tracking-tight text-[#ededed]">
            {statsLoad ? <StatPulse /> : d0.toString()}
          </p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wide text-[#666]">
            Deposits
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-[#555]">PositionDeposited</p>
        </div>
        <div className="border-l-2 border-[#262626] pl-4">
          <p className="font-mono text-3xl tabular-nums tracking-tight text-[#ededed]">
            {statsLoad ? <StatPulse /> : d1.toString()}
          </p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wide text-[#666]">
            Rebalances
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-[#555]">RebalanceTriggered</p>
        </div>
        <div className="border-l-2 border-[#262626] pl-4">
          <p className="font-mono text-3xl tabular-nums tracking-tight text-[#ededed]">
            {statsLoad ? <StatPulse /> : d2.toString()}
          </p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-wide text-[#666]">
            Withdrawals
          </p>
          <p className="mt-0.5 font-mono text-[10px] text-[#555]">PositionWithdrawn</p>
        </div>
      </div>
    </section>
  );
}

function StatPulse() {
  return (
    <span
      className="inline-block h-7 w-12 animate-[stat-shimmer_1.4s_ease-in-out_infinite] rounded-sm bg-[#262626]"
      aria-hidden
    />
  );
}
