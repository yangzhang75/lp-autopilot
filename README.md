# LP Autopilot

Automated rebalancing rules for Uniswap v3 liquidity positions. **Day 1** includes Foundry contracts (simplified rebalance: exit to ERC20 + burn NFT), fork tests, deploy script, and a Next.js landing page with RainbowKit on **Arbitrum Sepolia**.

## Repo layout

- `contracts/` — Foundry (`forge build`, `forge test`)
- `web/` — Next.js 14 App Router (`npm run dev`)

## Contracts

**Dependencies:** OpenZeppelin **v4.9.6** is pinned so Uniswap v3-periphery import paths resolve; `IERC721Metadata` / `IERC721Enumerable` are duplicated under `lib/openzeppelin-contracts/contracts/token/ERC721/` (from `extensions/`) for the same reason.

**Verify**

```bash
cd contracts && forge build
forge test --fork-url "$ARBITRUM_MAINNET_RPC_URL"
```

Use a public Arbitrum One RPC if `ARBITRUM_MAINNET_RPC_URL` is unset (tests default to `https://arb1.arbitrum.io/rpc`).

**Deploy (Arbitrum Sepolia)**

```bash
export PRIVATE_KEY=... ARBITRUM_SEPOLIA_RPC_URL=...
make deploy-sepolia
```

## Web

Set `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` (WalletConnect Cloud) and `NEXT_PUBLIC_LP_AUTOPILOT_ADDRESS` after deployment.

```bash
cd web && npm run dev
```

## Environment

| Variable | Used by |
|----------|---------|
| `ARBITRUM_SEPOLIA_RPC_URL` | `foundry.toml` named endpoint, Makefile deploy |
| `ARBITRUM_MAINNET_RPC_URL` | Fork tests (optional) |
| `PRIVATE_KEY` | `Deploy.s.sol` broadcast |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | RainbowKit |
| `NEXT_PUBLIC_LP_AUTOPILOT_ADDRESS` | `web/lib/contract.ts` |
