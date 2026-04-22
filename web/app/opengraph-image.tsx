import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "LP Autopilot";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: "#0a0a0a",
          color: "#ededed",
          flexDirection: "column",
          justifyContent: "center",
          padding: 64,
          fontFamily: "ui-monospace, Consolas, monospace",
        }}
      >
        <div
          style={{
            fontSize: 56,
            color: "#00ff88",
            fontWeight: 600,
            letterSpacing: -1,
            marginBottom: 16,
          }}
        >
          LP Autopilot
        </div>
        <div style={{ fontSize: 26, color: "#a3a3a3", lineHeight: 1.3, maxWidth: 800 }}>
          Autopilot for your Uniswap v3 positions. Set a range rule once — rebalances
          onchain on Arbitrum.
        </div>
      </div>
    ),
    { ...size },
  );
}
