"use client";

import { useRoundArchive, type ArchivedRound } from "./use-round-archive";

export function HostRoundArchive({
  contract,
  onOpen,
}: {
  contract: `0x${string}`;
  onOpen: (roundId: bigint) => void;
}) {
  const { rounds, error } = useRoundArchive(contract);
  const latest = rounds?.[0];
  const older = rounds?.slice(1) ?? [];

  return (
    <section className="round-archive" aria-labelledby="round-archive-title">
      <div className="round-archive-heading">
        <h2 id="round-archive-title">Onchain round archive</h2>
        {rounds && <span>{rounds.length} round{rounds.length === 1 ? "" : "s"}</span>}
      </div>
      {error && <p className="error-note" role="alert">Unable to read round archive: {error}</p>}
      {!rounds && !error && <p className="host-status" role="status">Loading rounds from finalized state…</p>}
      {rounds?.length === 0 && <p className="host-status">No rounds have been created yet.</p>}
      {latest && (
        <ol className="round-archive-list">
          <RoundArchiveRow round={latest} onOpen={onOpen} />
        </ol>
      )}
      {older.length > 0 && (
        <details className="round-archive-older">
          <summary>Older rounds <span>{older.length}</span></summary>
          <ol className="round-archive-list">
            {older.map((round) => <RoundArchiveRow key={round.id.toString()} round={round} onOpen={onOpen} older />)}
          </ol>
        </details>
      )}
    </section>
  );
}

function RoundArchiveRow({
  round,
  onOpen,
  older = false,
}: {
  round: ArchivedRound;
  onOpen: (roundId: bigint) => void;
  older?: boolean;
}) {
  return (
    <li className={round.settled ? "is-settled" : undefined}>
      <div className="round-archive-id">
        <strong>Round {round.id.toString()}</strong>
        <span>{status(round, older)}</span>
      </div>
      <div className="round-archive-metrics">
        <span>{round.playerCount} joined</span>
        {round.settled && <span>{round.totalTaps.toLocaleString()} finalized</span>}
      </div>
      <button className="secondary-button" onClick={() => onOpen(round.id)}>
        {round.settled ? "Open final view" : older ? "Inspect round" : "Open round"}
      </button>
    </li>
  );
}

function status(round: ArchivedRound, older: boolean) {
  if (round.settled) return "Results ready";
  if (round.startBlock === 0n) return older ? "Older lobby" : "Lobby open";
  return older ? "Older round" : "In progress";
}
