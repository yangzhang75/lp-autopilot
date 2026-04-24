// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {INonfungiblePositionManager} from "@uniswap/v3-periphery/interfaces/INonfungiblePositionManager.sol";
import {IUniswapV3Factory} from "@uniswap/v3-core/interfaces/IUniswapV3Factory.sol";
import {IUniswapV3Pool} from "@uniswap/v3-core/interfaces/IUniswapV3Pool.sol";

/// @notice Minimal WETH9 (wrap only what we need for Uniswap mint)
interface IWETH9 is IERC20 {
    function deposit() external payable;
}

interface ILPAutopilot {
    function deposit(uint256 tokenId, int24 rangeTicks) external;
    function getPositionState(uint256 tokenId)
        external
        view
        returns (
            address owner,
            address token0,
            address token1,
            uint24 fee,
            int24 currentTick,
            int24 centerTick,
            int24 rangeTicks,
            bool inRange,
            uint256 activeNftId,
            uint256 pending0,
            uint256 pending1
        );
}

/// @notice Mint a Uniswap v3 USDC/WETH position on Arbitrum Sepolia and deposit into LP Autopilot v2.
/// @dev If `mint` succeeds but `deposit` reverts, the NFT remains in your wallet — call `deposit` on the autopilot manually.
contract SeedDemoScript is Script {
    address internal constant AUTOPILOT = 0x33C0D26F51229bfD5309A0CE74ef965c247DDa5f;
    address internal constant USDC = 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d;
    address internal constant WETH_GUESS = 0x980B62Da83eFf3D4576C647993b0c1D7faf17c73;
    address internal constant NPM = 0x6b2937Bde17889EDCf8fbD8dE31C3C2a70Bc4d65;
    address internal constant FACTORY = 0x248AB79Bbb9bC29bB72f7Cd42F17e054Fc40188e;

    int24 internal constant RANGE_HALF_TICKS = 2000;

    function run() external {
        IUniswapV3Factory factory = IUniswapV3Factory(FACTORY);
        INonfungiblePositionManager npm = INonfungiblePositionManager(NPM);
        IWETH9 weth = IWETH9(WETH_GUESS);
        ILPAutopilot autopilot = ILPAutopilot(AUTOPILOT);

        vm.startBroadcast(uint256(vm.envUint("PRIVATE_KEY")));

        (address poolAddr, uint24 feeTier) = _findPool(factory, USDC, WETH_GUESS);
        require(poolAddr != address(0), unicode"NO_POOL_FOUND \u2014 pair not tradable on Arbitrum Sepolia Uniswap v3");

        IUniswapV3Pool pool = IUniswapV3Pool(poolAddr);
        (, int24 currentTick,,,,,) = pool.slot0();
        int24 tickSpacing = pool.tickSpacing();

        console2.log("Detected pool:", poolAddr);
        console2.log("fee:", uint256(feeTier));
        console2.log("current tick:", int256(currentTick));

        uint256 wethBefore = weth.balanceOf(msg.sender);
        console2.log("WETH balance before wrap:", wethBefore);
        if (wethBefore == 0) {
            weth.deposit{value: 0.008 ether}();
        }
        uint256 wethAfter = weth.balanceOf(msg.sender);
        console2.log("WETH balance after wrap:", wethAfter);

        (address token0, address token1) = USDC < WETH_GUESS ? (USDC, WETH_GUESS) : (WETH_GUESS, USDC);
        uint256 bal0 = IERC20(token0).balanceOf(msg.sender);
        uint256 bal1 = IERC20(token1).balanceOf(msg.sender);
        require(bal0 > 0 || bal1 > 0, "SeedDemo: no token balances to mint with");

        _maxApprove(IERC20(token0), NPM, bal0);
        _maxApprove(IERC20(token1), NPM, bal1);
        console2.log("Approvals set");

        int24 tickLower = _floorTick(currentTick - RANGE_HALF_TICKS, tickSpacing);
        int24 tickUpper = _ceilTick(currentTick + RANGE_HALF_TICKS, tickSpacing);
        require(tickLower < tickUpper, "SeedDemo: invalid tick range");

        (uint256 tokenId, uint128 liquidity, uint256 used0, uint256 used1) = npm.mint(
            INonfungiblePositionManager.MintParams({
                token0: token0,
                token1: token1,
                fee: feeTier,
                tickLower: tickLower,
                tickUpper: tickUpper,
                amount0Desired: bal0,
                amount1Desired: bal1,
                amount0Min: 0,
                amount1Min: 0,
                recipient: msg.sender,
                deadline: block.timestamp + 600
            })
        );

        console2.log("Minted tokenId:", tokenId);
        console2.log("liquidity:", uint256(liquidity));
        console2.log("used token0:", used0);
        console2.log("used token1:", used1);

        IERC721(address(npm)).approve(AUTOPILOT, tokenId);
        autopilot.deposit(tokenId, RANGE_HALF_TICKS);
        console2.log("Deposited into LP Autopilot");

        (
            address owner,
            , /* token0Out */
            , /* token1Out */
            , /* feeOut */
            , /* poolTick */
            , /* centerTick */
            , /* rangeTicksOut */
            bool inRange,
            uint256 activeNftId,
            , /* pending0 */
            /* pending1 */
        ) = autopilot.getPositionState(tokenId);

        require(owner == msg.sender, "SeedDemo: owner mismatch after deposit");
        require(activeNftId > 0, "SeedDemo: no active NFT in autopilot");
        require(inRange, "SeedDemo: not in range at deposit");

        console2.log("Final state: owner:", owner);
        console2.log("Final state: nftId:", activeNftId);
        console2.log("Final state: inRange:", inRange);

        vm.stopBroadcast();
    }

    function _findPool(IUniswapV3Factory factory, address a, address b)
        internal
        view
        returns (address pool, uint24 feeTier)
    {
        uint24[3] memory fees = [uint24(500), 3000, 10_000];
        for (uint256 i = 0; i < fees.length; i++) {
            address p = factory.getPool(a, b, fees[i]);
            if (p != address(0)) {
                return (p, fees[i]);
            }
        }
        return (address(0), 0);
    }

    function _maxApprove(IERC20 token, address spender, uint256 needed) internal {
        if (needed == 0) return;
        uint256 a = token.allowance(msg.sender, spender);
        if (a < needed) {
            require(token.approve(spender, type(uint256).max), "SeedDemo: approve failed");
        }
    }

    function _floorTick(int24 tick, int24 spacing) internal pure returns (int24) {
        int24 rounded = (tick / spacing) * spacing;
        if (tick < 0 && tick % spacing != 0) rounded -= spacing;
        return rounded;
    }

    function _ceilTick(int24 tick, int24 spacing) internal pure returns (int24) {
        int24 rounded = (tick / spacing) * spacing;
        if (rounded < tick) rounded += spacing;
        return rounded;
    }
}
