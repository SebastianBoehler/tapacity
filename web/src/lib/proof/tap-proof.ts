export type TapProofRecord = {
  operationId: string;
  tapNumber: number;
  player: `0x${string}`;
  transactionHash: `0x${string}`;
  blockNumber: bigint;
  logIndex: number;
};

export type TapAttemptProofStatus = "finalized" | "submitted" | "late" | "failed" | "not-submitted";

export function operationId(transactionHash: `0x${string}`, logIndex: number) {
  return `${transactionHash.toLowerCase()}:${logIndex}`;
}

export function summarizeTapProof(taps: readonly { transactionHash: string }[]) {
  return {
    operations: taps.length,
    outerTransactions: new Set(taps.map((tap) => tap.transactionHash.toLowerCase())).size,
  };
}

export function compareTapProof(a: TapProofRecord, b: TapProofRecord) {
  if (a.blockNumber !== b.blockNumber) return a.blockNumber < b.blockNumber ? -1 : 1;
  return a.logIndex - b.logIndex;
}

export function knownAttemptStatus({
  hasHash,
  finalized,
  callStatus,
  receiptBlock,
  endBlock,
  settled,
}: {
  hasHash: boolean;
  finalized: boolean;
  callStatus?: "success" | "failure";
  receiptBlock?: string;
  endBlock: bigint;
  settled: boolean;
}): TapAttemptProofStatus | undefined {
  if (!hasHash) return "not-submitted";
  if (finalized) return "finalized";
  if (!settled) return "submitted";
  if (callStatus !== "failure") return undefined;
  return receiptBlock !== undefined && BigInt(receiptBlock) >= endBlock ? "late" : "failed";
}
