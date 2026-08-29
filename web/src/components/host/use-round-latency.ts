"use client";

import { useEffect, useMemo, useState } from "react";
import { decodeEventLog } from "viem";
import { monadWebSocketUrl } from "@/lib/chain";
import { tapacityAbi } from "@/lib/contract/abi";
import { commitmentRank } from "@/lib/feed/commitment-tracker";
import { subscribeMonadLogs } from "@/lib/feed/monad-logs";
import { operationId } from "@/lib/proof/tap-proof";
import { medianFinalityMs, type LatencyObservation } from "@/lib/round/round-latency";

export function useRoundLatency(contract: `0x${string}`, roundId: bigint) {
  const [observations, setObservations] = useState<Record<string, LatencyObservation>>({});

  useEffect(() => {
    const storageKey = `tapacity:host-latency:${contract}:${roundId.toString()}`;
    let current = readObservations(storageKey);
    let active = true;
    queueMicrotask(() => {
      if (active) setObservations(current);
    });

    const unsubscribe = subscribeMonadLogs({
      url: monadWebSocketUrl,
      address: contract,
      onStatus: () => undefined,
      onLog: (log) => {
        try {
          const decoded = decodeEventLog({ abi: tapacityAbi, data: log.data, topics: log.topics });
          if (decoded.eventName !== "TapRecorded" || decoded.args.roundId !== roundId) return;
          const id = operationId(log.transactionHash, Number(BigInt(log.logIndex)));
          const previous = current[id] ?? {};
          const now = Date.now();
          const next = {
            proposedAt: previous.proposedAt ?? (log.commitState === "Proposed" ? now : undefined),
            finalizedAt: previous.finalizedAt ?? (commitmentRank(log.commitState) >= 2 ? now : undefined),
          };
          if (next.proposedAt === previous.proposedAt && next.finalizedAt === previous.finalizedAt) return;
          current = { ...current, [id]: next };
          localStorage.setItem(storageKey, JSON.stringify(current));
          setObservations(current);
        } catch {
          // Other TAPACITY events share this address-filtered subscription.
        }
      },
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [contract, roundId]);

  return useMemo(() => medianFinalityMs(observations), [observations]);
}

function readObservations(storageKey: string): Record<string, LatencyObservation> {
  try {
    return JSON.parse(localStorage.getItem(storageKey) ?? "{}") as Record<string, LatencyObservation>;
  } catch {
    return {};
  }
}
