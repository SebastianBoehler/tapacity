"use client";

import { useEffect, useState } from "react";
import { monadWebSocketUrl, publicClient } from "@/lib/chain";
import { subscribeMonadHeads } from "@/lib/feed/monad-heads";
import { tapacityAbi } from "./abi";

export type RoundState = {
  creator: `0x${string}`;
  startBlock: bigint;
  endBlock: bigint;
  revealEndBlock: bigint;
  durationBlocks: number;
  revealBlocks: number;
  maxPlayers: number;
  playerCount: number;
  totalTaps: bigint;
  settled: boolean;
};

export type PlayerState = {
  commitment: `0x${string}`;
  nickname: `0x${string}`;
  taps: number;
  goal: number;
  accuracyPpm: number;
  score: bigint;
  lastTapBlock: bigint;
  joined: boolean;
  revealed: boolean;
  controller: `0x${string}`;
};

export function useChainState(
  contract: `0x${string}`,
  roundId: bigint,
  player?: `0x${string}`,
) {
  const [blockNumber, setBlockNumber] = useState<bigint>();
  const [round, setRound] = useState<RoundState>();
  const [playerState, setPlayerState] = useState<PlayerState>();
  const [ranking, setRanking] = useState<readonly `0x${string}`[]>([]);
  const [error, setError] = useState<string>();

  useEffect(() => {
    let active = true;
    const unsubscribeHeads = subscribeMonadHeads({
      url: monadWebSocketUrl,
      onHead: (head) => {
        if (active && head.commitState === "Finalized") setBlockNumber(BigInt(head.number));
      },
    });
    const refresh = async () => {
      try {
        const [nextBlock, nextRound, nextPlayer] = await Promise.all([
          publicClient.getBlock({ blockTag: "finalized" }),
          publicClient.readContract({
            address: contract,
            abi: tapacityAbi,
            functionName: "getRound",
            args: [roundId],
            blockTag: "finalized",
          }),
          player
            ? publicClient.readContract({
                address: contract,
                abi: tapacityAbi,
                functionName: "getPlayer",
                args: [roundId, player],
                blockTag: "finalized",
              })
            : Promise.resolve(undefined),
        ]);
        if (!active) return;
        setBlockNumber(nextBlock.number);
        setRound(nextRound as RoundState);
        setPlayerState(nextPlayer as PlayerState | undefined);
        setError(undefined);
        if ((nextRound as RoundState).settled) {
          const nextRanking = await publicClient.readContract({
            address: contract,
            abi: tapacityAbi,
            functionName: "getRanking",
            args: [roundId],
            blockTag: "finalized",
          });
          if (active) setRanking(nextRanking);
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Chain read failed");
      }
    };

    void refresh();
    const timer = setInterval(() => void refresh(), 2_000);
    return () => {
      active = false;
      clearInterval(timer);
      unsubscribeHeads();
    };
  }, [contract, player, roundId]);

  return { blockNumber, round, playerState, ranking, error };
}
