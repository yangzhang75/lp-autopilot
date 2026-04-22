export const defaultSiteUrl = "https://lp-autopilot.vercel.app";

export function getSiteUrl(): string {
  if (typeof process.env.NEXT_PUBLIC_SITE_URL === "string" && process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  return defaultSiteUrl;
}

export const GITHUB_URL = "https://github.com/yangzhang75/lp-autopilot";
