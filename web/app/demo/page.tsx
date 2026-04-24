"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isAutopilotConfigured, lpAutopilotAddress } from "@/lib/contract";

const ARBISCAN_TX = (h: string) => `https://sepolia.arbiscan.io/tx/${h}`;
const ARBISCAN_CONTRACT = (a: `0x${string}`) =>
  `https://sepolia.arbiscan.io/address/${a}`;

interface DemoEvent {
  id: string;
  type: "Deposited" | "RebalanceTriggered" | "Withdrawn";
  when: string;
  detail: string;
  txHash: `0x${string}`;
}

interface DemoPosition {
  tokenId: number;
  currentPrice: number;
  centerPrice: number;
  rangePercent: number;
  feesEarned: number;
  status: "IN_RANGE" | "OUT_OF_RANGE" | "WITHDRAWN";
  events: DemoEvent[];
}

type FeePoint = { at: number; usd: number; label: string };

function mockTxHash(): `0x${string}` {
  const chars = "0123456789abcdef";
  let s = "0x";
  for (let i = 0; i < 64; i++) {
    s += chars[Math.floor(Math.random() * 16)]!;
  }
  return s as `0x${string}`;
}

function rangeBounds(center: number, rangePercent: number) {
  const low = center * (1 - rangePercent / 100);
  const high = center * (1 + rangePercent / 100);
  return { low, high };
}

function stripDomain(low: number, high: number, current: number) {
  const span = high - low;
  const pad = span * 0.35;
  const stripMin = Math.min(low - pad, current - span * 0.1);
  const stripMax = Math.max(high + pad, current + span * 0.1);
  return { stripMin, stripMax };
}

function pctOnStrip(price: number, stripMin: number, stripMax: number) {
  if (stripMax <= stripMin) return 50;
  return ((price - stripMin) / (stripMax - stripMin)) * 100;
}

function computePriceStatus(
  currentPrice: number,
  centerPrice: number,
  rangePercent: number,
): "IN_RANGE" | "OUT_OF_RANGE" {
  const { low, high } = rangeBounds(centerPrice, rangePercent);
  if (currentPrice < low || currentPrice > high) return "OUT_OF_RANGE";
  return "IN_RANGE";
}

function driftPct(currentPrice: number, centerPrice: number) {
  if (centerPrice === 0) return 0;
  return ((currentPrice - centerPrice) / centerPrice) * 100;
}

