"use client";

import { useSendTransaction } from "@privy-io/react-auth";
import { type CSSProperties, type Dispatch, type SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { encodeFunctionData } from "viem";
import { tapacityAbi } from "@/lib/contract/abi";
import { type PlayerState, type RoundState, useChainState } from "@/lib/contract/use-chain-state";
import { useTapCommitments } from "@/lib/feed/use-tap-commitments";
import {
  createGoalSession,
  goalCommitment,
  loadGoalSession,
  nicknameBytes,
  saveGoalSession,
  sessionKey,
  type GoalSession,
} from "@/lib/session/goal-session";
import { useFinalityPersistence } from "@/lib/session/use-finality-persistence";
import { fallbackPlayerName, playerLaneColor } from "@/lib/round/live-race";
import { retryRateLimited } from "@/lib/transactions/retry-rate-limit";
import { sponsoredAccountAddress } from "@/lib/transactions/alchemy-smart-account";
import { useSponsoredTapSubmitter } from "@/lib/transactions/use-sponsored-tap-submitter";
import { useTapOutcomes } from "@/lib/transactions/use-tap-outcomes";
import { Chainprint } from "./chainprint";
import { PlayerPressureZone } from "./player-pressure-zone";
import { PlayerSetup } from "./player-setup";
import { Header, Metric, StatusScreen } from "./player-ui";
import { currentPhase, phaseLabel } from "./round-phase";
import { TransactionTrack } from "./transaction-track";
import { useRoundAudio } from "./use-round-audio";

export function ConnectedGame({
  contract,
  roundId,
  address,
  alchemyApiKey,
  alchemyPolicyId,
}: {
  contract: `0x${string}`;
  roundId: bigint;
  address: `0x${string}`;
  alchemyApiKey: string;
  alchemyPolicyId: string;
}) {
  const key = useMemo(() => sessionKey(contract, roundId, address), [address, contract, roundId]);
  const [session, setSession] = useState<GoalSession | null>(() => loadGoalSession(key));
  const playerAddress = session?.tapperAddress ?? address;
  const chain = useChainState(contract, roundId, playerAddress);
  if (chain.error && !chain.round) return <StatusScreen label="Unable to read the round" detail={chain.error} />;
  if (!chain.round || !chain.blockNumber) return <StatusScreen label="Syncing finalized round state" />;
  if (chain.round.creator === "0x0000000000000000000000000000000000000000") {
    return <StatusScreen label="Round does not exist" />;
  }
  return (
    <RoundGame
      key={`${contract}:${roundId}:${address}`}
      contract={contract}
      roundId={roundId}
      address={playerAddress}
      controller={address}
      storageKey={key}
      session={session}
      setSession={setSession}
      blockNumber={chain.blockNumber}
      round={chain.round}
      player={chain.playerState}
      ranking={chain.ranking}
      alchemyApiKey={alchemyApiKey}
      alchemyPolicyId={alchemyPolicyId}
    />
  );
}

function RoundGame({
  contract,
  roundId,
  address,
  controller,
  storageKey,
  session,
  setSession,
  blockNumber,
  round,
  player,
  ranking,
  alchemyApiKey,
  alchemyPolicyId,
}: {
  contract: `0x${string}`;
  roundId: bigint;
  address: `0x${string}`;
  controller: `0x${string}`;
  storageKey: string;
  session: GoalSession | null;
  setSession: Dispatch<SetStateAction<GoalSession | null>>;
  blockNumber: bigint;
  round: RoundState;
  player?: PlayerState;
  ranking: readonly `0x${string}`[];
  alchemyApiKey: string;
  alchemyPolicyId: string;
}) {
  const { sendTransaction } = useSendTransaction();
  const [goal, setGoal] = useState(50);
  const [nickname, setNickname] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const revealStarted = useRef(false);
  const attempt = useRef(session?.attempted ?? 0);
  const feed = useTapCommitments(contract, address, roundId, round.startBlock, round.endBlock);
  const phase = currentPhase(blockNumber, round);
  useRoundAudio(phase);
  const sponsor = useCallback(
    (data: `0x${string}`, gasLimit: bigint) => sendTransaction(
      { to: contract, value: 0n, gasLimit, data },
      { address: controller, sponsor: true, uiOptions: { showWalletUIs: false } },
    ),
    [contract, controller, sendTransaction],
  );

  const persist = useCallback(
    (update: (current: GoalSession) => GoalSession) => {
      setSession((current) => {
        if (!current) return current;
        const next = update(current);
        saveGoalSession(storageKey, next);
        return next;
      });
    },
    [setSession, storageKey],
  );

  useFinalityPersistence(feed.finalizedTransactions, persist);
  const proofComplete = round.settled && feed.finalizedTransactions.length >= (player?.taps ?? 0);
  const outcomes = useTapOutcomes(session?.attempts ?? NO_ATTEMPTS, feed.finalizedTransactions, round.endBlock, proofComplete);
  const submitter = useSponsoredTapSubmitter({ apiKey: alchemyApiKey, contract, policyId: alchemyPolicyId, session });

  useEffect(() => {
    if (phase !== "live") submitter?.cancelPending("Tap window closed before submission");
  }, [phase, submitter]);

  useEffect(() => {
    if (!submitter || !player?.joined || (phase !== "waiting" && phase !== "lobby")) return;
    void submitter.prepare().catch((cause) => setError(`Tap signer unavailable: ${message(cause)}`));
  }, [phase, player?.joined, submitter]);

  const join = async () => {
    if (goal < 1 || goal > 200) {
      setError("Choose a goal from 1 to 200 taps.");
      return;
    }
    if (round.startBlock !== 0n) return;
    setBusy(true);
    setError(undefined);
    const draft = session ?? createGoalSession(goal, nickname.trim());
    try {
      const tapperAddress = await sponsoredAccountAddress({
        apiKey: alchemyApiKey,
        policyId: alchemyPolicyId,
        privateKey: draft.tapPrivateKey,
      });
      const next = { ...draft, tapperAddress };
      saveGoalSession(storageKey, next);
      setSession(next);
      const { hash } = await sponsor(
        encodeFunctionData({
          abi: tapacityAbi,
          functionName: "joinRound",
          args: [roundId, next.tapperAddress, goalCommitment(roundId, next.tapperAddress, next.goal, next.salt), nicknameBytes(next.nickname)],
        }),
        180_000n,
      );
      const saved = { ...next, joinHash: hash };
      saveGoalSession(storageKey, saved);
      setSession(saved);
    } catch (cause) {
      setError(message(cause));
    } finally {
      setBusy(false);
    }
  };

  const reveal = useCallback(async () => {
    if (!session || !player?.joined || player.revealed || revealStarted.current) return;
    revealStarted.current = true;
    try {
      await retryRateLimited(() => sponsor(
        encodeFunctionData({
          abi: tapacityAbi,
          functionName: "revealGoal",
          args: [roundId, address, session.goal, session.salt],
        }),
        120_000n,
      ),
      );
    } catch (cause) {
      revealStarted.current = false;
      setError(`Automatic reveal failed: ${message(cause)}`);
    }
  }, [address, player, roundId, session, sponsor]);

  useEffect(() => {
    if (phase !== "reveal") return;
    const task = window.setTimeout(() => void reveal(), 0);
    return () => window.clearTimeout(task);
  }, [phase, reveal]);

  const tap = () => {
    if (phase !== "live" || !player?.joined || !session || !submitter) return;
    const attemptId = `${roundId}:${address}:${++attempt.current}`;
    const attemptedAt = Date.now();
    persist((current) => ({
      ...current,
      attempted: current.attempted + 1,
      attempts: [...current.attempts, { id: attemptId, attemptedAt }],
    }));
    void submitter.submitTap(roundId, attemptId).then((result) => {
      persist((current) => {
        const attempts = current.attempts.map((item) => item.id === attemptId
          ? result.status === "submitted"
            ? {
                ...item,
                submittedAt: Date.now(),
                hash: result.hash,
                callId: result.callId,
                callStatus: result.callStatus,
                receiptBlock: result.receiptBlock,
              }
            : { ...item, failure: result.error }
          : item);
        return result.status === "submitted"
          ? { ...current, attempts, submitted: current.submitted + 1, hashes: [...current.hashes, result.hash] }
          : { ...current, attempts, failed: current.failed + 1 };
      });
    });
  };

  if (player?.joined && !session) {
    return <StatusScreen label="Local reveal secret missing" detail="This goal cannot be recovered from a server." />;
  }
  if (round.settled && session && player) {
    return <Chainprint address={address} session={session} player={player} ranking={ranking} finalized={feed.finalizedTransactions} outcomes={outcomes} />;
  }
  if (!player?.joined) {
    return <PlayerSetup roundId={roundId} feed={feed.connection} round={round} goal={goal} nickname={nickname} busy={busy} session={session} error={error} onGoal={setGoal} onNickname={setNickname} onJoin={() => void join()} />;
  }

  const finalized = Math.max(feed.finalized, player.taps);
  const voted = Math.max(feed.voted, finalized);
  const proposed = Math.max(feed.proposed, voted);
  const laneColor = playerLaneColor(address);
  const laneName = session?.nickname.trim() || fallbackPlayerName(address);
  const laneStyle = { "--lane-color": laneColor } as CSSProperties;
  return (
    <main className={`play-screen ${phase === "live" ? "is-live" : ""}`}>
      <h1 className="sr-only">TAPACITY round {roundId.toString()}</h1>
      <Header roundId={roundId} feed={feed.connection} />
      <section className="phase-panel">
        <div>
          <h2>{phaseLabel(phase)}</h2>
          <span className="player-lane-cue" style={laneStyle}><i aria-hidden="true" />Your lane · {laneName}</span>
        </div>
        <strong>{phase === "waiting" ? `${round.playerCount} JOINED` : phase === "lobby" ? "GET READY" : phase === "live" ? `${secondsUntil(round.endBlock, blockNumber)}s` : "—"}</strong>
      </section>
      {session && <TransactionTrack goal={session.goal} attempted={session.attempted} proposed={proposed} finalized={finalized} />}
      <div className="telemetry-row" aria-label="Transaction telemetry">
        <Metric label="ATT" value={session?.attempted ?? 0} />
        <Metric label="SUB" value={session?.submitted ?? 0} />
        <Metric label="PROP" value={proposed} />
        <Metric label="VOTE" value={voted} />
        <Metric label="FINAL" value={finalized} />
      </div>
      {error && <p className="error-note" role="alert">{error}</p>}
      {phase === "reveal" && !player.revealed && <button className="secondary-button" onClick={() => void reveal()}>Retry sponsored reveal</button>}
      <PlayerPressureZone phase={phase} startBlock={round.startBlock} blockNumber={blockNumber} laneColor={laneColor} onTap={tap} />
    </main>
  );
}

function message(cause: unknown) {
  return cause instanceof Error ? cause.message : "Transaction failed";
}

function secondsUntil(target: bigint, block: bigint) {
  return Math.max(0, Number(target - block) * 0.4).toFixed(1);
}

const NO_ATTEMPTS: GoalSession["attempts"] = [];
