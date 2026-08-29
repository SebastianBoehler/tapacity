"use client";

import { useEffect, useState } from "react";
import { publicClient } from "@/lib/chain";

export type TapOutcomes = { late: number; failed: number };

export function useTapOutcomes(
  submitted: `0x${string}`[],
  finalized: { hash: `0x${string}` }[],
  endBlock: bigint,
  enabled: boolean,
) {
  const [outcomes, setOutcomes] = useState<TapOutcomes>();

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const canonical = new Set(finalized.map((tap) => tap.hash.toLowerCase()));
    const missing = submitted.filter((hash) => !canonical.has(hash.toLowerCase()));
    void (async () => {
      let late = 0;
      let failed = 0;
      for (const hash of missing) {
        try {
          const receipt = await publicClient.getTransactionReceipt({ hash });
          if (receipt.status === "reverted" && receipt.blockNumber >= endBlock) late += 1;
          else if (receipt.status === "reverted") failed += 1;
          else failed += 1;
        } catch {
          failed += 1;
        }
      }
      if (active) setOutcomes({ late, failed });
    })();
    return () => {
      active = false;
    };
  }, [enabled, endBlock, finalized, submitted]);

  return outcomes;
}
