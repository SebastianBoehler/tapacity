// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract Tapacity {
    uint16 public constant MAX_PLAYERS = 32;

    error InvalidRound();
    error InvalidSchedule();
    error JoinWindowClosed();
    error PlayerLimitReached();
    error AlreadyJoined();
    error NotJoined();
    error TapWindowClosed();
    error RevealWindowClosed();
    error InvalidReveal();
    error AlreadyRevealed();
    error SettlementWindowOpen();
    error AlreadySettled();

    event RoundCreated(
        uint256 indexed roundId,
        address indexed creator,
        uint64 startBlock,
        uint64 endBlock,
        uint64 revealEndBlock,
        uint16 maxPlayers
    );
    event GoalCommitted(uint256 indexed roundId, address indexed player, bytes32 commitment, bytes16 nickname);
    event TapRecorded(uint256 indexed roundId, address indexed player, uint32 tapNumber);
    event GoalRevealed(uint256 indexed roundId, address indexed player, uint32 goal);
    event PlayerSettled(
        uint256 indexed roundId,
        address indexed player,
        uint16 rank,
        uint32 taps,
        uint32 goal,
        uint32 accuracyPpm,
        uint64 score,
        uint64 lastTapBlock
    );
    event RoundSettled(uint256 indexed roundId, uint64 totalTaps);

    struct Round {
        address creator;
        uint64 startBlock;
        uint64 endBlock;
        uint64 revealEndBlock;
        uint16 maxPlayers;
        uint16 playerCount;
        uint64 totalTaps;
        bool settled;
    }

    struct Player {
        bytes32 commitment;
        bytes16 nickname;
        uint32 taps;
        uint32 goal;
        uint32 accuracyPpm;
        uint64 score;
        uint64 lastTapBlock;
        bool joined;
        bool revealed;
    }

    uint256 public roundCount;
    mapping(uint256 roundId => Round round) private rounds;
    mapping(uint256 roundId => mapping(address player => Player state)) private players;
    mapping(uint256 roundId => address[] players) private participantAddresses;
    mapping(uint256 roundId => address[] players) private rankings;

    function createRound(uint64 startBlock, uint32 durationBlocks, uint32 revealBlocks, uint16 maxPlayers)
        external
        returns (uint256 roundId)
    {
        if (
            startBlock <= block.number || durationBlocks == 0 || revealBlocks == 0 || maxPlayers == 0
                || maxPlayers > MAX_PLAYERS
        ) {
            revert InvalidSchedule();
        }

        roundId = ++roundCount;
        rounds[roundId] = Round({
            creator: msg.sender,
            startBlock: startBlock,
            endBlock: startBlock + durationBlocks,
            revealEndBlock: startBlock + durationBlocks + revealBlocks,
            maxPlayers: maxPlayers,
            playerCount: 0,
            totalTaps: 0,
            settled: false
        });
        emit RoundCreated(
            roundId,
            msg.sender,
            startBlock,
            startBlock + durationBlocks,
            startBlock + durationBlocks + revealBlocks,
            maxPlayers
        );
    }

    function joinRound(uint256 roundId, bytes32 commitment, bytes16 nickname) external {
        Round storage round = rounds[roundId];
        if (round.creator == address(0)) revert InvalidRound();
        if (block.number >= round.startBlock) revert JoinWindowClosed();
        if (round.playerCount >= round.maxPlayers) revert PlayerLimitReached();

        Player storage player = players[roundId][msg.sender];
        if (player.joined) revert AlreadyJoined();

        player.commitment = commitment;
        player.nickname = nickname;
        player.joined = true;
        round.playerCount += 1;
        participantAddresses[roundId].push(msg.sender);
        emit GoalCommitted(roundId, msg.sender, commitment, nickname);
    }

    function tap(uint256 roundId) external {
        Round storage round = rounds[roundId];
        if (round.creator == address(0)) revert InvalidRound();
        if (block.number < round.startBlock || block.number >= round.endBlock) revert TapWindowClosed();

        Player storage player = players[roundId][msg.sender];
        if (!player.joined) revert NotJoined();
        player.taps += 1;
        player.lastTapBlock = uint64(block.number);
        emit TapRecorded(roundId, msg.sender, player.taps);
    }

    function revealGoal(uint256 roundId, uint32 goal, bytes32 salt) external {
        Round storage round = rounds[roundId];
        if (round.creator == address(0)) revert InvalidRound();
        if (block.number < round.endBlock || block.number >= round.revealEndBlock) revert RevealWindowClosed();

        Player storage player = players[roundId][msg.sender];
        if (!player.joined) revert NotJoined();
        if (player.revealed) revert AlreadyRevealed();
        if (goal == 0 || player.commitment != goalCommitment(roundId, msg.sender, goal, salt)) {
            revert InvalidReveal();
        }

        player.goal = goal;
        player.revealed = true;
        emit GoalRevealed(roundId, msg.sender, goal);
    }

    function settleRound(uint256 roundId) external {
        Round storage round = rounds[roundId];
        if (round.creator == address(0)) revert InvalidRound();
        if (block.number < round.revealEndBlock) revert SettlementWindowOpen();
        if (round.settled) revert AlreadySettled();

        address[] memory ranking = participantAddresses[roundId];
        uint256 totalTaps;
        for (uint256 i; i < ranking.length; ++i) {
            Player storage player = players[roundId][ranking[i]];
            if (player.revealed) {
                uint32 lower = player.goal < player.taps ? player.goal : player.taps;
                uint32 higher = player.goal > player.taps ? player.goal : player.taps;
                player.accuracyPpm = higher == 0 ? 0 : uint32(uint256(lower) * 1_000_000 / higher);
                player.score = uint64(uint256(player.taps) * player.accuracyPpm);
            }
            totalTaps += player.taps;
        }

        for (uint256 i = 1; i < ranking.length; ++i) {
            address candidate = ranking[i];
            uint256 j = i;
            while (j > 0 && _ranksBefore(roundId, candidate, ranking[j - 1])) {
                ranking[j] = ranking[j - 1];
                --j;
            }
            ranking[j] = candidate;
        }

        for (uint256 i; i < ranking.length; ++i) {
            rankings[roundId].push(ranking[i]);
            Player storage player = players[roundId][ranking[i]];
            emit PlayerSettled(
                roundId,
                ranking[i],
                uint16(i + 1),
                player.taps,
                player.goal,
                player.accuracyPpm,
                player.score,
                player.lastTapBlock
            );
        }
        round.totalTaps = uint64(totalTaps);
        round.settled = true;
        emit RoundSettled(roundId, uint64(totalTaps));
    }

    function _ranksBefore(uint256 roundId, address leftAddress, address rightAddress) private view returns (bool) {
        Player storage left = players[roundId][leftAddress];
        Player storage right = players[roundId][rightAddress];
        if (left.score != right.score) return left.score > right.score;
        if (left.accuracyPpm != right.accuracyPpm) return left.accuracyPpm > right.accuracyPpm;
        if (left.taps != right.taps) return left.taps > right.taps;
        if (left.lastTapBlock != right.lastTapBlock) return left.lastTapBlock < right.lastTapBlock;
        return leftAddress < rightAddress;
    }

    function goalCommitment(uint256 roundId, address player, uint32 goal, bytes32 salt) public pure returns (bytes32) {
        return keccak256(abi.encode(roundId, player, goal, salt));
    }

    function playerTaps(uint256 roundId, address player) external view returns (uint32) {
        return players[roundId][player].taps;
    }

    function playerGoal(uint256 roundId, address player) external view returns (uint32) {
        return players[roundId][player].goal;
    }

    function playerScore(uint256 roundId, address player) external view returns (uint32 accuracyPpm, uint64 score) {
        Player storage state = players[roundId][player];
        return (state.accuracyPpm, state.score);
    }

    function rankedPlayer(uint256 roundId, uint256 rank) external view returns (address) {
        return rankings[roundId][rank];
    }

    function getRound(uint256 roundId) external view returns (Round memory) {
        return rounds[roundId];
    }

    function getPlayer(uint256 roundId, address player) external view returns (Player memory) {
        return players[roundId][player];
    }

    function getRanking(uint256 roundId) external view returns (address[] memory) {
        return rankings[roundId];
    }
}
