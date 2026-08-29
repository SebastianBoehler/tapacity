import { publicClient } from "@/lib/chain";
import { tapacityAbi } from "@/lib/contract/abi";
import type { RoundState } from "@/lib/contract/use-chain-state";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const DISCOVERY_LIMIT = 24;

export type OpenRound = { id: bigint; state: RoundState };

export function recentRoundIds(roundCount: bigint, limit = DISCOVERY_LIMIT) {
  const length = Math.min(Number(roundCount), Math.max(0, limit));
  return Array.from({ length }, (_, index) => roundCount - BigInt(index));
}

export function selectOpenRounds(rounds: OpenRound[]) {
  return rounds.filter(({ state }) => (
    state.creator !== ZERO_ADDRESS
    && state.startBlock === 0n
    && !state.settled
    && state.playerCount < state.maxPlayers
  ));
}

export async function loadOpenRounds(contract: `0x${string}`) {
  const roundCount = await publicClient.readContract({
    address: contract,
    abi: tapacityAbi,
    functionName: "roundCount",
    blockTag: "finalized",
  });
  const ids = recentRoundIds(roundCount);
  const states = await publicClient.multicall({
    allowFailure: false,
    blockTag: "finalized",
    contracts: ids.map((id) => ({
      address: contract,
      abi: tapacityAbi,
      functionName: "getRound" as const,
      args: [id] as const,
    })),
  });
  return selectOpenRounds(ids.map((id, index) => ({
    id,
    state: states[index] as unknown as RoundState,
  })));
}
