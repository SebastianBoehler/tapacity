"use client";

import { useEffect, useState } from "react";
import { useChainState } from "@/lib/contract/use-chain-state";
import { currentPhase } from "@/components/player/round-phase";
import { HostResults } from "./host-results";
import { HostJoin } from "./host-join";

export function HostConsole({ contract, origin }: { contract: `0x${string}`; origin: string }) {
  const [hostKey, setHostKey] = useState(() => readStored("tapacity:host-key", true));
  const [roundInput, setRoundInput] = useState(() => readStored("tapacity:host-round"));
  const [roundId, setRoundId] = useState<bigint | undefined>(() => {
    const saved = readStored("tapacity:host-round");
    return /^\d+$/.test(saved) ? BigInt(saved) : undefined;
  });
  const [capacity, setCapacity] = useState(20);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [presenting, setPresenting] = useState(false);

  const action = async (name: "create" | "start" | "settle", target?: bigint) => {
    setBusy(true);
    setError(undefined);
    sessionStorage.setItem("tapacity:host-key", hostKey);
    try {
      const response = await fetch("/api/host", {
        method: "POST",
        headers: { authorization: `Bearer ${hostKey}`, "content-type": "application/json" },
        body: JSON.stringify({ action: name, roundId: target?.toString(), maxPlayers: capacity }),
      });
      const result = await response.json() as { error?: string; roundId?: string };
      if (!response.ok || !result.roundId) throw new Error(result.error ?? "Host action failed");
      const nextRound = BigInt(result.roundId);
      if (name === "create") setPresenting(false);
      setRoundId(nextRound);
      setRoundInput(result.roundId);
      localStorage.setItem("tapacity:host-round", result.roundId);
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
  };

  const openExistingRound = () => {
    if (!/^\d+$/.test(roundInput)) return;
    const nextRound = BigInt(roundInput);
    setPresenting(false);
    setRoundId(nextRound);
    localStorage.setItem("tapacity:host-round", roundInput);
  };

  return (
    <main className={presenting ? "host-screen is-presenting" : "host-screen"}>
      {!presenting && <h1>Run the room.</h1>}
      {!presenting && <div className="host-controls">
        <label htmlFor="host-key">Host key<input id="host-key" type="password" value={hostKey} onChange={(event) => setHostKey(event.target.value)} /></label>
        <label htmlFor="capacity">Maximum players<input id="capacity" type="number" min={1} max={32} value={capacity} onChange={(event) => setCapacity(Number(event.target.value))} /></label>
        <button className="primary-button host-create-button" disabled={busy || !hostKey} onClick={() => void action("create")}>{busy ? "Creating onchain lobby…" : "Create new round"}</button>
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
  useEffect(() => onPresenting(Boolean(round?.settled)), [onPresenting, round?.settled]);
  if (error && !round) return <p className="error-note">{error}</p>;
  if (!blockNumber || !round) return <p className="host-status">Syncing round {roundId.toString()}…</p>;
  if (round.creator === "0x0000000000000000000000000000000000000000") return <p className="error-note" role="alert">Round {roundId.toString()} does not exist on this contract.</p>;
  if (round.settled) return <HostResults contract={contract} roundId={roundId} round={round} ranking={ranking} onNewRound={onNewRound} />;
  const phase = currentPhase(blockNumber, round);
  return (
    <section className="host-round">
      <div className="host-room-head"><h2>Round {roundId.toString()}</h2><strong>{label(phase)}</strong></div>
      <div className="host-metrics"><HostMetric label="Joined" value={round.playerCount.toString()} /><HostMetric label="Capacity" value={round.maxPlayers.toString()} /><HostMetric label="Tap gas" value="Sponsored" /></div>
      <HostJoin origin={origin} roundId={roundId} />
      {phase === "waiting" && <button className="primary-button" disabled={busy || round.playerCount === 0} onClick={() => void action("start", roundId)}>Start shared countdown</button>}
      {phase === "lobby" && <p className="host-countdown">{secondsUntil(round.startBlock, blockNumber)}s</p>}
      {phase === "live" && <p className="host-countdown">{secondsUntil(round.endBlock, blockNumber)}s</p>}
      {phase === "settlement" && !round.settled && <button className="primary-button" disabled={busy} onClick={() => void action("settle", roundId)}>Settle results</button>}
    </section>
  );
}

function HostMetric({ label, value }: { label: string; value: string }) {
  return <div><span>{label}</span><strong>{value}</strong></div>;
}

function secondsUntil(target: bigint, block: bigint) {
  return Math.max(0, Number(target - block) * 0.4).toFixed(1);
}

function label(phase: string) {
  return { waiting: "LOBBY OPEN", lobby: "COUNTDOWN", live: "ROUND LIVE", reveal: "REVEAL", settlement: "SETTLEMENT" }[phase];
}

function readStored(key: string, session = false) {
  if (typeof window === "undefined") return "";
  return (session ? sessionStorage : localStorage).getItem(key) ?? "";
}
