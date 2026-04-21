import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WalletConnect } from "@/components/wallet-connect";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex h-12 items-center justify-between border-b border-[#262626] px-4">
        <span className="font-mono text-xs uppercase tracking-widest text-[#888]">
          LP Autopilot
        </span>
        <WalletConnect />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center p-6">
        <div className="w-full max-w-2xl space-y-6 text-center">
          <h1 className="font-mono text-3xl font-medium tracking-tight text-[#ededed] md:text-4xl">
            LP Autopilot
          </h1>
          <p className="text-sm leading-relaxed text-[#888]">
            Set-and-forget strategies for onchain liquidity providers
          </p>

          <Card className="rounded-sm border border-[#262626] bg-[#141414] text-left">
            <CardHeader className="pb-2">
              <CardTitle className="font-mono text-sm font-normal text-[#ededed]">
                Next
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-mono text-xs text-[#888]">
                Coming soon: deposit flow
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
