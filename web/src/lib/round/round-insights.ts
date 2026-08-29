export const MONAD_DOCUMENTED_TPS = 10_000;
export const MONAD_BLOCK_SECONDS = 0.4;
export const MONAD_DOCUMENTED_FINALITY_MS = 800;
const PEAK_WINDOW_BLOCKS = 3;

export type AcceptedTap = {
  blockNumber: bigint;
  player: string;
  transactionHash: string;
};

export type ObservedBlock = {
  number: bigint;
  transactionCount: number;
};

export type RoundSummary = {
  finalizedTaps: number;
  activeLanes: number;
  averageAppTps: number;
  peakAppTps: number;
  testnetTps: number;
  tapacitySharePercent?: number;
  tapacityTransactions: number;
  operationsPerTransaction?: number;
  goalRealizationPercent?: number;
  equivalentRooms?: number;
  capacitySharePercent: number;
};

export function summarizeRound({
  startBlock,
  endBlock,
  acceptedTaps,
  blocks,
  totalGoal,
}: {
  startBlock: bigint;
  endBlock: bigint;
  acceptedTaps: AcceptedTap[];
  blocks: ObservedBlock[];
  totalGoal: number;
}): RoundSummary {
  const durationBlocks = Number(endBlock - startBlock);
  const durationSeconds = durationBlocks * MONAD_BLOCK_SECONDS;
  const gameBlocks = blocks.filter((block) => block.number >= startBlock && block.number < endBlock);
  const networkTransactions = gameBlocks.reduce((total, block) => total + block.transactionCount, 0);
  const finalizedTaps = acceptedTaps.length;
  const tapacityTransactions = new Set(acceptedTaps.map((tap) => tap.transactionHash)).size;
  const peakWindowSeconds = PEAK_WINDOW_BLOCKS * MONAD_BLOCK_SECONDS;
  let peakWindowTaps = 0;

  for (let offset = 0; offset < durationBlocks; offset += 1) {
    const windowStart = startBlock + BigInt(offset);
    const windowEnd = windowStart + BigInt(PEAK_WINDOW_BLOCKS);
    const count = acceptedTaps.filter((tap) => tap.blockNumber >= windowStart && tap.blockNumber < windowEnd).length;
    peakWindowTaps = Math.max(peakWindowTaps, count);
  }

  const peakAppTps = peakWindowTaps / peakWindowSeconds;
  return {
    finalizedTaps,
    activeLanes: new Set(acceptedTaps.map((tap) => tap.player.toLowerCase())).size,
    averageAppTps: durationSeconds > 0 ? finalizedTaps / durationSeconds : 0,
    peakAppTps,
    testnetTps: durationSeconds > 0 ? networkTransactions / durationSeconds : 0,
    tapacitySharePercent: networkTransactions > 0 ? tapacityTransactions / networkTransactions * 100 : undefined,
    tapacityTransactions,
    operationsPerTransaction: tapacityTransactions > 0 ? finalizedTaps / tapacityTransactions : undefined,
    goalRealizationPercent: totalGoal > 0 ? finalizedTaps / totalGoal * 100 : undefined,
    equivalentRooms: peakAppTps > 0 ? Math.floor(MONAD_DOCUMENTED_TPS / peakAppTps) : undefined,
    capacitySharePercent: peakAppTps / MONAD_DOCUMENTED_TPS * 100,
  };
}
