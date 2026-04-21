import type { Metadata } from "next";
import localFont from "next/font/local";
import { Inter } from "next/font/google";
import dynamic from "next/dynamic";
import "./globals.css";
import "@rainbow-me/rainbowkit/styles.css";
import { cn } from "@/lib/utils";

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

export const metadata: Metadata = {
  title: "LP Autopilot",
  description:
    "Set-and-forget strategies for onchain liquidity providers on Arbitrum Sepolia.",
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
