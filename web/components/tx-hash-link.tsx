"use client";

import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  hash: string;
  href: string;
  children?: ReactNode;
  className?: string;
};

/** Arbiscan (or other explorer) tx link with mono, hover underline, external icon. */
export function TxHashLink({ hash, href, children, className }: Props) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "inline-flex max-w-full items-center gap-1 break-all font-mono text-[11px] text-[#888]",
        "underline decoration-transparent decoration-1 underline-offset-2 transition-colors",
        "hover:text-[#a3a3a3] hover:decoration-[#666]",
        className,
      )}
    >
      <span className="min-w-0">{children ?? hash}</span>
      <ExternalLink className="h-3 w-3 shrink-0 opacity-50" aria-hidden />
    </a>
  );
}
