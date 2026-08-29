export type CommitState = "Proposed" | "Voted" | "Finalized" | "Verified";

export type TapCommitmentState = {
  blockId: `0x${string}`;
  blockNumber?: `0x${string}`;
  commitState: CommitState;
  finalizedAt?: number;
};

const rank: Record<CommitState, number> = {
  Proposed: 0,
  Voted: 1,
  Finalized: 2,
  Verified: 3,
};

export function commitmentRank(state: CommitState) {
  return rank[state];
}

export function advanceTapState(
  current: TapCommitmentState | undefined,
  incoming: TapCommitmentState,
) {
  if (!current) return incoming;
  if (rank[incoming.commitState] >= rank[current.commitState]) return { ...current, ...incoming };
  return current;
}

export function pruneSupersededTapStates(
  states: Map<`0x${string}`, TapCommitmentState>,
  canonicalHead: Required<Pick<TapCommitmentState, "blockId" | "blockNumber" | "commitState">>,
) {
  if (rank[canonicalHead.commitState] < rank.Voted) return states;
  let next: Map<`0x${string}`, TapCommitmentState> | undefined;
  for (const [hash, state] of states) {
    const superseded = state.blockNumber === canonicalHead.blockNumber
      && state.blockId !== canonicalHead.blockId
      && rank[state.commitState] < rank.Finalized;
    if (superseded) {
      next ??= new Map(states);
      next.delete(hash);
    }
  }
  return next ?? states;
}
