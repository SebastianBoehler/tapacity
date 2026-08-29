"use client";

import { useEffect } from "react";
import type { TapCommitmentState } from "@/lib/feed/commitment-tracker";
import type { GoalSession } from "./goal-session";

type FinalizedTap = TapCommitmentState & { hash: `0x${string}` };

export function useFinalityPersistence(
  finalized: FinalizedTap[],
  persist: (update: (current: GoalSession) => GoalSession) => void,
) {
  useEffect(() => {
    const observed = finalized.filter((tap) => tap.finalizedAt && tap.blockNumber);
    if (observed.length === 0) return;
    const task = window.setTimeout(() => persist((current) => {
      const finality = { ...current.finality };
      let changed = false;
      for (const tap of observed) {
        if (!finality[tap.hash] && tap.finalizedAt && tap.blockNumber) {
          finality[tap.hash] = { observedAt: tap.finalizedAt, blockNumber: tap.blockNumber };
          changed = true;
        }
      }
      return changed ? { ...current, finality } : current;
    }), 0);
    return () => window.clearTimeout(task);
  }, [finalized, persist]);
}
