"use client";

import { useEffect, useMemo, useState } from "react";
import { decodeEventLog } from "viem";
import { monadWebSocketUrl, publicClient } from "@/lib/chain";
import { tapacityAbi } from "@/lib/contract/abi";
import { commitmentRank } from "@/lib/feed/commitment-tracker";
import { subscribeMonadLogs } from "@/lib/feed/monad-logs";
import type { FeedStatus } from "@/lib/feed/monad-stream";
import {
  displayPlayerName,
  eventOrder,
  joinRaceLane,
  rankLiveRace,
  recordRaceTap,
  type LiveRaceLane,
} from "@/lib/round/live-race";

const JOIN_LOOKBACK_BLOCKS = 1_000n;

export function useLiveRace({
  contract,
  roundId,
  startBlock,
  endBlock,
}: {
  contract: `0x${string}`;
  roundId: bigint;
  startBlock: bigint;
  endBlock: bigint;
}) {
  const [connection, setConnection] = useState<FeedStatus>("connecting");
  const [lanes, setLanes] = useState<Map<string, LiveRaceLane>>(new Map());

  useEffect(() => {
    if (startBlock === 0n || endBlock <= startBlock) return;
    let active = true;

    const applyJoin = ({
      address,
      nickname,
      blockNumber,
      logIndex,
    }: {
      address: `0x${string}`;
      nickname: `0x${string}`;
      blockNumber: bigint;
      logIndex: number;
    }) => setLanes((current) => joinRaceLane(current, {
      address,
      name: displayPlayerName(nickname, address),
      joinedAt: eventOrder(blockNumber, logIndex),
    }));

    const applyTap = ({
      address,
      tapNumber,
      blockNumber,
      logIndex,
    }: {
      address: `0x${string}`;
      tapNumber: number;
      blockNumber: bigint;
      logIndex: number;
    }) => setLanes((current) => recordRaceTap(current, {
      address,
      tapNumber,
      observedAt: eventOrder(blockNumber, logIndex),
    }));

    const backfill = async () => {
      const { number: finalizedBlock } = await publicClient.getBlock({ blockTag: "finalized" });
      const joinFromBlock = startBlock > JOIN_LOOKBACK_BLOCKS ? startBlock - JOIN_LOOKBACK_BLOCKS : 0n;
      const tapToBlock = finalizedBlock < endBlock ? finalizedBlock : endBlock - 1n;
      const [joins, taps] = await Promise.all([
        publicClient.getContractEvents({
          address: contract,
          abi: tapacityAbi,
          eventName: "GoalCommitted",
          args: { roundId },
          fromBlock: joinFromBlock,
          toBlock: startBlock - 1n,
          strict: true,
        }),
        tapToBlock >= startBlock
          ? publicClient.getContractEvents({
              address: contract,
              abi: tapacityAbi,
              eventName: "TapRecorded",
              args: { roundId },
              fromBlock: startBlock,
              toBlock: tapToBlock,
              strict: true,
            })
          : Promise.resolve([]),
      ]);
      if (!active) return;
      for (const log of joins) {
        if (log.blockNumber === null || log.logIndex === null) continue;
        applyJoin({
          address: log.args.player,
          nickname: log.args.nickname,
          blockNumber: log.blockNumber,
          logIndex: log.logIndex,
        });
      }
      for (const log of taps) {
        if (log.blockNumber === null || log.logIndex === null) continue;
        applyTap({
          address: log.args.player,
          tapNumber: log.args.tapNumber,
          blockNumber: log.blockNumber,
          logIndex: log.logIndex,
        });
      }
    };

    void backfill().catch(() => {
      if (active) setConnection("offline");
    });
    const unsubscribe = subscribeMonadLogs({
      url: monadWebSocketUrl,
      address: contract,
      onStatus: setConnection,
      onLog: (log) => {
        if (commitmentRank(log.commitState) < 2) return;
        try {
          const decoded = decodeEventLog({ abi: tapacityAbi, data: log.data, topics: log.topics });
          const blockNumber = BigInt(log.blockNumber);
          const logIndex = Number(BigInt(log.logIndex));
          if (decoded.eventName === "GoalCommitted" && decoded.args.roundId === roundId) {
            applyJoin({
              address: decoded.args.player,
              nickname: decoded.args.nickname,
              blockNumber,
              logIndex,
            });
          }
          if (decoded.eventName === "TapRecorded" && decoded.args.roundId === roundId) {
            applyTap({
              address: decoded.args.player,
              tapNumber: decoded.args.tapNumber,
              blockNumber,
              logIndex,
            });
          }
        } catch {
          // Other TAPACITY events share the same contract subscription.
        }
      },
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [contract, endBlock, roundId, startBlock]);

  return useMemo(() => ({ connection, lanes: rankLiveRace(lanes.values()) }), [connection, lanes]);
}
