"use client";

import Link from "next/link";
import { ArrowRight, RefreshCw, Shield, Wallet, Workflow } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { LiveOnchainActivity } from "@/components/live-onchain-activity";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { WrongNetworkBanner } from "@/components/wrong-network-banner";
import { OnchainStatsGrid } from "@/components/onchain-stats-grid";

function Steps() {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="rounded-sm border border-[#262626] bg-[#111] p-4">
        <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-sm border border-[#333] text-[#00ff88]">
          <Wallet className="h-4 w-4" aria-hidden />
        </div>
        <h3 className="font-mono text-sm text-[#ededed]">1. Deposit NFT</h3>
        <p className="mt-1 text-xs leading-relaxed text-[#888]">
          Send your Uniswap v3 position into the Autopilot contract. You can withdraw; custody stays
          in the contract you approved.
        </p>
      </div>
      <div className="rounded-sm border border-[#262626] bg-[#111] p-4">
        <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-sm border border-[#333] text-[#00ff88]">
          <Workflow className="h-4 w-4" aria-hidden />
        </div>
        <h3 className="font-mono text-sm text-[#ededed]">2. Set rule</h3>
        <p className="mt-1 text-xs leading-relaxed text-[#888]">
          Choose a tick range around the pool center. When price leaves that band, a rebalance can be
          triggered.
        </p>
      </div>
      <div className="rounded-sm border border-[#262626] bg-[#111] p-4">
        <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-sm border border-[#333] text-[#00ff88]">
          <RefreshCw className="h-4 w-4" aria-hidden />
        </div>
        <h3 className="font-mono text-sm text-[#ededed]">3. Atomic rebalance</h3>
        <p className="mt-1 text-xs leading-relaxed text-[#888]">
          When price drifts out of your range, anyone can call{" "}
          <code className="rounded-sm bg-[#1a1a1a] px-1 py-px font-mono text-[10px] text-[#a3a3a3]">
            checkAndRebalance
          </code>
          . In a single atomic transaction, the contract exits the old position, collects fees, and mints a new position
          centered at the current price. Fully on-chain, trustless, and auditable.
        </p>
      </div>
    </div>
  );
}

function Why() {
  return (
    <ul className="space-y-2 text-sm text-[#a3a3a3]">
      <li className="flex gap-2">
        <Shield className="mt-0.5 h-4 w-4 shrink-0 text-[#666]" aria-hidden />
        <span>
          <span className="text-[#ededed]">Trustless execution.</span> Rebalance rules live in
          bytecode, not a server.
        </span>
      </li>
      <li className="flex gap-2">
        <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-[#666]" aria-hidden />
        <span>
          <span className="text-[#ededed]">You keep custody.</span> Position NFTs sit in a contract
          you can exit from; no API key, no fund custody.
        </span>
      </li>
      <li className="flex gap-2">
        <span className="mt-0.5 font-mono text-xs text-[#666]">↗</span>
        <span>
          <span className="text-[#ededed]">Auditable on Arbiscan.</span> Deposits and rebalances
          are events; anyone can verify.
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
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-12 px-3 py-8">
        <section className="relative space-y-4 overflow-hidden rounded-sm px-1 py-1">
          <div
            className="pointer-events-none absolute inset-0 -z-10 rounded-sm opacity-[0.55]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)",
              backgroundSize: "32px 32px",
            }}
            aria-hidden
          />
          <h1 className="font-sans text-3xl font-semibold leading-tight tracking-tight text-[#ededed] md:text-4xl">
            Autopilot for your Uniswap v3 positions.
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-[#a3a3a3]">
            Set a range rule once. Anyone can trigger rebalances when conditions are met. You keep
            custody. All onchain on Arbitrum Sepolia for the demo.
          </p>
          <p className="max-w-2xl text-xs leading-relaxed text-[#888]">
            See it in action without deposits — or connect your wallet to use the real product.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/demo"
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-10 gap-1.5 px-5 font-mono text-sm text-[#0a0a0a] bg-[#00ff88] hover:bg-[#00dd77]",
              )}
            >
              View Live Demo
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/positions"
              className={cn(
                buttonVariants({ size: "lg", variant: "outline" }),
                "h-10 border-[#262626] bg-transparent px-5 font-mono text-sm text-[#ededed] hover:bg-[#141414]",
              )}
            >
              My Positions
              <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="w-full text-xs text-[#666] sm:w-auto">
              Use the connect control in the header to sign on real flows.
            </p>
          </div>
        </section>

        <LiveOnchainActivity />

        <OnchainStatsGrid />

        <section>
          <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-[#666]">How it works</h2>
          <Steps />
        </section>

        <section>
          <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-[#666]">Why onchain</h2>
          <div className="max-w-2xl rounded-sm border border-[#262626] bg-[#111] p-4">
            <Why />
          </div>
        </section>
      </main>
    </div>
  );
}
