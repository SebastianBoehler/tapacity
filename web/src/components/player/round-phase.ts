import type { RoundState } from "@/lib/contract/use-chain-state";

export function currentPhase(block: bigint, round: RoundState) {
  if (round.startBlock === 0n) return "waiting";
  if (block < round.startBlock) return "lobby";
  if (block < round.endBlock) return "live";
  if (block < round.revealEndBlock) return "reveal";
  return "settlement";
}

export function phaseLabel(phase: string) {
  return {
    waiting: "Waiting for host",
    lobby: "Round armed",
    live: "Execution window",
    reveal: "Automatic reveal",
    settlement: "Waiting for settlement",
  }[phase];
}
