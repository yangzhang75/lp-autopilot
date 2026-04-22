"use client";

import Link from "next/link";
import { ArrowRight, RefreshCw, Shield, Wallet, Workflow } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { WrongNetworkBanner } from "@/components/wrong-network-banner";
import { useAutopilotGlobalStats } from "@/lib/hooks/useAutopilotGlobalStats";
import { isAutopilotConfigured, lpAutopilotAddress } from "@/lib/contract";
import { GITHUB_URL, getSiteUrl } from "@/lib/site";
import { arbitrumSepolia } from "wagmi/chains";

const ARBISCAN_ADDR = (a: `0x${string}`) =>
  `https://sepolia.arbiscan.io/address/${a}`;

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
        <h3 className="font-mono text-sm text-[#ededed]">3. Exit on trigger (v1)</h3>
        <p className="mt-1 text-xs leading-relaxed text-[#888]">
          When price leaves your band, anyone can run the exit path: fees collected, liquidity removed, tokens held in
          Autopilot. Withdraw anytime. Ongoing re-mint is planned.
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
  const { data: stats, isLoading: statsLoad } = useAutopilotGlobalStats();
  const site = getSiteUrl();
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <WrongNetworkBanner className="mx-3 mt-2" />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-12 px-3 py-8">
        <section className="space-y-4">
          <h1 className="font-sans text-3xl font-semibold leading-tight tracking-tight text-[#ededed] md:text-4xl">
            Autopilot for your Uniswap v3 positions.
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-[#a3a3a3]">
            Set a range rule once. Anyone can trigger rebalances when conditions are met. You keep
            custody. All onchain on Arbitrum{/* Sepolia in practice for the demo */}.
          </p>
          <p className="text-xs text-[#666]">Network: {arbitrumSepolia.name} (testnet for demo)</p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link
              href="/positions"
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-10 gap-1.5 px-5 font-mono text-sm text-[#0a0a0a] bg-[#00ff88] hover:bg-[#00dd77]",
              )}
            >
              Launch app
              <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="w-full text-xs text-[#666] sm:w-auto">Use the connect control in the header to sign.</p>
          </div>
        </section>

        {isAutopilotConfigured && (
          <section className="grid gap-3 rounded-sm border border-[#262626] bg-[#0d0d0d] p-4 sm:grid-cols-3">
            <div>
              <p className="text-[10px] font-mono uppercase text-[#666]">Onchain stats</p>
              <p className="mt-1 font-mono text-2xl text-[#ededed] tabular-nums">
                {statsLoad ? "—" : (stats?.positionDeposits ?? 0).toString()}
              </p>
              <p className="text-xs text-[#888]">PositionDeposited</p>
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase text-[#666]">Rebalances</p>
              <p className="mt-1 font-mono text-2xl text-[#ededed] tabular-nums">
                {statsLoad ? "—" : (stats?.rebalances ?? 0).toString()}
              </p>
              <p className="text-xs text-[#888]">RebalanceTriggered</p>
            </div>
            <div>
              <p className="text-[10px] font-mono uppercase text-[#666]">Withdrawals</p>
              <p className="mt-1 font-mono text-2xl text-[#ededed] tabular-nums">
                {statsLoad ? "—" : (stats?.withdrawals ?? 0).toString()}
              </p>
              <p className="text-xs text-[#888]">PositionWithdrawn</p>
            </div>
          </section>
        )}

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
      <footer className="mt-auto border-t border-[#262626] bg-[#0a0a0a] px-3 py-6 text-xs text-[#666]">
        <div className="mx-auto flex max-w-4xl flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div className="space-y-1.5">
            <a className="text-[#a3a3a3] hover:text-[#ededed]" href={GITHUB_URL}>
              GitHub
            </a>
            {isAutopilotConfigured ? (
              <p>
                <span className="text-[#666]">Contract </span>
                <a
                  className="break-all font-mono text-[#888] hover:text-[#a3a3a3]"
                  href={ARBISCAN_ADDR(lpAutopilotAddress)}
                >
                  {lpAutopilotAddress}
                </a>
              </p>
            ) : (
              <p className="text-amber-200/80">Set NEXT_PUBLIC_LP_AUTOPILOT_ADDRESS for a contract link.</p>
            )}
            <p>
              <span className="text-[#666]">Site </span>
              <a className="text-[#888] hover:text-[#a3a3a3]" href={site}>
                {site}
              </a>
            </p>
            <p className="text-[#555]">Built for MSX Hackathon 2026</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
