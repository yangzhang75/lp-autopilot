// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

import {INonfungiblePositionManager} from "@uniswap/v3-periphery/interfaces/INonfungiblePositionManager.sol";
import {IUniswapV3Factory} from "@uniswap/v3-core/interfaces/IUniswapV3Factory.sol";
import {IUniswapV3Pool} from "@uniswap/v3-core/interfaces/IUniswapV3Pool.sol";

/// @title LPAutopilot
/// @notice Hackathon v1: rebalance path exits liquidity to ERC20s and burns the NFT; re-mint can be added later.
contract LPAutopilot is IERC721Receiver, ReentrancyGuard {
    using SafeERC20 for IERC20;

    INonfungiblePositionManager public immutable positionManager;
    IUniswapV3Factory public immutable factory;

    struct Position {
        address owner;
        uint256 nftId;
        address token0;
        address token1;
        uint24 fee;
        int24 centerTick;
        int24 rangeTicks;
        uint256 pending0;
        uint256 pending1;
    }

    mapping(uint256 positionKey => Position) internal _positions;

    event PositionDeposited(address indexed owner, uint256 indexed tokenId, int24 rangeTicks);
    /// @dev v1 simplified rebalance: liquidity removed and tokens held as ERC20; no new NFT minted yet.
    event RebalanceTriggered(
        uint256 indexed positionKey,
        uint256 indexed oldNftId,
        int24 oldCenterTick,
        int24 newCenterTick,
        uint256 feesCollected0,
        uint256 feesCollected1
    );
    event PositionWithdrawn(address indexed owner, uint256 indexed tokenId);

    error NotOutOfRange();
    error NotOwner();
    error UnknownPosition();
    error NoActiveNft();
    error InvalidRange();
    error AlreadyDeposited();

    constructor(address nonfungiblePositionManager, address uniswapV3Factory) {
        positionManager = INonfungiblePositionManager(nonfungiblePositionManager);
        factory = IUniswapV3Factory(uniswapV3Factory);
    }

    function deposit(uint256 tokenId, int24 rangeTicks) external nonReentrant {
        IERC721(address(positionManager)).transferFrom(msg.sender, address(this), tokenId);
        _registerPosition(msg.sender, tokenId, rangeTicks);
    }

    function onERC721Received(address, address from, uint256 tokenId, bytes calldata data)
        external
        nonReentrant
        returns (bytes4)
    {
        if (msg.sender != address(positionManager)) revert UnknownPosition();
        if (data.length < 32) revert InvalidRange();
        int24 rangeTicks = abi.decode(data, (int24));
        _registerPosition(from, tokenId, rangeTicks);
        return IERC721Receiver.onERC721Received.selector;
    }

    function _registerPosition(address owner_, uint256 tokenId, int24 rangeTicks) internal {
        if (rangeTicks <= 0) revert InvalidRange();
        if (_positions[tokenId].owner != address(0)) revert AlreadyDeposited();

        (
            ,
            ,
            address token0,
            address token1,
            uint24 fee,
            ,
            ,
            uint128 liquidity,
            ,
            ,
            ,

        ) = positionManager.positions(tokenId);

        if (liquidity == 0) revert InvalidRange();

        address pool = factory.getPool(token0, token1, fee);
        if (pool == address(0)) revert InvalidRange();

        (, int24 currentTick,,,,,) = IUniswapV3Pool(pool).slot0();

        _positions[tokenId] = Position({
            owner: owner_,
            nftId: tokenId,
            token0: token0,
            token1: token1,
            fee: fee,
            centerTick: currentTick,
            rangeTicks: rangeTicks,
            pending0: 0,
            pending1: 0
        });

        emit PositionDeposited(owner_, tokenId, rangeTicks);
    }

    function checkAndRebalance(uint256 tokenId) external nonReentrant {
        Position storage p = _positions[tokenId];
        if (p.owner == address(0)) revert UnknownPosition();
        if (p.nftId == 0) revert NoActiveNft();

        address pool = factory.getPool(p.token0, p.token1, p.fee);
        (, int24 currentTick,,,,,) = IUniswapV3Pool(pool).slot0();

        int24 lower = p.centerTick - p.rangeTicks;
        int24 upper = p.centerTick + p.rangeTicks;
        if (currentTick >= lower && currentTick <= upper) revert NotOutOfRange();

        uint256 oldNftId = p.nftId;
        int24 oldCenter = p.centerTick;

        (
            ,
            ,
            ,
            ,
            ,
            ,
            ,
            uint128 liquidity,
            ,
            ,
            ,

        ) = positionManager.positions(oldNftId);

        uint256 deadline = block.timestamp + 600;

        if (liquidity > 0) {
            positionManager.decreaseLiquidity(
                INonfungiblePositionManager.DecreaseLiquidityParams({
                    tokenId: oldNftId,
                    liquidity: liquidity,
                    amount0Min: 0,
                    amount1Min: 0,
                    deadline: deadline
                })
            );
        }

        (uint256 c0, uint256 c1) = positionManager.collect(
            INonfungiblePositionManager.CollectParams({
                tokenId: oldNftId,
                recipient: address(this),
                amount0Max: type(uint128).max,
                amount1Max: type(uint128).max
            })
        );

        positionManager.burn(oldNftId);

        p.nftId = 0;
        p.centerTick = currentTick;
        p.pending0 += c0;
        p.pending1 += c1;

        emit RebalanceTriggered(tokenId, oldNftId, oldCenter, currentTick, c0, c1);
    }

    function withdraw(uint256 tokenId) external nonReentrant {
        Position storage p = _positions[tokenId];
        if (p.owner == address(0)) revert UnknownPosition();
        if (p.owner != msg.sender) revert NotOwner();

        uint256 send0 = p.pending0;
        uint256 send1 = p.pending1;

        address t0 = p.token0;
        address t1 = p.token1;
        uint256 nid = p.nftId;

        if (nid != 0) {
            (uint256 c0, uint256 c1) = positionManager.collect(
                INonfungiblePositionManager.CollectParams({
                    tokenId: nid,
                    recipient: address(this),
                    amount0Max: type(uint128).max,
                    amount1Max: type(uint128).max
                })
            );
            send0 += c0;
            send1 += c1;
            IERC721(address(positionManager)).safeTransferFrom(address(this), msg.sender, nid);
        }

        delete _positions[tokenId];

        if (send0 > 0) IERC20(t0).safeTransfer(msg.sender, send0);
        if (send1 > 0) IERC20(t1).safeTransfer(msg.sender, send1);

        emit PositionWithdrawn(msg.sender, tokenId);
    }

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
            bool inRange
        )
    {
        Position storage p = _positions[tokenId];
        owner = p.owner;
        token0 = p.token0;
        token1 = p.token1;
        fee = p.fee;
        centerTick = p.centerTick;
        rangeTicks = p.rangeTicks;

        if (owner == address(0)) {
            return (owner, token0, token1, fee, 0, centerTick, rangeTicks, false);
        }

        address pool = factory.getPool(p.token0, p.token1, p.fee);
        if (pool == address(0)) {
            return (owner, token0, token1, fee, 0, centerTick, rangeTicks, false);
        }

        (, currentTick,,,,,) = IUniswapV3Pool(pool).slot0();
        int24 lower = centerTick - rangeTicks;
        int24 upper = centerTick + rangeTicks;
        inRange = currentTick >= lower && currentTick <= upper;
    }
}
