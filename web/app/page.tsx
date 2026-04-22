import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppHeader } from "@/components/app-header";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />

      <main className="flex flex-1 flex-col p-3">
        <div className="mx-auto w-full max-w-2xl space-y-4 text-left">
          <h1 className="font-mono text-2xl font-medium tracking-tight text-[#ededed]">
            LP Autopilot
          </h1>
          <p className="text-sm leading-relaxed text-[#888]">
            Deposit Uniswap v3 positions on Arbitrum Sepolia, track center vs live price, and
            trigger rebalances when the pool moves out of band.
          </p>

          <div className="flex flex-wrap gap-2">
            <Link
              className={cn(
                buttonVariants({ size: "default" }),
                "h-8 font-mono text-xs",
              )}
              href="/positions"
            >
              My positions
            </Link>
            <p className="self-center text-xs text-[#666]">Connect on the next page if needed.</p>
          </div>

          <Card className="rounded-sm border border-[#262626] bg-[#111] text-left">
            <CardHeader className="pb-2">
              <CardTitle className="font-mono text-sm font-normal text-[#a3a3a3]">Flow</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal space-y-1 pl-4 font-mono text-xs text-[#a3a3a3]">
                <li>Open My positions, pick a pool NFT, and deposit to Autopilot.</li>
                <li>Use the position dashboard to watch status and (when out of range) rebalance.</li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
