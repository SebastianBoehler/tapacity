"use client";

import { useEffect, useMemo, useState } from "react";
import { decodeEventLog, getAddress, parseAbiItem } from "viem";
import { monadWebSocketUrl, publicClient } from "@/lib/chain";
import { tapacityAbi } from "@/lib/contract/abi";
import { operationId } from "@/lib/proof/tap-proof";
import {
  advanceTapState,
  commitmentRank,
  pruneSupersededTapStates,
  type TapCommitmentState,
} from "./commitment-tracker";
import { subscribeMonadHeads } from "./monad-heads";
import { subscribeMonadLogs } from "./monad-logs";

export function useTapCommitments(
  contract: `0x${string}`,
  player: `0x${string}`,
  roundId: bigint,
  startBlock: bigint,
  endBlock: bigint,
) {
  const [connection, setConnection] = useState<"connecting" | "live" | "offline">("connecting");
  const [taps, setTaps] = useState<Map<string, TrackedTap>>(new Map());

  useEffect(() => {
    if (startBlock === 0n || endBlock === 0n) return;
    let active = true;
    void publicClient.getBlock({ blockTag: "finalized" }).then(async ({ number: finalizedBlock }) => {
      const toBlock = finalizedBlock < endBlock ? finalizedBlock : endBlock - 1n;
      if (!active || toBlock < startBlock) return;
      const logs = await publicClient.getLogs({
        address: contract,
        event: parseAbiItem(
          "event TapRecorded(uint256 indexed roundId, address indexed player, uint32 tapNumber)",
        ),
        args: { roundId, player },
        fromBlock: startBlock,
        toBlock,
      });
      if (!active) return;
      setTaps((current) => {
        const next = new Map(current);
        for (const log of logs) {
          if (log.logIndex === null || log.args.tapNumber === undefined || log.args.player === undefined) continue;
          const id = operationId(log.transactionHash, log.logIndex);
          if (!next.has(id)) {
            next.set(id, {
              hash: log.transactionHash,
              logIndex: log.logIndex,
              player: log.args.player,
              tapNumber: log.args.tapNumber,
              blockId: log.blockHash,
              blockNumber: `0x${log.blockNumber.toString(16)}`,
              commitState: "Finalized",
            });
          }
        }
        return next;
      });
    }).catch(() => {
      if (active) setConnection("offline");
    });
    const unsubscribe = subscribeMonadLogs({
      url: monadWebSocketUrl,
      address: contract,
      onStatus: setConnection,
      onLog: (log) => {
        try {
          const decoded = decodeEventLog({ abi: tapacityAbi, data: log.data, topics: log.topics });
          if (decoded.eventName !== "TapRecorded") return;
          const args = decoded.args;
          if (args.roundId !== roundId || getAddress(args.player) !== getAddress(player)) return;
          const logIndex = Number(BigInt(log.logIndex));
          const id = operationId(log.transactionHash, logIndex);
          setTaps((current) => {
            const next = new Map(current);
            const previous = next.get(id);
            next.set(
              id,
              {
                ...advanceTapState(previous, {
                blockId: log.blockId,
                blockNumber: log.blockNumber,
                commitState: log.commitState,
                finalizedAt: commitmentRank(log.commitState) >= 2
                  ? previous?.finalizedAt ?? Date.now()
                  : previous?.finalizedAt,
                }),
                hash: log.transactionHash,
                logIndex,
                player: args.player,
                tapNumber: args.tapNumber,
              },
            );
            return next;
          });
        } catch {
          // Other TAPACITY events share this filtered subscription.
        }
      },
    });
    const unsubscribeHeads = subscribeMonadHeads({
      url: monadWebSocketUrl,
      onHead: (head) => setTaps((current) => pruneSupersededTapStates(current, {
        blockId: head.blockId,
        blockNumber: head.number,
        commitState: head.commitState,
      })),
    });
    return () => {
      active = false;
      unsubscribe();
      unsubscribeHeads();
    };
  }, [contract, endBlock, player, roundId, startBlock]);

  return useMemo(() => {
    const states = [...taps.values()];
    return {
      connection,
      proposed: states.length,
      voted: states.filter((tap) => commitmentRank(tap.commitState) >= 1).length,
      finalized: states.filter((tap) => commitmentRank(tap.commitState) >= 2).length,
      finalizedTransactions: [...taps.values()].filter((tap) => commitmentRank(tap.commitState) >= 2),
    };
  }, [connection, taps]);
}

export type TrackedTap = TapCommitmentState & {
  hash: `0x${string}`;
  logIndex: number;
  player: `0x${string}`;
  tapNumber: number;
};
