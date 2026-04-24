# LP Autopilot

> **Atomic, permissionless rebalancing for Uniswap v3 liquidity positions.**
> Set a range rule once. When price drifts out, anyone can trigger `checkAndRebalance` —
> the contract exits the old position, collects fees, and mints a new position centered
> at the current price, all in a single atomic transaction. You keep custody.

**Live app**: [lp-autopilot.vercel.app](https://lp-autopilot.vercel.app) ·
**Interactive demo**: [/demo](https://lp-autopilot.vercel.app/demo) ·
**Real position on-chain**: [/dashboard/3042](https://lp-autopilot.vercel.app/dashboard/3042) ·
**Contract on Arbiscan**: [0x33C0D26F…DDa5f](https://sepolia.arbiscan.io/address/0x33C0D26F51229bfD5309A0CE74ef965c247DDa5f) ·
**Source**: [github.com/yangzhang75/lp-autopilot](https://github.com/yangzhang75/lp-autopilot)

---

## The problem

Concentrated-liquidity LPs on Uniswap v3 don't lose because they chose a bad range.
They lose because they stop paying attention. Price drifts out, fees stop accruing,
and impermanent loss compounds silently for days.

The existing options force a bad choice:

- **Centralized rebalancer** (hand custody to a bot)
- **Manual babysitting** (check positions multiple times a day)
- **Do nothing** (and watch yields die)

---

## What LP Autopilot does

1. **Deposit** your Uniswap v3 NFT into the Autopilot contract.
2. **Set a range rule** — e.g. "rebalance when price drifts beyond ±2000 ticks."
3. **Anyone triggers** `checkAndRebalance(tokenId)`. If the position is out of range,
   the contract atomically:
   - Decreases liquidity to zero on the old NFT
   - Collects all accumulated fees
   - Burns the old NFT
   - Mints a new position centered at the current tick (same range width)
   - Updates storage so the next rebalance can happen
4. **You withdraw whenever you want.** NFT + fees + any dust returned to your wallet.

Custody stays with the original depositor at every step. No keeper holds your position.

---

## Why this needs to be onchain

| Property | Onchain (LP Autopilot) | Centralized rebalancer |
|---|---|---|
| Custody | You retain withdraw rights | Operator holds your assets |
| Trust | Contract bytecode is immutable | Trust the operator's code + honesty |
| Audit | Every rebalance is a verifiable event | Operator's word (or unaudited logs) |
| Front-running | Revert if rule not satisfied | Operator could sandwich |

This is the same core idea as Gamma Strategies / Arrakis Finance, built as a
focused, auditable primitive for MSX Hackathon.

---

## How "autopilot" works in practice

Autopilot is **permissionless**, not magical:

- The contract enforces the rule — it *will* execute correctly when called.
- A trigger caller is still needed (you, a keeper bot, or anyone watching the mempool).
- This is how Gamma, Arrakis, and production DeFi automation all work.

**What's implemented (v1)**: full atomic exit + re-mint in one transaction.
**What's next**: keeper rewards, Chainlink Automation integration, multi-pool strategies.

---

## Architecture

```
┌─────────────────┐      ┌─────────────────────────┐
│    Next.js      │──────│   LPAutopilot.sol       │
│  Vercel front   │ RPC  │  on Arbitrum Sepolia    │
└─────────────────┘      └───────────┬─────────────┘
                                     │
                       ┌─────────────▼──────────────┐
                       │  Uniswap v3                │
                       │  NonfungiblePositionMgr    │
                       │  + WETH/USDC 0.05% pool    │
                       └────────────────────────────┘
```

**Network**: Arbitrum Sepolia (chain ID `421614`).

Key contracts referenced (Arbitrum Sepolia):

- **LP Autopilot**: `0x33C0D26F51229bfD5309A0CE74ef965c247DDa5f`
- **NPM**: `0x6b2937Bde17889EDCf8fbD8dE31C3C2a70Bc4d65`
- **Factory**: `0x248AB79Bbb9bC29bB72f7Cd42F17e054Fc40188e`
- **WETH/USDC 0.05% pool**: `0x6F112d524DC998381C09b4e53C7e5e2cc260f877`

---

## Proof of life

Deployed and exercised on-chain:

- **Deployed**: [tx `0x58760e6fe1978a8bfbe0ebf79d00a4c125d238202b74ad14b24ea1bc52a39ade`](https://sepolia.arbiscan.io/tx/0x58760e6fe1978a8bfbe0ebf79d00a4c125d238202b74ad14b24ea1bc52a39ade)
- **Minted a real Uniswap v3 position**: tokenId **3042**
- **Deposited into Autopilot**: [tx `0x1b5a36082e1890ed5fb26e28bf263943cd23d542d26a13f15a1d622eea50d150`](https://sepolia.arbiscan.io/tx/0x1b5a36082e1890ed5fb26e28bf263943cd23d542d26a13f15a1d622eea50d150)
- **Live dashboard reading onchain state**: [/dashboard/3042](https://lp-autopilot.vercel.app/dashboard/3042)

The frontend indexes contract events; anyone can verify on Arbiscan.

---

## Repo layout

```
├── contracts/               # Solidity (Foundry)
│   ├── src/LPAutopilot.sol
│   ├── test/                # 9 fork tests against Arbitrum mainnet
│   └── script/
│       ├── Deploy.s.sol             # deploys to Arbitrum Sepolia
│       └── SeedDemoPosition.s.sol   # mints + deposits a real position
├── web/                     # Next.js 14 App Router
│   ├── app/
│   │   ├── page.tsx                 # landing
│   │   ├── demo/                    # interactive client-side simulation
│   │   ├── positions/               # wallet NFTs + managed positions
│   │   ├── deposit/[tokenId]/       # deposit flow
│   │   └── dashboard/[tokenId]/     # live onchain dashboard
│   └── components/          # ui primitives + onchain components
└── README.md
```

---

## Run locally

```bash
# Contracts (requires Foundry)
cd contracts
forge test --fork-url https://arb1.arbitrum.io/rpc

# Frontend
cd web
npm install   # or pnpm install
cp .env.example .env.local
# Fill in NEXT_PUBLIC_LP_AUTOPILOT_ADDRESS, NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
npm run dev   # or pnpm dev
```

---

## Test coverage

9/9 tests pass on Arbitrum mainnet fork:

- `testFork_DepositRealNftStoresState`
- `testDeposit_RevertInvalidRange`
- `testDeposit_RevertDuplicate`
- `testCheckAndRebalance_RevertsWhenInRange`
- `testCheckAndRebalance_SucceedsWhenOutOfRange`
- `testCheckAndRebalance_MintsNewPositionAfterExit`
- `testOnERC721Received_RejectsNonNpm`
- `testWithdraw_OnlyOwner`
- `testWithdraw_ContractDepositorNoReceiver`

---

## What's next

- **Chainlink Automation** integration → truly hands-off triggers based on on-chain price feeds
- **Keeper rewards** → small fee paid to whoever triggers a successful rebalance, bootstrapping a decentralized keeper network
- **Strategy templates** → TWAP-based, volatility-based, fee-target-based rules
- **Swap-to-rebalance** for one-sided exits (current v1 holds dust; v2 would swap to re-enter with two-sided liquidity)
- **Mainnet deployment** after an audit

---

## Built for

**MSX Hackathon 2026** · Solo project · All code written during the build window
(April 18 – 25, 2026).

Contract: [0x33C0D26F51229bfD5309A0CE74ef965c247DDa5f](https://sepolia.arbiscan.io/address/0x33C0D26F51229bfD5309A0CE74ef965c247DDa5f)
Site: https://lp-autopilot.vercel.app
Live position: https://lp-autopilot.vercel.app/dashboard/3042

---
