import type { PlayerState } from "@/lib/contract/use-chain-state";
import type { GoalSession } from "@/lib/session/goal-session";
import type { TapOutcomes } from "@/lib/transactions/use-tap-outcomes";
import { chainprintMetrics, type FinalizedTap } from "./chainprint-metrics";

export function Chainprint({
  address,
  session,
  player,
  ranking,
  finalized,
  outcomes,
}: {
  address: `0x${string}`;
  session: GoalSession;
  player: PlayerState;
  ranking: readonly `0x${string}`[];
  finalized: FinalizedTap[];
  outcomes?: TapOutcomes;
}) {
  const rank = ranking.findIndex((item) => item.toLowerCase() === address.toLowerCase());
  const metrics = chainprintMetrics(session, finalized);
  return (
    <main className="chainprint">
      <h1 className="result-title">Your Chainprint</h1>
      <div className="rank-number">#{rank >= 0 ? rank + 1 : "—"}</div>
      <div className="result-grid">
        <Metric label="GOAL" value={player.goal} />
        <Metric label="FINALIZED" value={player.taps} />
        <Metric label="ACCURACY" value={`${(player.accuracyPpm / 10_000).toFixed(1)}%`} />
        <Metric label="ATTEMPTED" value={session.attempted} />
        <Metric label="SUBMITTED" value={session.submitted} />
        <Metric label="LATE" value={outcomes?.late ?? "—"} />
        <Metric label="FAILED" value={outcomes ? session.failed + outcomes.failed : "—"} />
        <Metric label="PEAK RATE" value={`${metrics.peakRate}/s`} />
        <Metric label="MEDIAN FINALITY" value={metrics.medianMs === undefined ? "—" : `${Math.round(metrics.medianMs)} ms`} />
        <Metric label="BUSIEST BLOCK" value={metrics.busiestBlock ? `#${BigInt(metrics.busiestBlock)} · ${metrics.busiestCount} tx` : "—"} />
      </div>
      <div className="explorer-links">
        {session.hashes.slice(-3).map((hash) => (
          <a href={`https://testnet.monadexplorer.com/tx/${hash}`} key={hash} target="_blank" rel="noreferrer">
            {hash.slice(0, 10)}…
          </a>
        ))}
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
