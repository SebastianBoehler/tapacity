import type { TapAttemptProofStatus } from "@/lib/proof/tap-proof";
import type { TapOutcomes } from "@/lib/transactions/use-tap-outcomes";

export function PlayerTapLedger({ outcomes }: { outcomes?: TapOutcomes }) {
  if (!outcomes) return <p className="proof-loading" role="status">Reconstructing every tap attempt…</p>;
  const finalized = outcomes.attempts.filter((attempt) => attempt.status === "finalized").length;
  const outerTransactions = new Set(outcomes.attempts.flatMap((attempt) => attempt.hash ? [attempt.hash.toLowerCase()] : [])).size;

  return (
    <section className="proof-ledger" aria-labelledby="player-proof-title">
      <div className="proof-heading">
        <h2 id="player-proof-title">Every tap</h2>
        <strong>{finalized}/{outcomes.attempts.length} finalized</strong>
      </div>
      <p className="proof-note">One row per physical tap. Repeated hashes mean separately signed operations shared one outer Monad transaction.</p>
      <p className="proof-count">{outcomes.attempts.length} attempts · {outerTransactions} explorer transactions</p>
      <ol className="proof-list">
        {outcomes.attempts.map((attempt, index) => (
          <li key={attempt.id}>
            <span className="proof-index">Tap {index + 1}</span>
            <span className={`proof-status is-${attempt.status}`}>{statusLabel(attempt.status)}</span>
            {attempt.callId && <span className="proof-operation" title={attempt.callId}>Op {shortHash(attempt.callId)}</span>}
            {attempt.hash
              ? <a href={explorerUrl(attempt.hash)} target="_blank" rel="noreferrer" aria-label={`Open outer transaction for tap ${index + 1} in Monad Explorer`}>{shortHash(attempt.hash)} ↗</a>
              : <span className="proof-no-hash">No transaction hash</span>}
          </li>
        ))}
      </ol>
    </section>
  );
}

function statusLabel(status: TapAttemptProofStatus) {
  return {
    finalized: "Finalized",
    submitted: "Submitted",
    late: "Late",
    failed: "Failed",
    "not-submitted": "Not submitted",
  }[status];
}

function explorerUrl(hash: string) {
  return `https://testnet.monadexplorer.com/tx/${hash}`;
}

function shortHash(hash: string) {
  return `${hash.slice(0, 8)}…${hash.slice(-4)}`;
}
