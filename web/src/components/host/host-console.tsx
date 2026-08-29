"use client";

import { useState } from "react";
import { useChainState } from "@/lib/contract/use-chain-state";
import { currentPhase } from "@/components/player/round-phase";

export function HostConsole({ contract }: { contract: `0x${string}` }) {
  const [hostKey, setHostKey] = useState(() => readStored("tapacity:host-key", true));
  const [roundInput, setRoundInput] = useState(() => readStored("tapacity:host-round"));
  const [roundId, setRoundId] = useState<bigint | undefined>(() => {
    const saved = readStored("tapacity:host-round");
    return /^\d+$/.test(saved) ? BigInt(saved) : undefined;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const action = async (name: "create" | "start" | "settle", target?: bigint) => {
    setBusy(true);
    setError(undefined);
    sessionStorage.setItem("tapacity:host-key", hostKey);
    try {
      const response = await fetch("/api/host", {
        method: "POST",
        headers: { authorization: `Bearer ${hostKey}`, "content-type": "application/json" },
        body: JSON.stringify({ action: name, roundId: target?.toString() }),
      });
      const result = await response.json() as { error?: string; roundId?: string };
      if (!response.ok || !result.roundId) throw new Error(result.error ?? "Host action failed");
      const nextRound = BigInt(result.roundId);
      setRoundId(nextRound);
      setRoundInput(result.roundId);
      localStorage.setItem("tapacity:host-round", result.roundId);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Host action failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="host-screen">
      <header><b>TAPACITY HOST</b><span>Monad Testnet</span></header>
      <h1>Run the room.</h1>
      <div className="host-controls">
        <label htmlFor="host-key">Host key<input id="host-key" type="password" value={hostKey} onChange={(event) => setHostKey(event.target.value)} /></label>
        <button className="primary-button" disabled={busy || !hostKey} onClick={() => void action("create")}>{busy ? "Finalizing…" : "Create round"}</button>
        <label htmlFor="round-id">Round number<input id="round-id" inputMode="numeric" value={roundInput} onChange={(event) => setRoundInput(event.target.value)} /></label>
        <button className="secondary-button host-secondary" disabled={!/^\d+$/.test(roundInput)} onClick={() => setRoundId(BigInt(roundInput))}>Open round</button>
      </div>
      {roundId && <HostRound contract={contract} roundId={roundId} busy={busy} action={action} />}
      {error && <p className="error-note" role="alert">{error}</p>}
    </main>
  );
}

function HostRound({
  contract,
  roundId,
  busy,
  action,
}: {
  contract: `0x${string}`;
  roundId: bigint;
  busy: boolean;
  action: (name: "create" | "start" | "settle", target?: bigint) => Promise<void>;
}) {
  const { blockNumber, round, error } = useChainState(contract, roundId);
  if (error && !round) return <p className="error-note">{error}</p>;
  if (!blockNumber || !round) return <p className="host-status">Syncing round {roundId.toString()}…</p>;
  const phase = currentPhase(blockNumber, round);
  const joinPath = `/?round=${roundId}`;
  return (
    <section className="host-round">
      <div className="host-room-head"><h2>Round {roundId.toString()}</h2><strong>{label(phase)}</strong></div>
      <div className="host-metrics"><HostMetric label="Joined" value={`${round.playerCount}/${round.maxPlayers}`} /><HostMetric label="Block" value={blockNumber.toString()} /><HostMetric label="Grant" value={`${Number(round.tapGrantWei / 10n ** 15n) / 1000} MON`} /></div>
      <label htmlFor="join-url">Join link<input id="join-url" readOnly value={joinPath} /></label>
      <button className="secondary-button host-secondary" onClick={() => void navigator.clipboard.writeText(new URL(joinPath, window.location.origin).toString())}>Copy join link</button>
      {phase === "waiting" && <button className="primary-button" disabled={busy || round.playerCount === 0} onClick={() => void action("start", roundId)}>Start shared countdown</button>}
      {phase === "lobby" && <p className="host-countdown">{secondsUntil(round.startBlock, blockNumber)}s</p>}
      {phase === "live" && <p className="host-countdown">{secondsUntil(round.endBlock, blockNumber)}s</p>}
      {phase === "settlement" && !round.settled && <button className="primary-button" disabled={busy} onClick={() => void action("settle", roundId)}>Settle results</button>}
      {round.settled && <p className="host-status">Settled · {round.totalTaps.toString()} finalized taps</p>}
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
