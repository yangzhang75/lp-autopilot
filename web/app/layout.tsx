import type { Metadata } from "next";
import localFont from "next/font/local";
import { Inter } from "next/font/google";
import dynamic from "next/dynamic";
import "./globals.css";
import "@rainbow-me/rainbowkit/styles.css";
import { cn } from "@/lib/utils";
import { getSiteUrl } from "@/lib/site";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const Web3Providers = dynamic(
  () => import("./providers").then((m) => m.Providers),
  { ssr: false },
);

const site = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: { default: "LP Autopilot", template: "%s | LP Autopilot" },
  description:
    "Autopilot for Uniswap v3 positions. Set a range rule once; anyone can trigger onchain rebalances when you drift out of band. You keep custody.",
  openGraph: {
    title: "LP Autopilot",
    description:
      "Autopilot for your Uniswap v3 positions. Set a range rule once, all on Arbitrum.",
    type: "website",
    url: site,
  },
  twitter: {
    card: "summary_large_image",
    title: "LP Autopilot",
    description: "Set a range rule once. Rebalances onchain. You keep custody.",
  },
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("dark", inter.variable)} suppressHydrationWarning>
      <body
        className={cn(
          geistMono.variable,
          "min-h-screen bg-[#0a0a0a] font-sans text-[#ededed] antialiased",
        )}
      >
        <Web3Providers>{children}</Web3Providers>
      </body>
    </html>
  );
}
