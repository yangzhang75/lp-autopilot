"use client";

import { useQuery } from "@tanstack/react-query";
import { usePublicClient } from "wagmi";
import { getAutopilotGlobalStats } from "@/lib/events";
import { isAutopilotConfigured, lpAutopilotAddress } from "@/lib/contract";

const STALE = 30_000;

export function useAutopilotGlobalStats() {
  const publicClient = usePublicClient();
  return useQuery({
    queryKey: ["autopilot-global-stats", lpAutopilotAddress],
    queryFn: async () => {
      if (!publicClient) return { positionDeposits: 0, rebalances: 0, withdrawals: 0 };
      return getAutopilotGlobalStats(publicClient);
    },
    enabled: Boolean(publicClient && isAutopilotConfigured),
    staleTime: STALE,
    refetchInterval: STALE,
  });
}
