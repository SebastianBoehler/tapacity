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
        vm.deal(address(this), 100 ether);
        vm.roll(100);
    }

    function testTapOnlyInsideRoundWindow() external {
        uint256 roundId = game.createRound(5, 3, 15, 1 ether);
        bytes32 salt = keccak256("salt");
        bytes32 commitment = game.goalCommitment(roundId, player, 10, salt);

        vm.prank(player);
        game.joinRound(roundId, player, commitment, bytes16("PULSE"));
        _start(roundId, 5);

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
        uint256 roundId = game.createRound(5, 3, 15, 1 ether);
        bytes32 salt = keccak256("secret salt");
        bytes32 commitment = game.goalCommitment(roundId, player, 10, salt);
        address controller = makeAddr("controller");

        vm.prank(controller);
        game.joinRound(roundId, player, commitment, bytes16("PULSE"));
        _start(roundId, 5);

        vm.roll(110);
        vm.expectRevert(Tapacity.InvalidReveal.selector);
        vm.prank(controller);
        game.revealGoal(roundId, player, 10, keccak256("wrong salt"));

        vm.expectRevert(Tapacity.NotPlayerController.selector);
        vm.prank(makeAddr("stranger"));
        game.revealGoal(roundId, player, 10, salt);

        vm.prank(controller);
        game.revealGoal(roundId, player, 10, salt);
        assertEq(game.playerGoal(roundId, player), 10);
    }

    function testSettlementUsesDeterministicScoreAndTieOrder() external {
        uint256 roundId = game.createRound(5, 3, 15, 1 ether);
        _join(roundId, pulse, 8);
        _join(roundId, vector, 8);
        _join(roundId, apex, 18);
        _start(roundId, 5);

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

    function testLobbyStaysOpenUntilCreatorStartsAndThenFreezesRoster() external {
        uint256 roundId = game.createRound(5, 3, 15, 1 ether);
        _join(roundId, pulse, 8);

        Tapacity.Round memory lobby = game.getRound(roundId);
        assertEq(lobby.startBlock, 0);
        assertEq(lobby.playerCount, 1);

        vm.prank(player);
        vm.expectRevert(Tapacity.OnlyRoundCreator.selector);
        game.startRound(roundId, 5);

        _start(roundId, 5);
        Tapacity.Round memory started = game.getRound(roundId);
        assertEq(started.startBlock, 105);
        assertEq(started.endBlock, 110);
        assertEq(started.revealEndBlock, 113);
        assertEq(pulse.balance, 1 ether, "host funds the joined player at synchronized start");

        bytes32 salt = keccak256(abi.encode(vector));
        bytes32 commitment = game.goalCommitment(roundId, vector, 8, salt);
        vm.prank(vector);
        vm.expectRevert(Tapacity.JoinWindowClosed.selector);
        game.joinRound(roundId, vector, commitment, bytes16(0));
    }

    function _start(uint256 roundId, uint32 leadBlocks) private {
        Tapacity.Round memory round = game.getRound(roundId);
        game.startRound{value: uint256(round.tapGrantWei) * round.playerCount}(roundId, leadBlocks);
    }

    function _join(uint256 roundId, address account, uint32 goal) private {
        bytes32 salt = keccak256(abi.encode(account));
        bytes32 commitment = game.goalCommitment(roundId, account, goal, salt);
        vm.prank(account);
        game.joinRound(roundId, account, commitment, bytes16(0));
    }

    function _tap(uint256 roundId, address account, uint256 count) private {
        for (uint256 i; i < count; ++i) {
            vm.prank(account);
            game.tap(roundId);
        }
    }

    function _reveal(uint256 roundId, address account, uint32 goal) private {
        vm.prank(account);
        game.revealGoal(roundId, account, goal, keccak256(abi.encode(account)));
    }
}
