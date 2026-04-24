"use client";

/** Replaces raw "…" with a calm pulse + copy for in-flight transactions. */
export function TxPendingLabel({ label = "Sending transaction" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#00ff88]/80 tx-pending-dot"
        aria-hidden
      />
      <span>{label}</span>
    </span>
  );
}
