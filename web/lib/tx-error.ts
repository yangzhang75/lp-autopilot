import { BaseError } from "viem";

/** Best-effort human-readable string from a wagmi/viem write or wait error. */
export function formatTxError(err: unknown): string {
  if (err == null) return "Unknown error";
  if (typeof err === "string") return err;

  if (err instanceof Error) {
    // viem BaseError often has shortMessage + details
    if (err instanceof BaseError) {
      const s = err.shortMessage?.trim() || err.message;
      const details = err.metaMessages;
      if (details?.length) {
        return [s, ...details].join("\n");
      }
      if (err.cause instanceof Error) {
        return [s, err.cause.message].filter(Boolean).join(" — ");
      }
      return s;
    }
    const cause = (err as Error & { cause?: unknown }).cause;
    if (cause instanceof Error) {
      return [err.message, formatTxError(cause)].filter(Boolean).join(" — ");
    }
    if (err.message) return err.message;
  }
  if (typeof err === "object" && err !== null && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return String(err);
}
