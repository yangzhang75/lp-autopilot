.PHONY: deploy-sepolia

# Deploy LPAutopilot to Arbitrum Sepolia (requires PRIVATE_KEY and ARBITRUM_SEPOLIA_RPC_URL)
deploy-sepolia:
	cd contracts && forge script script/Deploy.s.sol:DeployScript --rpc-url "$${ARBITRUM_SEPOLIA_RPC_URL}" --broadcast -vvv
