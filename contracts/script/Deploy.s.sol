// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {LPAutopilot} from "../src/LPAutopilot.sol";

/// @notice Arbitrum Sepolia deployment (Uniswap v3)
contract DeployScript is Script {
    function run() external {
        address npm = 0x6b2937Bde17889EDCf8fbD8dE31C3C2a70Bc4d65;
        address factory = 0x248AB79Bbb9bC29bB72f7Cd42F17e054Fc40188e;

        vm.startBroadcast(uint256(vm.envUint("PRIVATE_KEY")));

        LPAutopilot deployed = new LPAutopilot(npm, factory);

        vm.stopBroadcast();

        console2.log("LPAutopilot deployed at:", address(deployed));
    }
}
