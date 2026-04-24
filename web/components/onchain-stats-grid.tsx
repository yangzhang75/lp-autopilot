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
        "grid gap-3 rounded-sm border border-[#262626] bg-[#0d0d0d] p-4 sm:grid-cols-3",
        animate && "animate-[stats-fade-in_0.55s_ease-out_both]",
      )}
    >
      <div>
        <p className="text-[10px] font-mono uppercase text-[#666]">Onchain stats</p>
        <p className="mt-1 font-mono text-2xl text-[#ededed] tabular-nums tracking-tight">
          {statsLoad ? <StatPulse /> : d0.toString()}
        </p>
        <p className="text-xs text-[#888]">PositionDeposited</p>
      </div>
      <div>
        <p className="text-[10px] font-mono uppercase text-[#666]">Rebalances</p>
        <p className="mt-1 font-mono text-2xl text-[#ededed] tabular-nums tracking-tight">
          {statsLoad ? <StatPulse /> : d1.toString()}
        </p>
        <p className="text-xs text-[#888]">RebalanceTriggered</p>
      </div>
      <div>
        <p className="text-[10px] font-mono uppercase text-[#666]">Withdrawals</p>
        <p className="mt-1 font-mono text-2xl text-[#ededed] tabular-nums tracking-tight">
          {statsLoad ? <StatPulse /> : d2.toString()}
        </p>
        <p className="text-xs text-[#888]">PositionWithdrawn</p>
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
