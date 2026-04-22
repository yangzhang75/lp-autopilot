"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CumulativeFeePoint } from "@/lib/fee-series";
import { HelpCircle } from "lucide-react";

const chartStroke = "#00ff88";
const grid = "#2a2a2a";
const text = "#a3a3a3";
const FEE_TIP =
  "USD is estimated: ETH/WETH = $3,500, stables = $1. No oracle — demo pricing only, not a live quote for IL or PnL.";

type Props = {
  points: CumulativeFeePoint[];
  loading: boolean;
};

function TipIcon() {
  return (
    <span className="inline-flex items-center text-[#666]" title={FEE_TIP}>
      <HelpCircle className="h-3.5 w-3.5" aria-label={FEE_TIP} />
    </span>
  );
}

function ChartInner({ points }: { points: CumulativeFeePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <LineChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={grid} strokeDasharray="3 3" />
        <XAxis
          dataKey="at"
          type="number"
          domain={["dataMin", "dataMax"]}
          tick={{ fill: text, fontSize: 10, fontFamily: "var(--font-geist-mono, monospace)" }}
          tickFormatter={(v) =>
            new Date(v as number).toLocaleDateString(undefined, { month: "short", day: "numeric" })
          }
        />
        <YAxis
          dataKey="cumulativeUsd"
          tick={{ fill: text, fontSize: 10, fontFamily: "var(--font-geist-mono, monospace)" }}
          width={60}
          tickFormatter={(v) => `$${Number(v).toFixed(0)}`}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as CumulativeFeePoint;
            const v = payload[0].value as number;
            return (
              <div
                className="rounded border border-[#333] bg-[#111] px-2 py-1.5 text-xs"
                style={{ fontFamily: "var(--font-geist-mono, monospace)" }}
              >
                <div className="text-[#a3a3a3]">{p.tLabel}</div>
                <div className="text-[#ededed]">cumulative: ${v.toFixed(2)}</div>
                {p.stepUsd > 0 && (
                  <div className="text-[#666]">+${p.stepUsd.toFixed(2)} this rebalance</div>
                )}
                <div className="mt-0.5 text-[9px] leading-tight text-[#555]">{FEE_TIP}</div>
              </div>
            );
          }}
        />
        <Line
          type="monotone"
          dataKey="cumulativeUsd"
          name="Cumulative fees (USD)"
          stroke={chartStroke}
          strokeWidth={2}
          dot={{ r: 2, fill: chartStroke }}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function DashboardFeeChart({ points, loading }: Props) {
  if (loading) {
    return (
      <div className="h-56 w-full max-w-4xl rounded-sm border border-[#262626] bg-[#0d0d0d] animate-pulse" />
    );
  }
  return (
    <div className="w-full max-w-4xl">
      <div className="mb-1.5 flex items-center gap-1.5">
        <h3 className="font-mono text-xs uppercase tracking-wide text-[#a3a3a3]">
          Cumulative fees (USD) from rebalances
        </h3>
        <TipIcon />
        <span className="ml-auto font-mono text-[10px] text-[#555]">X: time since deposit · IL not shown</span>
      </div>
      {points.length === 0 ? (
        <p className="font-mono text-xs text-[#666]">No fee history yet.</p>
      ) : (
        <div className="h-56 w-full rounded-sm border border-[#262626] bg-[#0d0d0d] p-1">
          <ChartInner points={points} />
        </div>
      )}
    </div>
  );
}
