import { MONAD_DOCUMENTED_TPS } from "@/lib/round/round-insights";
import type { RoundState } from "@/lib/contract/use-chain-state";
import { useRoundResults } from "./use-round-results";

export function HostResults({
  contract,
  roundId,
  round,
  ranking,
  onNewRound,
}: {
  contract: `0x${string}`;
  roundId: bigint;
  round: RoundState;
  ranking: readonly `0x${string}`[];
  onNewRound: () => void;
}) {
  const { results, error } = useRoundResults({ contract, roundId, round, ranking });
  if (error) return <p className="error-note" role="alert">Unable to reconstruct round insights: {error}</p>;
  if (!results) return <p className="host-status" role="status">Reconstructing finalized round {roundId.toString()}…</p>;
  const { players, summary } = results;

  return (
    <article className="host-results">
      <div className="results-heading">
        <div>
          <h1>Round {roundId.toString()} results</h1>
          <p>{summary.finalizedTaps} scoring tap operations, finalized on Monad Testnet.</p>
        </div>
        <button className="secondary-button results-new-round" onClick={onNewRound}>Run another round</button>
      </div>

      <section className="leaderboard" aria-labelledby="leaderboard-title">
        <h2 id="leaderboard-title">Leaderboard</h2>
        <ol>
          {players.map((player, index) => (
            <li className={index === 0 ? "winner" : undefined} key={player.address}>
              <strong className="leaderboard-rank">{index + 1}</strong>
              <div className="leaderboard-player">
                <strong>{player.name}</strong>
                <span>{shortAddress(player.address)}</span>
              </div>
              <ResultValue value={player.finalized.toString()} label="finalized" />
              <ResultValue value={formatPercent(player.accuracyPpm / 10_000)} label="accuracy" />
              <ResultValue value={formatScore(player.score)} label="score" />
            </li>
          ))}
        </ol>
      </section>

      <section className="round-reveal" aria-labelledby="round-reveal-title">
        <h2 id="round-reveal-title">What the room did</h2>
        <div className="insight-grid">
          <Insight value={summary.finalizedTaps.toLocaleString()} label="Finalized taps" detail="Only accepted, in-window transactions score" primary />
          <Insight value={`${summary.peakAppTps.toFixed(1)} TPS`} label="Peak TAPACITY rate" detail="Measured over a 1.2-second block window" />
          <Insight value={`${summary.averageAppTps.toFixed(1)} TPS`} label="Average TAPACITY rate" detail="Measured across the 20-second tap window" />
          <Insight value={summary.activeLanes.toString()} label="Independent lanes" detail={`${summary.activeLanes} player storage slots wrote successfully`} />
          <Insight value={`${summary.tapacityTransactions} tx`} label="Onchain footprint" detail={`${summary.finalizedTaps} signed tap operations; bundlers may pack several into one transaction`} />
          <Insight value={formatOptionalPercent(summary.goalRealizationPercent)} label="Goal realization" detail="Finalized taps divided by all revealed goals" />
        </div>
      </section>

      <section className="network-reveal" aria-labelledby="network-reveal-title">
        <div>
          <h2 id="network-reveal-title">The room inside the network</h2>
          <p>These values were reconstructed from the finalized blocks that contained the round.</p>
        </div>
        <div className="network-numbers">
          <ResultValue value={`${summary.testnetTps.toFixed(1)} TPS`} label="Testnet activity during round" />
          <ResultValue value={formatOptionalPercent(summary.tapacitySharePercent, 2)} label="TAPACITY share of block transactions" />
        </div>
      </section>

      <section className="capacity-reveal" aria-labelledby="capacity-title">
        <h2 id="capacity-title">Against documented capacity</h2>
        <div className="capacity-comparison">
          <div><strong>{MONAD_DOCUMENTED_TPS.toLocaleString()} TPS</strong><span>Monad protocol capacity</span></div>
          <div><strong>{summary.equivalentRooms ? `≈${summary.equivalentRooms.toLocaleString()}` : "—"}</strong><span>simultaneous rooms at this round&apos;s measured peak rate</span></div>
        </div>
        <p>This is a capacity ratio, not a benchmark or a claim that TAPACITY measured Monad&apos;s maximum.</p>
      </section>

      <section className="architecture-reveal" aria-labelledby="architecture-title">
        <h2 id="architecture-title">What just became visible</h2>
        <div>
          <p><strong>Asynchronous execution</strong> let every phone watch transactions move from proposal and validator vote to irreversible finality.</p>
          <p><strong>Parallel-friendly state</strong> gave each player an independent storage slot instead of forcing every tap through one shared counter.</p>
          <p><strong>Settlement after play</strong> aggregated the round only once the tap and reveal windows had closed. MonadDB supports authenticated node state; this browser did not benchmark it.</p>
        </div>
      </section>
    </article>
  );
}

function Insight({ value, label, detail, primary = false }: { value: string; label: string; detail: string; primary?: boolean }) {
  return <div className={primary ? "insight-card primary" : "insight-card"}><strong>{value}</strong><span>{label}</span><p>{detail}</p></div>;
}

function ResultValue({ value, label }: { value: string; label: string }) {
  return <div className="result-value"><strong>{value}</strong><span>{label}</span></div>;
}

function formatScore(score: bigint) {
  return (Number(score) / 1_000_000).toFixed(2);
}

function formatPercent(value: number, digits = 1) {
  return `${value.toFixed(digits)}%`;
}

function formatOptionalPercent(value?: number, digits = 1) {
  return value === undefined ? "—" : formatPercent(value, digits);
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
