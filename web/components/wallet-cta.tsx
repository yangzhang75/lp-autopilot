"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  body?: string;
  className?: string;
};

export function WalletCta({ title, body, className }: Props) {
  return (
    <div
      className={cn(
        "max-w-md rounded-sm border border-[#333] bg-[#111] p-4 text-left",
        className,
      )}
    >
      <p className="font-mono text-sm text-[#ededed]">{title}</p>
      {body && <p className="mt-1 text-xs leading-relaxed text-[#888]">{body}</p>}
      <div className="mt-3 flex w-fit">
        <ConnectButton />
      </div>
    </div>
  );
}
