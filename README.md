# LP Autopilot

> Autopilot for Uniswap v3 positions. Set a range rule once, and anyone can trigger onchain rebalances when your position drifts out of range. You keep custody. Fully auditable.

![demo](./docs/demo.gif)

(If the image is missing, add a screen recording or GIF at `docs/demo.gif` for the README preview.)

**Live demo**: https://lp-autopilot.vercel.app

**Contract (Arbitrum Sepolia)**: deploy with Foundry, set `NEXT_PUBLIC_LP_AUTOPILOT_ADDRESS` in the frontend, then check the contract on Arbiscan at `https://sepolia.arbiscan.io/address/<your-address>`.

## The problem

Retail LPs on Uniswap v3 lose money not because concentrated liquidity is bad, but because they stop paying attention. Positions drift out of range, fees stop accruing, impermanent loss compounds. The tools to fix this either require you to trust a centralized bot with your funds, or don't exist for small LPs at all.

## What LP Autopilot does

1. Deposit your Uniswap v3 NFT position into the Autopilot contract
2. Set a range rule (e.g. "rebalance when price drifts ±6% from center")
3. Anyone — you, a keeper, or a bot — can call `checkAndRebalance()`. If the condition is met, the contract collects fees, withdraws liquidity, and re-centers the position. If not, the call reverts. You never give up custody.

## Why this must be onchain

Three properties are non-negotiable for LP strategy tools, and none are available in a web2 architecture:

- **Custody**: the user's NFT never leaves a contract they can withdraw from unilaterally
- **Trustless execution**: no operator can front-run, censor, or misreport. Rebalance logic is immutable bytecode
- **Auditable history**: every rebalance is an onchain event anyone can verify against the pool's price history

A centralized rebalancing service requires trusting the operator with both custody and honest execution. Autopilot removes both trust assumptions.

## Architecture

```mermaid
flowchart LR
  User[User / wallet]
  FE[Next.js frontend]
  AP[LPAutopilot]
  NPM[Uniswap v3 NonfungiblePositionManager]
  Pool[Uniswap v3 pools]
  User --> FE
  FE -->|read / write txs| AP
  AP -->|positions, collect, burn, transfer| NPM
  NPM --> Pool
```

## How to run locally

```bash
# Contracts
cd contracts
forge install
forge test --fork-url "$ARBITRUM_SEPOLIA_RPC_URL"

# Frontend
cd ../web
pnpm install
cp .env.example .env.local  # fill in NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID and NEXT_PUBLIC_LP_AUTOPILOT_ADDRESS
pnpm dev
```

Use `npm install` / `npm run dev` if you prefer npm (the repo ships with `package-lock.json`).

## Tech stack

- Solidity 0.8.24, Foundry, OpenZeppelin, Uniswap v3
- Next.js 14, TypeScript, Tailwind, shadcn/ui
- viem, wagmi v2, RainbowKit v2
- Deployed on Arbitrum Sepolia, frontend on Vercel

## What's next

- Chainlink Automation integration for true set-and-forget
- Multi-strategy support (TWAP-based, volatility-based)
- Mainnet deployment with audit
- Keeper reward system (small fee to whoever triggers a successful rebalance)

## Built for

MSX Hackathon 2026. Solo project. All code written during the build window (April 18–25, 2026).
