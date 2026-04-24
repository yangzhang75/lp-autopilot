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
    <header className="sticky top-0 z-20 flex h-12 shrink-0 items-center justify-between border-b border-[#262626] bg-[#0a0a0a]/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-[#0a0a0a]/80 md:px-4">
      <div className="flex items-center gap-5">
        <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <span
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm border border-[#262626] bg-[#0d0d0d] font-mono text-[10px] text-[#00ff88]"
            aria-hidden
          >
            LP
          </span>
          <span className="hidden font-mono text-xs uppercase tracking-[0.18em] text-[#ededed] sm:inline">
            Autopilot
          </span>
        </Link>
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
                  "rounded-sm px-2 py-1 font-mono text-xs transition-colors",
                  active
                    ? "bg-[#141414] text-[#ededed]"
                    : "text-[#666] hover:bg-[#141414]/60 hover:text-[#a3a3a3]",
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
