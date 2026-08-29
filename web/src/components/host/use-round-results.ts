"use client";

import { useEffect, useState } from "react";
import { hexToString } from "viem";
import { tapacityAbi } from "@/lib/contract/abi";
import type { PlayerState, RoundState } from "@/lib/contract/use-chain-state";
import { publicClient } from "@/lib/chain";
import { compareTapProof, operationId, type TapProofRecord } from "@/lib/proof/tap-proof";
import { summarizeRound, type RoundSummary } from "@/lib/round/round-insights";

export type RankedPlayer = {
  address: `0x${string}`;
  name: string;
  finalized: number;
  goal: number;
  accuracyPpm: number;
  score: bigint;
};

export type RoundResults = {
  players: RankedPlayer[];
  summary: RoundSummary;
  taps: TapProofRecord[];
};

export function useRoundResults({
  contract,
  roundId,
  round,
  ranking,
}: {
  contract: `0x${string}`;
  roundId: bigint;
  round: RoundState;
  ranking: readonly `0x${string}`[];
}) {
  const [results, setResults] = useState<RoundResults>();
  const [error, setError] = useState<string>();
  const rankingKey = ranking.join(",");
  const { settled, startBlock, endBlock, revealEndBlock, totalTaps } = round;

  useEffect(() => {
    if (!settled || !rankingKey) return;
    let active = true;
    const load = async () => {
      try {
        const rankedAddresses = rankingKey.split(",") as `0x${string}`[];
        const blockNumbers = range(startBlock, revealEndBlock);
        const [states, logs, chainBlocks] = await Promise.all([
          Promise.all(rankedAddresses.map((address) => publicClient.readContract({
            address: contract,
            abi: tapacityAbi,
            functionName: "getPlayer",
            args: [roundId, address],
            blockTag: "finalized",
          }))),
          publicClient.getContractEvents({
            address: contract,
            abi: tapacityAbi,
            eventName: "TapRecorded",
            args: { roundId },
            fromBlock: startBlock,
            toBlock: endBlock - 1n,
            strict: true,
          }),
          Promise.all(blockNumbers.map((blockNumber) => publicClient.getBlock({ blockNumber, includeTransactions: true }))),
        ]);

        const taps = logs.flatMap((log) => {
          if (log.blockNumber === null || log.logIndex === null || log.args.player === undefined || log.args.tapNumber === undefined) return [];
          return [{
            operationId: operationId(log.transactionHash, log.logIndex),
            tapNumber: log.args.tapNumber,
            player: log.args.player,
            transactionHash: log.transactionHash,
            blockNumber: log.blockNumber,
            logIndex: log.logIndex,
          }];
        }).sort(compareTapProof);
        if (BigInt(taps.length) !== totalTaps) {
          throw new Error(`Finalized log replay returned ${taps.length} of ${totalTaps} taps`);
        }

        const blocks = chainBlocks.map((block) => ({
          number: block.number,
          transactionCount: block.transactions.length,
        }));
        const players = rankedAddresses.map((address, index) => {
          const state = states[index] as PlayerState;
          return {
            address,
            name: displayName(state.nickname, address),
            finalized: state.taps,
            goal: state.goal,
            accuracyPpm: state.accuracyPpm,
            score: state.score,
          };
        });
        const summary = summarizeRound({
          startBlock,
          endBlock,
          acceptedTaps: taps,
          blocks,
          totalGoal: players.reduce((total, player) => total + player.goal, 0),
        });
        if (active) {
          setResults({ players, summary, taps });
          setError(undefined);
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Round reconstruction failed");
      }
    };
    void load();
    return () => { active = false; };
  }, [contract, endBlock, rankingKey, revealEndBlock, roundId, settled, startBlock, totalTaps]);

  return { results, error };
}

function range(start: bigint, end: bigint) {
  return Array.from({ length: Number(end - start) }, (_, index) => start + BigInt(index));
}

function displayName(nickname: `0x${string}`, address: `0x${string}`) {
  try {
    const decoded = hexToString(nickname).replaceAll("\0", "").trim();
    if (decoded) return decoded;
  } catch {
    // A malformed optional nickname still has a deterministic address label.
  }
  return `Guest ${address.slice(2, 6).toUpperCase()}`;
}
