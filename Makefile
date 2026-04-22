.PHONY: build test deploy-sepolia

build:
	cd contracts && forge build

# Requires ARBITRUM_MAINNET_RPC_URL (or public https://arb1.arbitrum.io/rpc) for forked tests
test:
	cd contracts && forge test -vvv

# Deploy LPAutopilot to Arbitrum Sepolia (requires PRIVATE_KEY and ARBITRUM_SEPOLIA_RPC_URL)
deploy-sepolia:
	cd contracts && forge script script/Deploy.s.sol:DeployScript --rpc-url "$${ARBITRUM_SEPOLIA_RPC_URL}" --broadcast -vvv
