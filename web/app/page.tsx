"use client";

import Link from "next/link";
import { ArrowRight, RefreshCw, Shield, Wallet, Workflow } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { LiveOnchainActivity } from "@/components/live-onchain-activity";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { WrongNetworkBanner } from "@/components/wrong-network-banner";
import { OnchainStatsGrid } from "@/components/onchain-stats-grid";

function StepCard({
  n,
  icon,
  title,
  children,
}: {
  n: string;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="group flex flex-col rounded-sm border border-[#262626] bg-[#0d0d0d] p-5 transition-colors duration-150 hover:border-[#333]">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex h-7 w-7 items-center justify-center rounded-sm border border-[#262626] bg-[#141414] text-[#00ff88]">
          {icon}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#555]">
          step {n}
        </span>
      </div>
      <h3 className="font-mono text-sm text-[#ededed]">{title}</h3>
      <p className="mt-2 text-xs leading-relaxed text-[#888]">{children}</p>
    </div>
  );
}

function Steps() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <StepCard n="01" icon={<Wallet className="h-3.5 w-3.5" aria-hidden />} title="Deposit LP NFT">
        Send your Uniswap v3 position into the Autopilot contract. Custody stays in the contract you
        approved — withdraw any time.
      </StepCard>
      <StepCard n="02" icon={<Workflow className="h-3.5 w-3.5" aria-hidden />} title="Set range rule">
        Choose a tick range around the pool center. When price drifts beyond that band, a rebalance
        becomes callable.
      </StepCard>
      <StepCard
        n="03"
        icon={<RefreshCw className="h-3.5 w-3.5" aria-hidden />}
        title="Atomic rebalance"
      >
        Anyone calls{" "}
        <code className="rounded-sm bg-[#141414] px-1 py-px font-mono text-[10px] text-[#a3a3a3]">
          checkAndRebalance
        </code>
        . One transaction exits the old position, collects fees, and mints a new one centered at the
        current price.
      </StepCard>
    </div>
  );
}

function Why() {
  return (
    <ul className="divide-y divide-[#1f1f1f]">
      <li className="flex gap-3 py-3 first:pt-0">
        <Shield className="mt-0.5 h-4 w-4 shrink-0 text-[#555]" aria-hidden />
        <span className="text-sm text-[#a3a3a3]">
          <span className="text-[#ededed]">Trustless execution.</span> Rebalance rules live in
          bytecode, not a server.
        </span>
      </li>
      <li className="flex gap-3 py-3">
        <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-[#555]" aria-hidden />
        <span className="text-sm text-[#a3a3a3]">
          <span className="text-[#ededed]">You keep custody.</span> Position NFTs sit in a contract
          you can exit from — no API key, no fund custody.
        </span>
      </li>
      <li className="flex gap-3 py-3 last:pb-0">
        <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center font-mono text-xs text-[#555]">
          ↗
        </span>
        <span className="text-sm text-[#a3a3a3]">
          <span className="text-[#ededed]">Auditable on Arbiscan.</span> Deposits and rebalances
          are events — anyone can verify.
        </span>
      </li>
    </ul>
  );
}

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <WrongNetworkBanner className="mx-3 mt-2" />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-10 px-3 py-8 md:px-4 md:py-10">
        <section className="relative overflow-hidden rounded-sm px-1 py-2">
          <div
            className="pointer-events-none absolute inset-0 -z-10 rounded-sm opacity-[0.5]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)",
              backgroundSize: "28px 28px",
              maskImage:
                "radial-gradient(ellipse 80% 60% at 20% 20%, black 40%, transparent 100%)",
            }}
            aria-hidden
          />
          <div className="mb-4 inline-flex items-center gap-2 rounded-sm border border-[#262626] bg-[#0d0d0d] px-2.5 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00ff88] demo-pulse-dot" aria-hidden />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#888]">
              Live on Arbitrum Sepolia
            </span>
          </div>
          <h1 className="max-w-3xl font-sans text-3xl font-semibold leading-[1.1] tracking-tight text-[#ededed] md:text-5xl">
            Autopilot for your Uniswap&nbsp;v3 positions.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[#a3a3a3] md:text-base">
            Set a range rule once. Anyone can trigger rebalances when price drifts out of band.
            Fully onchain, trustless, and you keep custody.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/demo"
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-10 gap-1.5 bg-[#00ff88] px-5 font-mono text-sm text-[#0a0a0a] hover:bg-[#00dd77]",
              )}
            >
              View live demo
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/positions"
              className={cn(
                buttonVariants({ size: "lg", variant: "outline" }),
                "h-10 border-[#262626] bg-transparent px-5 font-mono text-sm text-[#ededed] hover:bg-[#141414] hover:text-[#ededed]",
              )}
            >
              My positions
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>

        <LiveOnchainActivity />

        <OnchainStatsGrid />

        <section>
          <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[#888]">
            How it works
          </h2>
          <Steps />
        </section>

        <section>
          <h2 className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[#888]">
            Why onchain
          </h2>
          <div className="max-w-2xl rounded-sm border border-[#262626] bg-[#0d0d0d] p-5">
            <Why />
          </div>
        </section>
      </main>
    </div>
  );
}
