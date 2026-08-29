"use client";

import { useEffect, useState } from "react";
import { publicClient } from "@/lib/chain";
import type { TrackedTap } from "@/lib/feed/use-tap-commitments";
import { knownAttemptStatus, type TapAttemptProofStatus } from "@/lib/proof/tap-proof";
import type { TapAttempt } from "@/lib/session/goal-session";

export type TapAttemptOutcome = TapAttempt & { status: TapAttemptProofStatus };
export type TapOutcomes = { late: number; failed: number; attempts: TapAttemptOutcome[] };

export function useTapOutcomes(
  attempts: TapAttempt[],
  finalized: TrackedTap[],
  endBlock: bigint,
  enabled: boolean,
) {
  const [outcomes, setOutcomes] = useState<TapOutcomes>();

  useEffect(() => {
    let active = true;
    const remaining = countFinalized(finalized);
    void (async () => {
      const classified: TapAttemptOutcome[] = [];
      for (const attempt of attempts) {
        const finalizedAttempt = attempt.hash ? claimFinalized(remaining, attempt.hash) : false;
        const known = knownAttemptStatus({
          hasHash: Boolean(attempt.hash),
          finalized: finalizedAttempt,
          callStatus: attempt.callStatus,
          receiptBlock: attempt.receiptBlock,
          endBlock,
          settled: enabled,
        });
        const status = known ?? (attempt.hash ? await legacyOutcome(attempt.hash, endBlock) : "not-submitted");
        classified.push({ ...attempt, status });
      }
      if (active) setOutcomes({
        attempts: classified,
        late: classified.filter((attempt) => attempt.status === "late").length,
        failed: classified.filter((attempt) => attempt.status === "failed").length,
      });
    })();
    return () => { active = false; };
  }, [attempts, enabled, endBlock, finalized]);

  return outcomes;
}

function countFinalized(finalized: TrackedTap[]) {
  const counts = new Map<string, number>();
  for (const tap of finalized) {
    const hash = tap.hash.toLowerCase();
    counts.set(hash, (counts.get(hash) ?? 0) + 1);
  }
  return counts;
}

function claimFinalized(counts: Map<string, number>, hash: `0x${string}`) {
  const key = hash.toLowerCase();
  const count = counts.get(key) ?? 0;
  if (count === 0) return false;
  counts.set(key, count - 1);
  return true;
}

async function legacyOutcome(hash: `0x${string}`, endBlock: bigint): Promise<TapAttemptProofStatus> {
  try {
    const receipt = await publicClient.getTransactionReceipt({ hash });
    return receipt.blockNumber >= endBlock ? "late" : "failed";
  } catch {
    return "failed";
  }
}
