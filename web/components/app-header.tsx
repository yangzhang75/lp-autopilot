"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletConnect } from "@/components/wallet-connect";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Home" },
  { href: "/demo", label: "Demo" },
  { href: "/positions", label: "My positions" },
] as const;

export function AppHeader() {
  const pathname = usePathname();
  return (
    <header className="flex h-11 shrink-0 items-center justify-between border-b border-[#262626] px-3">
      <div className="flex items-center gap-4">
        <span className="font-mono text-xs uppercase tracking-widest text-[#888]">LP Autopilot</span>
        <nav className="flex items-center gap-0.5">
          {links.map((l) => {
            const active =
              l.href === "/"
                ? pathname === "/"
                : l.href === "/demo"
                  ? pathname === "/demo"
                  : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "rounded-sm px-2 py-1 font-mono text-xs",
                  active ? "bg-[#1a1a1a] text-[#ededed]" : "text-[#666] hover:text-[#a3a3a3]",
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden items-center gap-1.5 sm:flex" title="Target network">
          <span
            className="demo-pulse-dot h-1.5 w-1.5 shrink-0 rounded-full bg-[#00ff88]"
            aria-hidden
          />
          <span className="font-mono text-[10px] uppercase tracking-wide text-[#666]">
            Arbitrum Sepolia
          </span>
        </div>
      </div>
      <WalletConnect />
    </header>
  );
}
