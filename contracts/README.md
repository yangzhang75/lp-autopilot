# LP Autopilot (contracts)

Solidity 0.8.24, Foundry. `LPAutopilot` custodies Uniswap v3 position NFTs and implements a v1 “exit when out of band” path (see main repo `README`).

**Deploy to Arbitrum Sepolia** (NPM and factory in `script/Deploy.s.sol`):

```bash
cd contracts
PRIVATE_KEY=0x... ARBITRUM_SEPOLIA_RPC_URL=... make deploy-sepolia
```

Verify the contract on [Arbiscan Sepolia](https://sepolia.arbiscan.io/) after deploy.

**Fork / integration tests** use Arbitrum **One** mainnet Uniswap addresses; set `ARBITRUM_MAINNET_RPC_URL` to an Arbitrum mainnet HTTP endpoint, then from repo root: `make test` or `cd contracts && forge test -vvv`.
