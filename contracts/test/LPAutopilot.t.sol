// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {LPAutopilot} from "../src/LPAutopilot.sol";
import {IUniswapV3PoolState} from "@uniswap/v3-core/interfaces/pool/IUniswapV3PoolState.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {INonfungiblePositionManager} from "@uniswap/v3-periphery/interfaces/INonfungiblePositionManager.sol";
import {IUniswapV3Pool} from "@uniswap/v3-core/interfaces/IUniswapV3Pool.sol";

contract DumbNftReceiver {
    function deposit(LPAutopilot ap, address npm, uint256 tokenId, int24 r) external {
        IERC721(npm).setApprovalForAll(address(ap), true);
        ap.deposit(tokenId, r);
    }

    function withdraw(LPAutopilot ap, uint256 tokenId) external {
        ap.withdraw(tokenId);
    }
}

contract LPAutopilotTest is Test {
    LPAutopilot public autopilot;

    // Arbitrum One (mainnet) — fork tests
    address constant NPM = 0xC36442b4a4522E871399CD717aBDD847Ab11FE88;
    address constant FACTORY = 0x1F98431c8aD98523631AE4a59f267346ea31F984;

    address constant WETH = 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1;
    address constant USDC = 0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8;
    uint24 constant FEE = 3000;
    address constant SWAP_ROUTER = 0xE592427A0AEce92De3Edee1F18E0157C05861564;

    address testUser;
    uint256 ownedTokenId;

    function setUp() public {
        string memory rpc = vm.envOr("ARBITRUM_MAINNET_RPC_URL", string("https://arb1.arbitrum.io/rpc"));
        vm.createSelectFork(rpc);

        autopilot = new LPAutopilot(NPM, FACTORY);

        testUser = makeAddr("testUser");
        deal(WETH, testUser, 5 ether);
        deal(USDC, testUser, 50_000e6);

        vm.startPrank(testUser);
        IERC20(WETH).approve(NPM, type(uint256).max);
        IERC20(USDC).approve(NPM, type(uint256).max);

        address pool = IUniswapV3FactoryLike(FACTORY).getPool(WETH, USDC, FEE);
        require(pool != address(0), "no pool");
        (, int24 currentTick,,,,,) = IUniswapV3Pool(pool).slot0();
        int24 spacing = IUniswapV3Pool(pool).tickSpacing();
        int24 tL = _floorToSpacing(currentTick, spacing) - 10 * spacing;
        int24 tU = _floorToSpacing(currentTick, spacing) + 10 * spacing;
        if (tL >= tU) {
            tL = tU - spacing;
        }

        (ownedTokenId,,,) = INonfungiblePositionManager(NPM)
            .mint(
                INonfungiblePositionManager.MintParams({
                    token0: WETH,
                    token1: USDC,
                    fee: FEE,
                    tickLower: tL,
                    tickUpper: tU,
                    amount0Desired: 1 ether,
                    amount1Desired: 10_000e6,
                    amount0Min: 0,
                    amount1Min: 0,
                    recipient: testUser,
                    deadline: block.timestamp + 600
                })
            );
        assertGt(ownedTokenId, 0, "mint token");
        vm.stopPrank();
    }

    function _floorToSpacing(int24 tick, int24 sp) private pure returns (int24) {
        int32 t = int32(tick);
        int32 s = int32(sp);
        int32 q = t / s;
        if (t < 0 && t % s != 0) q -= 1;
        return int24(q) * int24(s);
    }

    function testFork_DepositRealNftStoresState() public {
        vm.startPrank(testUser);
        IERC721(NPM).setApprovalForAll(address(autopilot), true);
        int24 rangeTicks = 50_000;
        autopilot.deposit(ownedTokenId, rangeTicks);
        vm.stopPrank();

        (
            address owner,
            address token0,
            address token1,
            uint24 fee,
            int24 currentTick,
            int24 centerTick,
            int24 storedRange,
            bool inRange,
            uint256 activeNft,,
        ) = autopilot.getPositionState(ownedTokenId);

        assertEq(owner, testUser);
        assertEq(token0, WETH);
        assertEq(token1, USDC);
        assertEq(fee, FEE);
        assertEq(storedRange, rangeTicks);
        assertEq(centerTick, currentTick);
        assertTrue(inRange);
        assertEq(activeNft, ownedTokenId);
    }

    function testCheckAndRebalance_RevertsWhenInRange() public {
        vm.startPrank(testUser);
        IERC721(NPM).setApprovalForAll(address(autopilot), true);
        int24 rangeTicks = 100_000;
        autopilot.deposit(ownedTokenId, rangeTicks);
        vm.stopPrank();

        (,,,,, int24 centerTick,,,,,) = autopilot.getPositionState(ownedTokenId);
        address pool = IUniswapV3FactoryLike(FACTORY).getPool(WETH, USDC, FEE);

        int24 tickInside = centerTick;
        _mockSlot0(pool, tickInside);

        vm.expectRevert(LPAutopilot.NotOutOfRange.selector);
        autopilot.checkAndRebalance(ownedTokenId);
    }

    function testCheckAndRebalance_SucceedsWhenOutOfRange() public {
        vm.startPrank(testUser);
        IERC721(NPM).setApprovalForAll(address(autopilot), true);
        int24 rangeTicks = 100;
        autopilot.deposit(ownedTokenId, rangeTicks);
        vm.stopPrank();

        (,,,,, int24 centerTick,,,,,) = autopilot.getPositionState(ownedTokenId);
        address pool = IUniswapV3FactoryLike(FACTORY).getPool(WETH, USDC, FEE);

        // Nudge price just out of band; a huge swap makes the position one-sided (c1=0) and NPM mint then computes L=0.
        _swapWethForUsdc(2 ether);
        (, int24 tickAfterSwap,,,,,) = IUniswapV3Pool(pool).slot0();
        assertTrue(
            tickAfterSwap < centerTick - int24(rangeTicks) || tickAfterSwap > centerTick + int24(rangeTicks),
            "swap should move tick out of autopilot band"
        );

        uint256 oldNftId = ownedTokenId;
        autopilot.checkAndRebalance(ownedTokenId);
        (,,,,, int24 centerAfter,,, uint256 activeNft,,) = autopilot.getPositionState(ownedTokenId);
        assertGt(activeNft, 0, "v2 remints an NFT");
        assertTrue(activeNft != oldNftId, "new token id");
        (, int24 currentTick,,,,,) = IUniswapV3Pool(pool).slot0();
        assertEq(centerAfter, currentTick, "center follows pool tick at rebalance");
        assertEq(IERC721(NPM).ownerOf(activeNft), address(autopilot));
    }

    function testCheckAndRebalance_MintsNewPositionAfterExit() public {
        vm.startPrank(testUser);
        IERC721(NPM).setApprovalForAll(address(autopilot), true);
        int24 rangeTicks = 50;
        autopilot.deposit(ownedTokenId, rangeTicks);
        vm.stopPrank();

        (,,,,, int24 centerBefore,,,,,) = autopilot.getPositionState(ownedTokenId);
        address pool = IUniswapV3FactoryLike(FACTORY).getPool(WETH, USDC, FEE);

        _swapWethForUsdc(2 ether);
        (, int24 tickAfterSwap,,,,,) = IUniswapV3Pool(pool).slot0();
        assertTrue(
            tickAfterSwap < centerBefore - int24(rangeTicks) || tickAfterSwap > centerBefore + int24(rangeTicks),
            "swap should move tick out of autopilot band"
        );

        uint256 oldNftId = ownedTokenId;
        autopilot.checkAndRebalance(ownedTokenId);

        (,,,,, int24 centerAfter,,, uint256 activeNft,,) = autopilot.getPositionState(ownedTokenId);
        assertTrue(centerAfter != centerBefore, "center should have updated to current tick");
        (, int24 currentTick,,,,,) = IUniswapV3Pool(pool).slot0();
        assertEq(centerAfter, currentTick);
        assertGt(activeNft, 0);
        assertTrue(activeNft != oldNftId);
        assertEq(IERC721(NPM).ownerOf(activeNft), address(autopilot));
    }

    function _swapWethForUsdc(uint256 amountInWeth) internal {
        deal(WETH, testUser, IERC20(WETH).balanceOf(testUser) + amountInWeth);
        vm.startPrank(testUser);
        IERC20(WETH).approve(SWAP_ROUTER, type(uint256).max);
        ISwapRouter(SWAP_ROUTER).exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: WETH,
                tokenOut: USDC,
                fee: FEE,
                recipient: testUser,
                deadline: block.timestamp + 600,
                amountIn: amountInWeth,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        vm.stopPrank();
    }

    function testWithdraw_OnlyOwner() public {
        vm.startPrank(testUser);
        IERC721(NPM).setApprovalForAll(address(autopilot), true);
        autopilot.deposit(ownedTokenId, 500_000);
        vm.stopPrank();

        address rando = address(0xBEEF);
        vm.prank(rando);
        vm.expectRevert(LPAutopilot.NotOwner.selector);
        autopilot.withdraw(ownedTokenId);

        vm.prank(testUser);
        autopilot.withdraw(ownedTokenId);
    }

    function testDeposit_RevertInvalidRange() public {
        vm.startPrank(testUser);
        IERC721(NPM).setApprovalForAll(address(autopilot), true);
        vm.expectRevert(LPAutopilot.InvalidRange.selector);
        autopilot.deposit(ownedTokenId, 0);
        vm.stopPrank();
    }

    function testDeposit_RevertDuplicate() public {
        vm.startPrank(testUser);
        IERC721(NPM).setApprovalForAll(address(autopilot), true);
        autopilot.deposit(ownedTokenId, 600);
        vm.expectRevert(LPAutopilot.AlreadyDeposited.selector);
        autopilot.deposit(ownedTokenId, 600);
        vm.stopPrank();
    }

    function testOnERC721Received_RejectsNonNpm() public {
        vm.prank(address(0xDEAD));
        vm.expectRevert(LPAutopilot.UnknownPosition.selector);
        autopilot.onERC721Received(address(0), address(0), 1, abi.encode(int24(600)));
    }

    function testWithdraw_ContractDepositorNoReceiver() public {
        DumbNftReceiver dumb = new DumbNftReceiver();
        vm.startPrank(testUser);
        IERC721(NPM).transferFrom(testUser, address(dumb), ownedTokenId);
        vm.stopPrank();

        vm.startPrank(address(dumb));
        IERC721(NPM).setApprovalForAll(address(autopilot), true);
        autopilot.deposit(ownedTokenId, 1_200);
        vm.stopPrank();

        assertEq(IERC721(NPM).ownerOf(ownedTokenId), address(autopilot));

        vm.prank(address(dumb));
        dumb.withdraw(autopilot, ownedTokenId);
        assertEq(IERC721(NPM).ownerOf(ownedTokenId), address(dumb));
    }

    function _mockSlot0(address pool, int24 tick) internal {
        uint160 sqrtP = _sqrtRatioAtTick(tick);
        vm.mockCall(
            pool,
            abi.encodeWithSelector(IUniswapV3PoolState.slot0.selector),
            abi.encode(sqrtP, tick, uint16(0), uint16(0), uint16(0), uint8(0), true)
        );
    }

    /// @dev Uniswap v3 TickMath.getSqrtRatioAtTick (v3-core TickMath is pragma <0.8; inlined for solc 0.8.x tests).
    function _sqrtRatioAtTick(int24 tick) private pure returns (uint160 sqrtPriceX96) {
        uint256 absTick = tick < 0 ? uint256(-int256(tick)) : uint256(int256(tick));
        require(absTick <= uint256(uint24(887_272)), "T");

        uint256 ratio = absTick & 0x1 != 0 ? 0xfffcb933bd6fad37aa2d162d1a594001 : 0x100000000000000000000000000000000;
        if (absTick & 0x2 != 0) ratio = (ratio * 0xfff97272373d413259a46990580e213a) >> 128;
        if (absTick & 0x4 != 0) ratio = (ratio * 0xfff2e50f5f656932ef12357cf3c7fdcc) >> 128;
        if (absTick & 0x8 != 0) ratio = (ratio * 0xffe5caca7e10e4e61c3624eaa0941cd0) >> 128;
        if (absTick & 0x10 != 0) ratio = (ratio * 0xffcb9843d60f6159c9db58835c926644) >> 128;
        if (absTick & 0x20 != 0) ratio = (ratio * 0xff973b41fa98c081472e6896dfb254c0) >> 128;
        if (absTick & 0x40 != 0) ratio = (ratio * 0xff2ea16466c96a3843ec78b326b52861) >> 128;
        if (absTick & 0x80 != 0) ratio = (ratio * 0xfe5dee046a99a2a811c461f1969c3053) >> 128;
        if (absTick & 0x100 != 0) ratio = (ratio * 0xfcbe86c7900a88aedcffc83b479aa3a4) >> 128;
        if (absTick & 0x200 != 0) ratio = (ratio * 0xf987a7253ac413176f2b074cf7815e54) >> 128;
        if (absTick & 0x400 != 0) ratio = (ratio * 0xf3392b0822b70005940c7a398e4b70f3) >> 128;
        if (absTick & 0x800 != 0) ratio = (ratio * 0xe7159475a2c29b7443b29c7fa6e889d9) >> 128;
        if (absTick & 0x1000 != 0) ratio = (ratio * 0xd097f3bdfd2022b8845ad8f792aa5825) >> 128;
        if (absTick & 0x2000 != 0) ratio = (ratio * 0xa9f746462d870fdf8a65dc1f90e061e5) >> 128;
        if (absTick & 0x4000 != 0) ratio = (ratio * 0x70d869a156d2a1b890bb3df62baf32f7) >> 128;
        if (absTick & 0x8000 != 0) ratio = (ratio * 0x31be135f97d08fd981231505542fcfa6) >> 128;
        if (absTick & 0x10000 != 0) ratio = (ratio * 0x9aa508b5b7a84e1c677de54f3e99bc9) >> 128;
        if (absTick & 0x20000 != 0) ratio = (ratio * 0x5d6af8dedb81196699c329225ee604) >> 128;
        if (absTick & 0x40000 != 0) ratio = (ratio * 0x2216e584f5fa1ea926041bedfe98) >> 128;
        if (absTick & 0x80000 != 0) ratio = (ratio * 0x48a170391f7dc42444e8fa2) >> 128;

        if (tick > 0) ratio = type(uint256).max / ratio;

        sqrtPriceX96 = uint160((ratio >> 32) + (ratio % (1 << 32) == 0 ? 0 : 1));
    }
}

interface IUniswapV3FactoryLike {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
}

/// @dev Uniswap v3 SwapRouter on Arbitrum One (fork tests)
interface ISwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(ExactInputSingleParams calldata params) external payable returns (uint256 amountOut);
}
