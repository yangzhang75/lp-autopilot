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

        int24 tickOutside = centerTick - int24(rangeTicks) - 1;
        _mockSlot0(pool, tickOutside);

        autopilot.checkAndRebalance(ownedTokenId);
        (,,,,,,,, uint256 activeNft,,) = autopilot.getPositionState(ownedTokenId);
        assertEq(activeNft, 0, "nft burned in v1");
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
