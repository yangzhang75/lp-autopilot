import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live demo",
  description:
    "Simulated LP Autopilot dashboard — explore the product without a Uniswap v3 position.",
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
