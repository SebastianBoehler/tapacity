import { parseAbi } from "viem";

export const tapacityAbi = parseAbi([
  "function roundCount() view returns (uint256)",
  "function createRound(uint32 durationBlocks, uint32 revealBlocks, uint16 maxPlayers) returns (uint256 roundId)",
  "function startRound(uint256 roundId, uint32 leadBlocks)",
  "function joinRound(uint256 roundId, address tapper, bytes32 commitment, bytes16 nickname)",
  "function tap(uint256 roundId)",
  "function revealGoal(uint256 roundId, address player, uint32 goal, bytes32 salt)",
  "function settleRound(uint256 roundId)",
  "function goalCommitment(uint256 roundId, address player, uint32 goal, bytes32 salt) pure returns (bytes32)",
  "function getRound(uint256 roundId) view returns ((address creator, uint64 startBlock, uint64 endBlock, uint64 revealEndBlock, uint32 durationBlocks, uint32 revealBlocks, uint16 maxPlayers, uint16 playerCount, uint64 totalTaps, bool settled))",
  "function getPlayer(uint256 roundId, address player) view returns ((bytes32 commitment, bytes16 nickname, uint32 taps, uint32 goal, uint32 accuracyPpm, uint64 score, uint64 lastTapBlock, bool joined, bool revealed, address controller))",
  "function getRanking(uint256 roundId) view returns (address[])",
  "event RoundCreated(uint256 indexed roundId, address indexed creator, uint32 durationBlocks, uint32 revealBlocks, uint16 maxPlayers)",
  "event RoundStarted(uint256 indexed roundId, uint64 startBlock, uint64 endBlock, uint64 revealEndBlock)",
  "event GoalCommitted(uint256 indexed roundId, address indexed player, bytes32 commitment, bytes16 nickname)",
  "event TapRecorded(uint256 indexed roundId, address indexed player, uint32 tapNumber)",
  "event GoalRevealed(uint256 indexed roundId, address indexed player, uint32 goal)",
  "event PlayerSettled(uint256 indexed roundId, address indexed player, uint16 rank, uint32 taps, uint32 goal, uint32 accuracyPpm, uint64 score, uint64 lastTapBlock)",
  "event RoundSettled(uint256 indexed roundId, uint64 totalTaps)",
]);
