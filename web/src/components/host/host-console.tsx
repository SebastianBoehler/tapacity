"use client";

import { useEffect, useState } from "react";
import { useChainState } from "@/lib/contract/use-chain-state";
import { currentPhase } from "@/components/player/round-phase";
import { HostResults } from "./host-results";
import { HostJoin } from "./host-join";
import { HostRoundArchive } from "./host-round-archive";
import { useRoundLatency } from "./use-round-latency";

export function HostConsole({
  contract,
  origin,
  initialRoundId,
}: {
  contract: `0x${string}`;
  origin: string;
  initialRoundId?: string;
}) {
  const [roundInput, setRoundInput] = useState(initialRoundId ?? "");
  const [roundId, setRoundId] = useState<bigint | undefined>(() => initialRoundId ? BigInt(initialRoundId) : undefined);
  const [capacity, setCapacity] = useState(32);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [presenting, setPresenting] = useState(false);

  useEffect(() => {
    if (initialRoundId) {
      localStorage.setItem("tapacity:host-round", initialRoundId);
      return;
    }
    const saved = localStorage.getItem("tapacity:host-round") ?? "";
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setRoundInput(saved);
      if (/^\d+$/.test(saved)) setRoundId(BigInt(saved));
    });
    return () => { active = false; };
  }, [initialRoundId]);

  const rememberRound = (nextRound: bigint) => {
    const value = nextRound.toString();
    setPresenting(false);
    setRoundId(nextRound);
    setRoundInput(value);
    localStorage.setItem("tapacity:host-round", value);
    history.replaceState(null, "", `/host?round=${value}`);
  };

  const action = async (name: "create" | "start" | "settle", target?: bigint) => {
    setBusy(true);
    setError(undefined);
    try {
      const response = await fetch("/api/host", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: name, roundId: target?.toString(), maxPlayers: capacity }),
      });
      const result = await response.json() as { error?: string; roundId?: string };
      if (!response.ok || !result.roundId) throw new Error(result.error ?? "Host action failed");
      const nextRound = BigInt(result.roundId);
      rememberRound(nextRound);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Host action failed");
    } finally {
      setBusy(false);
    }
  };

  const newRound = () => {
    setRoundId(undefined);
    setRoundInput("");
    setPresenting(false);
    localStorage.removeItem("tapacity:host-round");
    history.replaceState(null, "", "/host");
  };

  const openExistingRound = () => {
    if (!/^\d+$/.test(roundInput)) return;
    rememberRound(BigInt(roundInput));
  };

  return (
    <main className={presenting ? "host-screen is-presenting" : "host-screen"}>
      {!presenting && <h1>Run the room.</h1>}
      {!presenting && <div className="host-controls">
        <label htmlFor="capacity">Maximum players<input id="capacity" type="number" min={1} max={32} value={capacity} onChange={(event) => setCapacity(Number(event.target.value))} /></label>
        <button className="primary-button host-create-button" disabled={busy} onClick={() => void action("create")}>{busy ? "Creating onchain lobby…" : "Create new round"}</button>
        <details className="existing-round">
          <summary>Open an existing round</summary>
          <p>Load a previous lobby or result without creating anything onchain.</p>
          <div>
            <label htmlFor="round-id">Round number<input id="round-id" inputMode="numeric" value={roundInput} onChange={(event) => setRoundInput(event.target.value)} /></label>
            <button className="secondary-button host-secondary" disabled={!/^\d+$/.test(roundInput)} onClick={openExistingRound}>Load round</button>
          </div>
        </details>
      </div>}
      {roundId && <HostRound contract={contract} origin={origin} roundId={roundId} busy={busy} action={action} onPresenting={setPresenting} onNewRound={newRound} />}
      {!roundId && <HostRoundArchive contract={contract} onOpen={rememberRound} />}
      {error && <p className="error-note" role="alert">{error}</p>}
    </main>
  );
}

function HostRound({
  contract,
  origin,
  roundId,
  busy,
  action,
  onPresenting,
  onNewRound,
}: {
  contract: `0x${string}`;
  origin: string;
  roundId: bigint;
  busy: boolean;
  action: (name: "create" | "start" | "settle", target?: bigint) => Promise<void>;
  onPresenting: (presenting: boolean) => void;
  onNewRound: () => void;
}) {
  const { blockNumber, round, ranking, error } = useChainState(contract, roundId);
  const medianFinalityMs = useRoundLatency(contract, roundId);
  useEffect(() => onPresenting(Boolean(round?.settled)), [onPresenting, round?.settled]);
  if (error && !round) return <p className="error-note">{error}</p>;
  if (!blockNumber || !round) return <p className="host-status">Syncing round {roundId.toString()}…</p>;
  if (round.creator === "0x0000000000000000000000000000000000000000") return <p className="error-note" role="alert">Round {roundId.toString()} does not exist on this contract.</p>;
  if (round.settled) return <HostResults contract={contract} roundId={roundId} round={round} ranking={ranking} medianFinalityMs={medianFinalityMs} onNewRound={onNewRound} />;
  const phase = currentPhase(blockNumber, round);
  return (
    <section className="host-round">
      <div className="host-room-head"><h2>Round {roundId.toString()}</h2><strong>{label(phase)}</strong></div>
      <div className="host-metrics"><HostMetric label="Joined" value={round.playerCount.toString()} /><HostMetric label="Capacity" value={round.maxPlayers.toString()} /><HostMetric label="Tap gas" value="Sponsored" /></div>
      <HostJoin origin={origin} roundId={roundId} />
      {phase === "waiting" && <button className="primary-button" disabled={busy || round.playerCount === 0} onClick={() => void action("start", roundId)}>Start shared countdown</button>}
      {phase === "lobby" && <p className="host-round-status">Countdown running on player devices.</p>}
      {phase === "live" && <p className="host-round-status">Round live on {round.playerCount} player device{round.playerCount === 1 ? "" : "s"}.</p>}
      {phase === "reveal" && <p className="host-round-status">Players are revealing goals automatically.</p>}
      {phase === "settlement" && !round.settled && <button className="primary-button" disabled={busy} onClick={() => void action("settle", roundId)}>Settle results</button>}
    </section>
  );
}

function HostMetric({ label, value }: { label: string; value: string }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}

function label(phase: string) {
  return { waiting: "LOBBY OPEN", lobby: "COUNTDOWN", live: "ROUND LIVE", reveal: "REVEAL", settlement: "SETTLEMENT" }[phase];
}
