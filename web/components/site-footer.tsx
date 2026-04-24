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
    <footer className="mt-auto border-t border-[#262626] bg-[#0a0a0a] px-3 py-6 text-xs text-[#666]">
      <div className="mx-auto flex max-w-4xl flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div className="space-y-1.5">
          <a className="text-[#a3a3a3] hover:text-[#ededed]" href={GITHUB_URL}>
            GitHub
          </a>
          {isAutopilotConfigured ? (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <p className="m-0">
                <span className="text-[#666]">Contract </span>
                <a
                  className="break-all font-mono text-[#888] hover:text-[#a3a3a3]"
                  href={ARBISCAN_ADDR(lpAutopilotAddress)}
                >
                  {lpAutopilotAddress}
                </a>
              </p>
              {verified ? (
                <Link
                  href={ARBISCAN_CODE(lpAutopilotAddress)}
                  className="inline-flex shrink-0 items-center rounded-sm border border-[#262626] bg-[#141414] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-[#00ff88] hover:border-[#333]"
                  target="_blank"
                  rel="noreferrer"
                >
                  Verified on Arbiscan
                </Link>
              ) : null}
            </div>
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
  );
}
