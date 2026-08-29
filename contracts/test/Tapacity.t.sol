// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {Tapacity} from "../src/Tapacity.sol";

contract TapacityTest is Test {
    Tapacity private game;
    address private player = makeAddr("player");
    address private pulse = makeAddr("pulse");
    address private vector = makeAddr("vector");
    address private apex = makeAddr("apex");

    function setUp() external {
        game = new Tapacity();
        vm.roll(100);
    }

    function testTapOnlyInsideRoundWindow() external {
        uint256 roundId = game.createRound(105, 5, 3, 15);
        bytes32 salt = keccak256("salt");
        bytes32 commitment = game.goalCommitment(roundId, player, 10, salt);

        vm.prank(player);
        game.joinRound(roundId, commitment, bytes16("PULSE"));

        vm.roll(105);
        vm.prank(player);
        game.tap(roundId);
        assertEq(game.playerTaps(roundId, player), 1);

        vm.roll(110);
        vm.expectRevert(Tapacity.TapWindowClosed.selector);
        vm.prank(player);
        game.tap(roundId);
    }

    function testRevealRequiresExactCommitmentInsideRevealWindow() external {
        uint256 roundId = game.createRound(105, 5, 3, 15);
        bytes32 salt = keccak256("secret salt");
        bytes32 commitment = game.goalCommitment(roundId, player, 10, salt);

        vm.prank(player);
        game.joinRound(roundId, commitment, bytes16("PULSE"));

        vm.roll(110);
        vm.expectRevert(Tapacity.InvalidReveal.selector);
        vm.prank(player);
        game.revealGoal(roundId, 10, keccak256("wrong salt"));

        vm.prank(player);
        game.revealGoal(roundId, 10, salt);
        assertEq(game.playerGoal(roundId, player), 10);
    }

    function testSettlementUsesDeterministicScoreAndTieOrder() external {
        uint256 roundId = game.createRound(105, 5, 3, 15);
        _join(roundId, pulse, 8);
        _join(roundId, vector, 8);
        _join(roundId, apex, 18);

        vm.roll(105);
        _tap(roundId, pulse, 6);
        _tap(roundId, vector, 5);
        vm.roll(106);
        _tap(roundId, apex, 9);
        vm.roll(107);
        _tap(roundId, vector, 1);

        vm.roll(110);
        _reveal(roundId, pulse, 8);
        _reveal(roundId, vector, 8);
        _reveal(roundId, apex, 18);

        vm.roll(112);
        vm.expectRevert(Tapacity.SettlementWindowOpen.selector);
        game.settleRound(roundId);

        vm.roll(113);
        vm.prank(makeAddr("permissionless settler"));
        game.settleRound(roundId);

        assertEq(game.rankedPlayer(roundId, 0), pulse, "earlier final tap wins exact tie");
        assertEq(game.rankedPlayer(roundId, 1), vector);
        assertEq(game.rankedPlayer(roundId, 2), apex, "higher accuracy wins equal score");

        (uint32 accuracyPpm, uint64 score) = game.playerScore(roundId, vector);
        assertEq(accuracyPpm, 750_000);
        assertEq(score, 4_500_000);
    }

    function _join(uint256 roundId, address account, uint32 goal) private {
        bytes32 salt = keccak256(abi.encode(account));
        bytes32 commitment = game.goalCommitment(roundId, account, goal, salt);
        vm.prank(account);
        game.joinRound(roundId, commitment, bytes16(0));
    }

    function _tap(uint256 roundId, address account, uint256 count) private {
        for (uint256 i; i < count; ++i) {
            vm.prank(account);
            game.tap(roundId);
        }
    }

    function _reveal(uint256 roundId, address account, uint32 goal) private {
        vm.prank(account);
        game.revealGoal(roundId, goal, keccak256(abi.encode(account)));
    }
}
