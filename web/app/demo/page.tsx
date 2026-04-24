"use client";

import Link from "next/link";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppHeader } from "@/components/app-header";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DEMO_TOKEN_ID = "1234";
const CURRENT_PRICE = 3247.18;
const CENTER_PRICE = 3150.0;
const DRIFT_PCT = 3.08;
const FEES_USD = 47.23;
const RANGE_LOW = 2961;
const RANGE_HIGH = 3339;

/** Wider domain so red “out of band” zones are visible on the strip */
const STRIP_MIN = 2880;
const STRIP_MAX = 3420;

function pctOnStrip(price: number) {
  return ((price - STRIP_MIN) / (STRIP_MAX - STRIP_MIN)) * 100;
}

const FEE_CHART_MOCK = (() => {
  const day = 86_400_000;
  const base = Date.now() - 6 * day;
  return [
    { at: base, usd: 5.1, label: "Day 1" },
    { at: base + day, usd: 11.4, label: "Day 2" },
    { at: base + 2 * day, usd: 18.9, label: "Day 3" },
    { at: base + 3 * day, usd: 29.7, label: "Day 4" },
    { at: base + 4 * day, usd: 31.2, label: "Day 5" },
    { at: base + 5 * day, usd: 38.5, label: "Day 6" },
    { at: base + 6 * day, usd: 40.1, label: "Day 7" },
    { at: base + 6 * day + 6 * 3_600_000, usd: 47.23, label: "Now" },
  ];
})();

const DEMO_EVENTS = [
  {
    kind: "Deposited",
    ago: "7 days ago",
    detail: `tokenId #${DEMO_TOKEN_ID}`,
    tx: "0x9a2f4c8e1d0b7a3f5c9e2d6b8a4f1c0e7d3b9a5f2c8e4d1b7a3f9c5e2d8b6a4",
  },
  {
    kind: "RebalanceTriggered",
    ago: "3 days ago",
    detail: "old center tick 3050 → new center 3150",
    tx: "0x7b3e9a1f5c8d2b6e4a0f9c3d7b1e5a8f2c6d0b4e8a3f7c1d5b9e2a6f0c4d8b2",
  },
  {
    kind: "RebalanceTriggered",
    ago: "6 hours ago",
    detail: "old center tick 3150 → new center 3247",
    tx: "0x4d8a2f6c0e9b3d7a1f5c8e2b6d0a4f9c3e7b1d5a9f2c6e0b4d8a3f7c1e5b9d2a6",
  },
] as const;

const ARBISCAN = "https://sepolia.arbiscan.io/tx";

