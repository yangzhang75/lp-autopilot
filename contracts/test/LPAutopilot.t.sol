// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {LPAutopilot} from "../src/LPAutopilot.sol";
import {IUniswapV3PoolState} from "@uniswap/v3-core/interfaces/pool/IUniswapV3PoolState.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract LPAutopilotTest is Test {
    LPAutopilot public autopilot;

    // Arbitrum One (mainnet) — fork tests
    address constant NPM = 0xC36442b4a4522E871399CD717aBDD847Ab11FE88;
    address constant FACTORY = 0x1F98431c8aD98523631AE4a59f267346ea31F984;

    address constant WHALE = 0x0b7b6138c4C02789Ef7e3E87beD1d888845324De;
    uint256 constant KNOWN_TOKEN_ID = 12345;

    address constant WETH = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1;
    address constant USDC = 0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8;
    uint24 constant FEE = 3000;

    function setUp() public {
        string memory rpc = vm.envOr("ARBITRUM_MAINNET_RPC_URL", string("https://arb1.arbitrum.io/rpc"));
        vm.createSelectFork(rpc);

        autopilot = new LPAutopilot(NPM, FACTORY);
    }

    function testFork_DepositRealNftStoresState() public {
        vm.startPrank(WHALE);
        IERC721(NPM).setApprovalForAll(address(autopilot), true);

        int24 rangeTicks = 50_000;
        autopilot.deposit(KNOWN_TOKEN_ID, rangeTicks);
        vm.stopPrank();

        (
            address owner,
            address token0,
            address token1,
            uint24 fee,
            int24 currentTick,
            int24 centerTick,
            int24 storedRange,
            bool inRange
        ) = autopilot.getPositionState(KNOWN_TOKEN_ID);

        assertEq(owner, WHALE);
        assertEq(token0, WETH);
        assertEq(token1, USDC);
        assertEq(fee, FEE);
        assertEq(storedRange, rangeTicks);
        assertEq(centerTick, currentTick);
        assertTrue(inRange);
    }

    function testCheckAndRebalance_RevertsWhenInRange() public {
        vm.startPrank(WHALE);
        IERC721(NPM).setApprovalForAll(address(autopilot), true);
        int24 rangeTicks = 100_000;
        autopilot.deposit(KNOWN_TOKEN_ID, rangeTicks);
        vm.stopPrank();

        (, , , , , int24 centerTick,,) = autopilot.getPositionState(KNOWN_TOKEN_ID);
        address pool = IUniswapV3FactoryLike(FACTORY).getPool(WETH, USDC, FEE);

        int24 tickInside = centerTick;
        _mockSlot0(pool, tickInside);

        vm.expectRevert(LPAutopilot.NotOutOfRange.selector);
        autopilot.checkAndRebalance(KNOWN_TOKEN_ID);
    }

    function testCheckAndRebalance_SucceedsWhenOutOfRange() public {
        vm.startPrank(WHALE);
        IERC721(NPM).setApprovalForAll(address(autopilot), true);
        int24 rangeTicks = 100;
        autopilot.deposit(KNOWN_TOKEN_ID, rangeTicks);
        vm.stopPrank();

        (, , , , , int24 centerTick,,) = autopilot.getPositionState(KNOWN_TOKEN_ID);
        address pool = IUniswapV3FactoryLike(FACTORY).getPool(WETH, USDC, FEE);

        int24 tickOutside = centerTick - int24(rangeTicks) - 1;
        _mockSlot0(pool, tickOutside);

        vm.expectEmit(true, true, false, false);
        emit LPAutopilot.RebalanceTriggered(
            KNOWN_TOKEN_ID,
            KNOWN_TOKEN_ID,
            centerTick,
            tickOutside,
            0,
            0
        );
        autopilot.checkAndRebalance(KNOWN_TOKEN_ID);
    }

    function testWithdraw_OnlyOwner() public {
        vm.startPrank(WHALE);
        IERC721(NPM).setApprovalForAll(address(autopilot), true);
        autopilot.deposit(KNOWN_TOKEN_ID, 500_000);
        vm.stopPrank();

        address rando = address(0xBEEF);
        vm.prank(rando);
        vm.expectRevert(LPAutopilot.NotOwner.selector);
        autopilot.withdraw(KNOWN_TOKEN_ID);

        vm.prank(WHALE);
        autopilot.withdraw(KNOWN_TOKEN_ID);
    }

    function _mockSlot0(address pool, int24 tick) internal {
        vm.mockCall(
            pool,
            abi.encodeWithSelector(IUniswapV3PoolState.slot0.selector),
            abi.encode(uint160(1), tick, uint16(0), uint16(0), uint16(0), uint8(0), true)
        );
    }
}

interface IUniswapV3FactoryLike {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
}