const INITIAL_CHART: FeePoint[] = (() => {
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

const INITIAL_EVENTS: DemoEvent[] = [
  {
    id: "init-1",
    type: "Deposited",
    when: "7 days ago",
    detail: "tokenId #1234",
    txHash:
      "0x9a2f4c8e1d0b7a3f5c9e2d6b8a4f1c0e7d3b9a5f2c8e4d1b7a3f9c5e2d8b6a4" as `0x${string}`,
  },
  {
    id: "init-2",
    type: "RebalanceTriggered",
    when: "3 days ago",
    detail: "old center $2,961 → new center $3,150",
    txHash:
      "0x7b3e9a1f5c8d2b6e4a0f9c3d7b1e5a8f2c6d0b4e8a3f7c1d5b9e2a6f0c4d8b2" as `0x${string}`,
  },
  {
    id: "init-3",
    type: "RebalanceTriggered",
    when: "6 hours ago",
    detail: "old center $3,150 → new center $3,247.18",
    txHash:
      "0x4d8a2f6c0e9b3d7a1f5c8e2b6d0a4f9c3e7b1d5a9f2c6e0b4d8a3f7c1e5b9d2a6" as `0x${string}`,
  },
];

function createInitialPosition(): DemoPosition {
  return {
    tokenId: 1234,
    currentPrice: 3247.18,
    centerPrice: 3150.0,
    rangePercent: 6,
    feesEarned: 47.23,
    status: "IN_RANGE",
    events: INITIAL_EVENTS.map((e) => ({ ...e })),
  };
}

export default function DemoPage() {
  const [pos, setPos] = useState<DemoPosition>(() => createInitialPosition());
  const [chartPoints, setChartPoints] = useState<FeePoint[]>(() =>
    INITIAL_CHART.map((p) => ({ ...p })),
  );
  const [highlightEventId, setHighlightEventId] = useState<string | null>(null);
  const [statusFlash, setStatusFlash] = useState(false);

  useEffect(() => {
    if (!highlightEventId) return;
    const t = window.setTimeout(() => setHighlightEventId(null), 2000);
    return () => window.clearTimeout(t);
  }, [highlightEventId]);

  const { low: rangeLow, high: rangeHigh } = useMemo(
    () => rangeBounds(pos.centerPrice, pos.rangePercent),
    [pos.centerPrice, pos.rangePercent],
  );

  const { stripMin, stripMax } = useMemo(
    () => stripDomain(rangeLow, rangeHigh, pos.currentPrice),
    [rangeLow, rangeHigh, pos.currentPrice],
  );

  const pLo = pctOnStrip(rangeLow, stripMin, stripMax);
  const pHi = pctOnStrip(rangeHigh, stripMin, stripMax);
  const pCur = pctOnStrip(pos.currentPrice, stripMin, stripMax);

  const drift = driftPct(pos.currentPrice, pos.centerPrice);

  const onSpike = () => {
    setPos((p) => {
      if (p.status === "WITHDRAWN") return p;
      const nextPrice = p.currentPrice * 1.08;
      const status = computePriceStatus(nextPrice, p.centerPrice, p.rangePercent);
      return { ...p, currentPrice: nextPrice, status };
    });
  };

  const onDrop = () => {
    setPos((p) => {
      if (p.status === "WITHDRAWN") return p;
      const nextPrice = p.currentPrice * 0.92;
      const status = computePriceStatus(nextPrice, p.centerPrice, p.rangePercent);
      return { ...p, currentPrice: nextPrice, status };
    });
  };

  const onNudge = () => {
    const f = 0.99 + Math.random() * 0.02;
    setPos((p) => {
      if (p.status === "WITHDRAWN") return p;
      const nextPrice = p.currentPrice * f;
      const status = computePriceStatus(nextPrice, p.centerPrice, p.rangePercent);
      return { ...p, currentPrice: nextPrice, status };
    });
  };

  const onReset = () => {
    setPos(createInitialPosition());
    setChartPoints(INITIAL_CHART.map((p) => ({ ...p })));
    setHighlightEventId(null);
    setStatusFlash(false);
  };

  const onRebalance = () => {
    if (pos.status !== "OUT_OF_RANGE") return;
    const oldCenter = pos.centerPrice;
    const newCenter = pos.currentPrice;
    const feeBump = 8.47;
    const newFees = pos.feesEarned + feeBump;
    const newTokenId = pos.tokenId + 1;
    const id = `ev-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const newEv: DemoEvent = {
      id,
      type: "RebalanceTriggered",
      when: "just now",
      detail: `old center $${oldCenter.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} → new center $${newCenter.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      txHash: mockTxHash(),
    };
    setPos((p) => ({
      ...p,
      tokenId: newTokenId,
      centerPrice: newCenter,
      feesEarned: newFees,
      status: "IN_RANGE",
      events: [newEv, ...p.events],
    }));
    setChartPoints((pts) => [...pts, { at: Date.now(), usd: newFees, label: "Rebalance" }]);
    setHighlightEventId(id);
    setStatusFlash(true);
  };

  useEffect(() => {
    if (!statusFlash) return;
    const t = window.setTimeout(() => setStatusFlash(false), 650);
    return () => window.clearTimeout(t);
  }, [statusFlash]);

  const onWithdraw = () => {
    if (pos.status === "WITHDRAWN") return;
    const notion = pos.feesEarned + 18420;
    const id = `ev-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const newEv: DemoEvent = {
      id,
      type: "Withdrawn",
      when: "just now",
      detail: `received ~$${notion.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} worth of tokens`,
      txHash: mockTxHash(),
    };
    setPos((p) => ({ ...p, status: "WITHDRAWN", events: [newEv, ...p.events] }));
    setHighlightEventId(id);
  };

  const simLocked = pos.status === "WITHDRAWN";
  const rebalanceEnabled = pos.status === "OUT_OF_RANGE";
  const withdrawEnabled = pos.status !== "WITHDRAWN";

  const statusLabel =
    pos.status === "WITHDRAWN"
      ? "WITHDRAWN"
      : pos.status === "OUT_OF_RANGE"
        ? "OUT OF RANGE"
        : "IN RANGE";

  const statusColor =
    pos.status === "WITHDRAWN"
      ? "text-[#888]"
      : pos.status === "OUT_OF_RANGE"
        ? "text-[#ff4444]"
        : "text-[#00ff88]";

  const driftColor =
    drift >= 0 ? (drift > 0 ? "text-[#00ff88]" : "text-[#a3a3a3]") : "text-[#ff4444]";

  const arbHref = isAutopilotConfigured
    ? ARBISCAN_CONTRACT(lpAutopilotAddress)
    : "https://sepolia.arbiscan.io/";

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a]">
      <AppHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-3 py-6 md:px-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="demo-pulse-dot h-1.5 w-1.5 rounded-full bg-[#00ff88]" aria-hidden />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#888]">
              Live simulation
            </span>
          </div>
          <p className="font-mono text-[11px] text-[#666]">
            Simulated data. Connect a wallet and deposit a real LP NFT for live onchain state.
          </p>
        </div>

        <section className="rounded-sm border border-[#262626] bg-[#0d0d0d] p-5 transition-colors">
          <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[#888]">
            Demo controls
          </h2>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={simLocked}
              title={simLocked ? "Reset demo to simulate price again" : "Increase mock price by 8%"}
              onClick={onSpike}
              className="h-9 border-[#262626] font-mono text-xs text-[#ededed] transition-colors hover:border-[#00ff88] hover:bg-[#141414] hover:text-[#00ff88] disabled:opacity-40"
            >
              Simulate Price Spike (+8%)
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={simLocked}
              title={simLocked ? "Reset demo to simulate price again" : "Decrease mock price by 8%"}
              onClick={onDrop}
              className="h-9 border-[#262626] font-mono text-xs text-[#ededed] transition-colors hover:border-[#00ff88] hover:bg-[#141414] hover:text-[#00ff88] disabled:opacity-40"
            >
              Simulate Price Drop (−8%)
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={simLocked}
              title={simLocked ? "Reset demo to simulate price again" : "Random ±1% nudge"}
              onClick={onNudge}
              className="h-9 border-[#262626] font-mono text-xs text-[#ededed] transition-colors hover:border-[#00ff88] hover:bg-[#141414] hover:text-[#00ff88] disabled:opacity-40"
            >
              Nudge Price (±1%)
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onReset}
              className="h-9 border-[#333] font-mono text-xs text-[#a3a3a3] transition-colors hover:border-[#ededed] hover:bg-[#1a1a1a] hover:text-[#ededed]"
            >
              Reset Demo
            </Button>
          </div>
        </section>

        <section
          className={cn(
            "space-y-4 rounded-sm border border-[#262626] bg-[#0d0d0d] p-5 transition-[border-color,background-color] duration-300",
            statusFlash && "demo-status-flash",
          )}
        >
          <div className="flex flex-col gap-2 border-b border-[#1f1f1f] pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#888]">Status</p>
              <h1 className="mt-1 font-mono text-2xl font-semibold tracking-tight text-[#ededed] md:text-4xl">
                Position #{pos.tokenId}{" "}
                <span className={statusColor}>— {statusLabel}</span>
              </h1>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Metric
              label="Current price"
              value={`$${pos.currentPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            />
            <Metric
              label="Center price"
              value={`$${pos.centerPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            />
            <Metric
              label="Drift"
              value={`${drift >= 0 ? "+" : ""}${drift.toFixed(2)}%`}
              accent={driftColor}
            />
            <Metric
              label="Fees earned"
              value={`$${pos.feesEarned.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            />
            <Metric
              label="Range"
              value={`$${rangeLow.toLocaleString("en-US", { maximumFractionDigits: 0 })} – $${rangeHigh.toLocaleString("en-US", { maximumFractionDigits: 0 })} (±${pos.rangePercent}%)`}
              className="sm:col-span-2 lg:col-span-2"
            />
          </div>
        </section>

        {pos.status === "WITHDRAWN" && (
          <div
            className="rounded-sm border border-[#262626] bg-[#0d0d0d] px-3 py-2 font-mono text-sm text-[#a3a3a3]"
            role="status"
          >
            Position withdrawn. Tokens returned to your wallet.
          </div>
        )}

        <section className="rounded-sm border border-[#262626] bg-[#0d0d0d] p-5">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#888]">
              Range visualization
            </h2>
            <span className="font-mono text-[10px] text-[#555]">
              price vs. autopilot band (USD, illustrative)
            </span>
          </div>
          <div className="w-full">
            <div className="relative h-12 w-full border border-[#262626] bg-[#080808]">
              <div
                className="absolute bottom-2 top-2 bg-[rgba(255,68,68,0.35)] transition-all duration-300"
                style={{ left: 0, width: `${Math.max(0, pLo)}%` }}
              />
              <div
                className="absolute bottom-2 top-2 bg-[rgba(255,68,68,0.35)] transition-all duration-300"
                style={{ left: `${Math.min(100, pHi)}%`, width: `${Math.max(0, 100 - pHi)}%` }}
              />
              <div
                className="absolute bottom-2 top-2 bg-[rgba(0,255,136,0.12)] transition-all duration-300"
                style={{ left: `${pLo}%`, width: `${Math.max(0, pHi - pLo)}%` }}
              />
              <div
                className="demo-range-marker pointer-events-none absolute bottom-1 top-1 w-0.5 -translate-x-1/2 bg-[#00ff88]"
                style={{ left: `${Math.min(100, Math.max(0, pCur))}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between font-mono text-[10px] tabular-nums text-[#666]">
              <span>{stripMin.toFixed(0)}</span>
              <span>{stripMax.toFixed(0)}</span>
            </div>
          </div>
        </section>

        <section className="rounded-sm border border-[#262626] bg-[#0d0d0d] p-5">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#888]">
              Fee accumulation
            </h2>
            <span className="font-mono text-[10px] text-[#555]">cumulative USD (simulated)</span>
          </div>
          <div className="h-56 w-full rounded-sm border border-[#262626] bg-[#080808] p-1">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <LineChart data={chartPoints} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
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
                    const row = payload[0].payload as FeePoint;
                    return (
                      <div className="rounded-sm border border-[#333] bg-[#111] px-2 py-1.5 font-mono text-xs text-[#ededed]">
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
            Chart adds a step when you trigger a rebalance in this demo.
          </p>
        </section>

        <section className="rounded-sm border border-[#262626] bg-[#0d0d0d] p-5">
          <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[#888]">
            Event timeline
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-[#262626] text-[10px] uppercase tracking-wide text-[#666]">
                  <th className="py-2 pr-3 font-medium">Event</th>
                  <th className="py-2 pr-3 font-medium">When</th>
                  <th className="py-2 pr-3 font-medium">Detail</th>
                  <th className="py-2 font-medium text-right">Transaction</th>
                </tr>
              </thead>
              <tbody>
                {pos.events.map((e) => (
                  <tr
                    key={e.id}
                    className={cn(
                      "border-b border-[#1a1a1a] transition-colors duration-150 hover:bg-[#141414]",
                      highlightEventId === e.id && "demo-new-event-row",
                    )}
                  >
                    <td className="py-1.5 pr-3 text-[#ededed]">{e.type}</td>
                    <td className="py-1.5 pr-3 tabular-nums text-[#a3a3a3]">{e.when}</td>
                    <td className="py-1.5 pr-3 text-[#888]">{e.detail}</td>
                    <td className="py-1.5 text-right">
                      <a
                        className="break-all text-[#888] transition-colors hover:text-[#00ff88]"
                        href={ARBISCAN_TX(e.txHash)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {e.txHash.slice(0, 14)}…{e.txHash.slice(-8)}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-sm border border-[#262626] bg-[#0d0d0d] p-5">
          <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[#888]">
            Actions
          </h2>
          <div className="flex max-w-md flex-col gap-2">
            <span
              title={
                pos.status === "WITHDRAWN"
                  ? "Demo ended — reset to try again"
                  : pos.status === "IN_RANGE"
                    ? "Price is within range — rebalance not needed"
                    : "Simulated rebalance: center follows price, fees bump, back in range"
              }
            >
              <Button
                type="button"
                disabled={!rebalanceEnabled || pos.status === "WITHDRAWN"}
                onClick={onRebalance}
                className={cn(
                  "h-9 w-full max-w-xs font-mono text-xs transition-colors",
                  rebalanceEnabled
                    ? "bg-[#00ff88] text-[#0a0a0a] hover:bg-[#00dd77]"
                    : "text-[#666] opacity-50",
                )}
              >
                Rebalance now
              </Button>
            </span>
            <span
              title={
                pos.status === "WITHDRAWN"
                  ? "Already withdrawn — reset demo to continue"
                  : "Simulated full exit to wallet"
              }
            >
              <Button
                type="button"
                variant="outline"
                disabled={!withdrawEnabled}
                onClick={onWithdraw}
                className="h-9 w-full max-w-xs border-[#262626] font-mono text-xs text-[#ededed] transition-colors hover:border-[#ededed] hover:bg-[#1a1a1a] disabled:opacity-40"
              >
                Withdraw position
              </Button>
            </span>
            <p className="mt-2 max-w-md font-mono text-[11px] leading-relaxed text-[#888]">
              Real mode requires a Uniswap v3 position NFT. See the{" "}
              <a
                className="text-[#00ff88] underline decoration-[#333] underline-offset-2 transition-colors hover:decoration-[#00ff88]"
                href={arbHref}
                target="_blank"
                rel="noreferrer"
              >
                contract on Arbiscan
              </a>{" "}
              for deployment details.
            </p>
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
    <div
      className={cn(
        "rounded-sm border border-[#262626] bg-[#080808] p-3 text-right transition-colors hover:border-[#333]",
        className,
      )}
    >
      <p className="font-mono text-[10px] uppercase tracking-wide text-[#666]">{label}</p>
      <p
        className={cn(
          "mt-1 font-mono text-lg tabular-nums tracking-tight text-[#ededed] md:text-xl",
          accent,
        )}
      >
        {value}
      </p>
    </div>
  );
}