function DemoRangeStrip() {
  const pLo = pctOnStrip(RANGE_LOW);
  const pHi = pctOnStrip(RANGE_HIGH);
  const pCur = pctOnStrip(CURRENT_PRICE);
  return (
    <div className="w-full">
      <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-[#666]">
        Price vs. autopilot band (USD, illustrative)
      </p>
      <svg
        viewBox="0 0 400 56"
        className="h-14 w-full max-w-3xl border border-[#262626] bg-[#0d0d0d]"
        preserveAspectRatio="none"
        role="img"
        aria-label="Range: green band is in-range; red is outside bounds"
      >
        <rect x="0" y="8" width={(pLo / 100) * 400} height="40" fill="rgba(255,68,68,0.35)" />
        <rect
          x={(pHi / 100) * 400}
          y="8"
          width={400 - (pHi / 100) * 400}
          height="40"
          fill="rgba(255,68,68,0.35)"
        />
        <rect
          x={(pLo / 100) * 400}
          y="8"
          width={((pHi - pLo) / 100) * 400}
          height="40"
          fill="rgba(0,255,136,0.12)"
        />
        <line
          x1={(pCur / 100) * 400}
          y1="4"
          x2={(pCur / 100) * 400}
          y2="52"
          stroke="#00ff88"
          strokeWidth="2"
        />
      </svg>
      <div className="mt-1 flex justify-between font-mono text-[10px] tabular-nums text-[#666]">
        <span>{STRIP_MIN}</span>
        <span>{STRIP_MAX}</span>
      </div>
    </div>
  );
}

export default function DemoPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a]">
      <AppHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-10 px-3 py-6">
        <div
          className="rounded-sm border border-[#262626] bg-[#141414] px-3 py-2 font-mono text-xs text-[#a3a3a3]"
          role="status"
        >
          DEMO MODE — showing simulated position data. Connect your wallet and deposit a real Uniswap v3
          NFT to see your own dashboard.
        </div>

        <section className="space-y-4 rounded-sm border border-[#262626] bg-[#141414] p-4">
          <div className="flex flex-col gap-2 border-b border-[#262626] pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-[#666]">Status</p>
              <h1 className="font-mono text-2xl font-semibold tracking-tight text-[#ededed] md:text-4xl">
                Position #{DEMO_TOKEN_ID}{" "}
                <span className="text-[#00ff88]">— IN RANGE</span>
              </h1>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Metric label="Current price" value={`$${CURRENT_PRICE.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
            <Metric label="Center price" value={`$${CENTER_PRICE.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
            <Metric label="Drift" value={`+${DRIFT_PCT.toFixed(2)}%`} accent="text-[#00ff88]" />
            <Metric label="Fees earned" value={`$${FEES_USD.toFixed(2)}`} />
            <Metric
              label="Range"
              value={`$${RANGE_LOW.toLocaleString()} – $${RANGE_HIGH.toLocaleString()}`}
              className="sm:col-span-2 lg:col-span-2"
            />
          </div>
        </section>

        <section className="rounded-sm border border-[#262626] bg-[#141414] p-4">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-[#666]">
            Range visualization
          </h2>
          <DemoRangeStrip />
        </section>

        <section className="rounded-sm border border-[#262626] bg-[#141414] p-4">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-[#666]">
            Fee accumulation (simulated)
          </h2>
          <div className="h-64 w-full rounded-sm border border-[#262626] bg-[#0d0d0d] p-1">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <LineChart data={FEE_CHART_MOCK} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                <CartesianGrid stroke="#262626" strokeDasharray="4 4" />
                <XAxis
                  dataKey="at"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  tick={{ fill: "#888", fontSize: 10, fontFamily: "var(--font-geist-mono, monospace)" }}
                  tickFormatter={(v) =>
                    new Date(v as number).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                  }
                />
                <YAxis
                  dataKey="usd"
                  tick={{ fill: "#888", fontSize: 10, fontFamily: "var(--font-geist-mono, monospace)" }}
                  width={52}
                  tickFormatter={(v) => `$${Number(v).toFixed(0)}`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0].payload as (typeof FEE_CHART_MOCK)[number];
                    return (
                      <div
                        className="rounded-sm border border-[#333] bg-[#111] px-2 py-1.5 font-mono text-xs text-[#ededed]"
                      >
                        <div className="text-[#888]">{row.label}</div>
                        <div>${Number(row.usd).toFixed(2)} cumulative</div>
                      </div>
                    );
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="usd"
                  stroke="#00ff88"
                  strokeWidth={2}
                  dot={{ r: 2, fill: "#00ff88" }}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 font-mono text-[10px] text-[#555]">
            Mock series: step-ups at rebalance events (3 days ago and 6 hours ago).
          </p>
        </section>

        <section className="rounded-sm border border-[#262626] bg-[#141414] p-4">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-[#666]">
            Event timeline
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-[#262626] text-[#666]">
                  <th className="py-2 pr-3 font-medium">Event</th>
                  <th className="py-2 pr-3 font-medium">When</th>
                  <th className="py-2 pr-3 font-medium">Detail</th>
                  <th className="py-2 font-medium text-right">Transaction</th>
                </tr>
              </thead>
              <tbody>
                {DEMO_EVENTS.map((e) => (
                  <tr key={e.tx} className="border-b border-[#1a1a1a]">
                    <td className="py-2 pr-3 text-[#ededed]">{e.kind}</td>
                    <td className="py-2 pr-3 tabular-nums text-[#a3a3a3]">{e.ago}</td>
                    <td className="py-2 pr-3 text-[#888]">{e.detail}</td>
                    <td className="py-2 text-right">
                      <a
                        className="break-all text-[#888] hover:text-[#00ff88]"
                        href={`${ARBISCAN}/${e.tx}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {e.tx.slice(0, 14)}…{e.tx.slice(-8)}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-sm border border-[#262626] bg-[#141414] p-4">
          <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-[#666]">Actions</h2>
          <div className="flex max-w-md flex-col gap-2">
            <span title="Demo mode — this is a simulation">
              <Button
                type="button"
                disabled
                className="h-9 w-full max-w-xs font-mono text-xs text-[#666] opacity-60"
              >
                Trigger Rebalance
              </Button>
            </span>
            <span title="Demo mode — this is a simulation">
              <Button
                type="button"
                variant="outline"
                disabled
                className="h-9 w-full max-w-xs font-mono text-xs opacity-60"
              >
                Withdraw
              </Button>
            </span>
            <Link
              href="/positions"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "mt-1 w-fit px-0 font-mono text-xs text-[#00ff88] hover:text-[#00dd77]",
              )}
            >
              Switch to real mode →
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

function Metric({
  label,
  value,
  accent,
  className,
}: {
  label: string;
  value: string;
  accent?: string;
  className?: string;
}) {
  return (
    <div className={cn("border border-[#262626] bg-[#0d0d0d] p-3 text-right", className)}>
      <p className="text-[10px] font-mono uppercase tracking-wide text-[#666]">{label}</p>
      <p
        className={cn(
          "mt-1 font-mono text-lg tabular-nums text-[#ededed] md:text-xl",
          accent,
        )}
      >
        {value}
      </p>
    </div>
  );
}
