"use client";

import { useEffect, useState } from "react";
import { publicClient } from "@/lib/chain";
import { tapacityAbi } from "@/lib/contract/abi";
import type { RoundState } from "@/lib/contract/use-chain-state";

export type ArchivedRound = RoundState & { id: bigint };

export function useRoundArchive(contract: `0x${string}`) {
  const [rounds, setRounds] = useState<ArchivedRound[]>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const block = await publicClient.getBlock({ blockTag: "finalized" });
        const count = await publicClient.readContract({
          address: contract,
          abi: tapacityAbi,
          functionName: "roundCount",
          blockNumber: block.number,
        });
        const ids = Array.from({ length: Number(count) }, (_, index) => count - BigInt(index));
        const states = ids.length === 0 ? [] : await publicClient.multicall({
          allowFailure: false,
          blockNumber: block.number,
          contracts: ids.map((id) => ({
            address: contract,
            abi: tapacityAbi,
            functionName: "getRound" as const,
            args: [id] as const,
          })),
        });
        if (!active) return;
        setRounds(states.map((round, index) => ({ ...(round as RoundState), id: ids[index] })));
        setError(undefined);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Round archive unavailable");
      }
    };

    void load();
    return () => { active = false; };
  }, [contract]);

  return { rounds, error };
}
