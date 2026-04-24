"use client";

import Link from "next/link";
import { GITHUB_URL, getSiteUrl } from "@/lib/site";
import { isAutopilotConfigured, lpAutopilotAddress } from "@/lib/contract";

const ARBISCAN_ADDR = (a: `0x${string}`) =>
  `https://sepolia.arbiscan.io/address/${a}`;

const ARBISCAN_CODE = (a: `0x${string}`) =>
  `https://sepolia.arbiscan.io/address/${a}#code`;

function isVerifiedOnArbiscan(): boolean {
  return process.env.NEXT_PUBLIC_LP_AUTOPILOT_VERIFIED === "1";
}

export function SiteFooter() {
  const site = getSiteUrl();
  const verified = isVerifiedOnArbiscan();

  return (
    <footer className="mt-auto border-t border-[#262626] bg-[#0a0a0a] px-3 py-6 text-xs text-[#666] md:px-4">
      <div className="mx-auto flex max-w-6xl flex-col justify-between gap-5 sm:flex-row sm:items-start">
        <div className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#888]">LP Autopilot</p>
          <div className="flex items-center gap-3">
            <a
              className="font-mono text-[#a3a3a3] transition-colors hover:text-[#ededed]"
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
            >
              GitHub ↗
            </a>
            <span className="text-[#2a2a2a]">·</span>
            <a
              className="font-mono text-[#a3a3a3] transition-colors hover:text-[#ededed]"
              href={site}
            >
              {site.replace(/^https?:\/\//, "")}
            </a>
          </div>
          <p className="font-mono text-[10px] text-[#555]">Built for MSX Hackathon 2026</p>
        </div>
        <div className="space-y-1.5 sm:text-right">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#888]">Contract</p>
          {isAutopilotConfigured ? (
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <a
                className="break-all font-mono text-[11px] text-[#888] transition-colors hover:text-[#a3a3a3]"
                href={ARBISCAN_ADDR(lpAutopilotAddress)}
                target="_blank"
                rel="noreferrer"
              >
                {lpAutopilotAddress}
              </a>
              {verified ? (
                <Link
                  href={ARBISCAN_CODE(lpAutopilotAddress)}
                  className="inline-flex shrink-0 items-center rounded-sm border border-[#262626] bg-[#141414] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-[#00ff88] transition-colors hover:border-[#333]"
                  target="_blank"
                  rel="noreferrer"
                >
                  Verified
                </Link>
              ) : null}
            </div>
          ) : (
            <p className="text-amber-200/80">Set NEXT_PUBLIC_LP_AUTOPILOT_ADDRESS for a contract link.</p>
          )}
          <p className="font-mono text-[10px] text-[#555]">Arbitrum Sepolia · chainId 421614</p>
        </div>
      </div>
    </footer>
  );
}
