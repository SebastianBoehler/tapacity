"use client";

import { getEmbeddedConnectedWallet, useGuestAccounts, usePrivy, useSendTransaction, useWallets } from "@privy-io/react-auth";
import { type Dispatch, type SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { retryRateLimited } from "@/lib/transactions/retry-rate-limit";
import { useRawTapSubmitter } from "@/lib/transactions/use-raw-tap-submitter";
import { useTapOutcomes } from "@/lib/transactions/use-tap-outcomes";
import { Chainprint } from "./chainprint";
import { Header, Metric, StatusScreen } from "./player-ui";
import { currentPhase, phaseLabel } from "./round-phase";
import { TransactionTrack } from "./transaction-track";

export function PlayerGame({ contract, roundId }: { contract: `0x${string}`; roundId: bigint }) {
  const { ready, authenticated } = usePrivy();
  const { createGuestAccount } = useGuestAccounts();
  const { wallets } = useWallets();
  const [error, setError] = useState<string>();
  const wallet = getEmbeddedConnectedWallet(wallets);

  if (!ready) return <StatusScreen label="Initializing guest wallet" />;
  if (!authenticated) {
    return (
      <main className="entry-screen">
        <h1>TAPACITY</h1>
        <p className="lead">Round {roundId.toString()} on Monad Testnet. Predict your output, then turn every accepted tap into a direct transaction.</p>
        <button
          className="primary-button"
          onClick={() => void createGuestAccount().catch((cause) => setError(message(cause)))}
        >
          Continue as guest
        </button>
        <p className="cost-note">No wallet extension. No MON. You never pay gas.</p>
        {error && <p className="error-note" role="alert">{error}</p>}
      </main>
    );
  }
  if (!wallet) return <StatusScreen label="Creating embedded wallet" />;

  return <ConnectedGame contract={contract} roundId={roundId} address={wallet.address as `0x${string}`} />;
}

function ConnectedGame({
  contract,
  roundId,
  address,
}: {
  contract: `0x${string}`;
  roundId: bigint;
  address: `0x${string}`;
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
  const outcomes = useTapOutcomes(session?.hashes ?? [], feed.finalizedTransactions, round.endBlock, round.settled);
  const submitter = useRawTapSubmitter(contract, session);

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
    const next = session ?? createGoalSession(goal, nickname.trim());
    try {
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
          ? { ...item, submittedAt: Date.now(), hash: result.status === "submitted" ? result.hash : undefined }
          : item);
        return result.status === "submitted"
          ? { ...current, attempts, submitted: current.submitted + 1, hashes: [...current.hashes, result.hash] }
          : { ...current, attempts, failed: current.failed + 1 };
      });
    });
  };

  const settle = async () => {
    setBusy(true);
    setError(undefined);
    try {
      await sponsor(
        encodeFunctionData({ abi: tapacityAbi, functionName: "settleRound", args: [roundId] }),
        1_500_000n,
      );
    } catch (cause) {
      setError(`Settlement failed: ${message(cause)}`);
    } finally {
      setBusy(false);
    }
  };

  if (player?.joined && !session) {
    return <StatusScreen label="Local reveal secret missing" detail="This goal cannot be recovered from a server." />;
  }
  if (round.settled && session && player) {
    return <Chainprint address={address} session={session} player={player} ranking={ranking} finalized={feed.finalizedTransactions} outcomes={outcomes} />;
  }
  if (!player?.joined) {
    return (
      <main className="setup-screen">
        <Header roundId={roundId} feed={feed.connection} />
        <h1>Predict your taps.</h1>
        <p className="cost-note">{round.playerCount}/{round.maxPlayers} players joined · host starts the shared round</p>
        <form className="setup-form" onSubmit={(event) => { event.preventDefault(); void join(); }}>
          <label htmlFor="goal">Goal<input id="goal" name="goal" type="number" inputMode="numeric" min={1} max={200} required value={goal} onChange={(event) => setGoal(Number(event.target.value))} /></label>
          <label htmlFor="nickname">Nickname · optional<input id="nickname" name="nickname" autoComplete="nickname" maxLength={16} value={nickname} onChange={(event) => setNickname(event.target.value)} /></label>
          <button type="submit" className="primary-button" disabled={busy || round.startBlock !== 0n}>
            {busy ? "Sponsoring commitment…" : session ? "Resubmit commitment" : "Lock goal"}
          </button>
        </form>
        <p className="cost-note">App-sponsored. Zero value. Your goal stays hidden until reveal.</p>
        {error && <p className="error-note" role="alert">{error}</p>}
      </main>
    );
  }

  const finalized = Math.max(feed.finalized, player.taps);
  const voted = Math.max(feed.voted, finalized);
  const proposed = Math.max(feed.proposed, voted);
  return (
    <main className={`play-screen ${phase === "live" ? "is-live" : ""}`}>
      <h1 className="sr-only">TAPACITY round {roundId.toString()}</h1>
      <Header roundId={roundId} feed={feed.connection} />
      <section className="phase-panel">
        <h2>{phaseLabel(phase)}</h2>
        <strong>{phase === "waiting" ? `${round.playerCount}/${round.maxPlayers} JOINED` : phase === "lobby" ? `${round.startBlock - blockNumber} BLOCKS` : phase === "live" ? `${round.endBlock - blockNumber} BLOCKS` : "—"}</strong>
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
      {phase === "settlement" && <button className="secondary-button" disabled={busy} onClick={() => void settle()}>{busy ? "Settling…" : "Settle results · sponsored"}</button>}
      <button
        className="tap-zone"
        disabled={phase !== "live"}
        onPointerDown={(event) => { event.preventDefault(); tap(); }}
        onKeyDown={(event) => { if (event.key === " " || event.key === "Enter") { event.preventDefault(); tap(); } }}
      >
        <span>{phase === "live" ? "Tap" : phase === "waiting" ? "Waiting" : phase === "lobby" ? "Armed" : "Locked"}</span>
        <small>One accepted tap · one direct Monad transaction</small>
      </button>
    </main>
  );
}

function message(cause: unknown) {
  return cause instanceof Error ? cause.message : "Transaction failed";
}
