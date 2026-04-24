.PHONY: build test deploy-sepolia seed-demo-sepolia

build:
	cd contracts && forge build

# Requires ARBITRUM_MAINNET_RPC_URL (or public https://arb1.arbitrum.io/rpc) for forked tests
test:
	cd contracts && forge test -vvv

# Deploy LPAutopilot to Arbitrum Sepolia (requires PRIVATE_KEY and ARBITRUM_SEPOLIA_RPC_URL)
deploy-sepolia:
	cd contracts && forge script script/Deploy.s.sol:DeployScript --rpc-url "$${ARBITRUM_SEPOLIA_RPC_URL}" --broadcast -vvv

# Mint USDC/WETH v3 LP + deposit into LP Autopilot (requires PRIVATE_KEY and ARBITRUM_SEPOLIA_RPC_URL). Omit --broadcast for simulation only.
seed-demo-sepolia:
	cd contracts && forge script script/SeedDemoPosition.s.sol:SeedDemoScript \
		--rpc-url "$${ARBITRUM_SEPOLIA_RPC_URL}" --broadcast -vvv
