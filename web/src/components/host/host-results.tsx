import {
  MONAD_BLOCK_SECONDS,
  MONAD_DOCUMENTED_FINALITY_MS,
  MONAD_DOCUMENTED_TPS,
} from "@/lib/round/round-insights";
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
        <h1>Round {roundId.toString()}</h1>
        <button className="secondary-button results-new-round" onClick={onNewRound}>Start new round</button>
      </div>

      <section className="leaderboard" aria-labelledby="leaderboard-title">
        <h2 id="leaderboard-title">Leaderboard</h2>
        <ol>
          {players.map((player, index) => (
            <li className={index === 0 ? "winner" : undefined} key={player.address}>
              <strong className="leaderboard-rank">{index + 1}</strong>
              <div className="leaderboard-player"><strong>{player.name}</strong><span>{shortAddress(player.address)}</span></div>
              <ResultValue value={player.finalized.toString()} label="final" />
              <ResultValue value={formatScore(player.score)} label="score" />
            </li>
          ))}
        </ol>
      </section>

      <section className="telemetry-section" aria-labelledby="telemetry-title">
        <h2 id="telemetry-title">Measured round throughput</h2>
        <div className="telemetry-grid">
          <Metric value={summary.finalizedTaps.toLocaleString()} label="Finalized operations" primary />
          <Metric value={`${summary.peakAppTps.toFixed(1)} TPS`} label="Peak TAPACITY" />
          <Metric value={`${summary.averageAppTps.toFixed(1)} TPS`} label="Round average" />
          <Metric value={`${summary.testnetTps.toFixed(1)} TPS`} label="Observed Testnet" />
          <Metric value={formatOptionalPercent(summary.tapacitySharePercent, 2)} label="Block activity share" />
          <Metric value={summary.activeLanes.toString()} label="Independent lanes" />
          <Metric value={summary.tapacityTransactions.toString()} label="Outer transactions" />
        </div>
      </section>

      <section className="capacity-strip" aria-labelledby="capacity-title">
        <h2 id="capacity-title">Against documented Monad capability</h2>
        <div className="capacity-grid">
          <Metric value={formatCapacityShare(summary.capacitySharePercent)} label="Of maximum TPS" primary />
          <Metric value={`${MONAD_DOCUMENTED_TPS.toLocaleString()} TPS`} label="Protocol capacity" />
          <Metric value={`${MONAD_DOCUMENTED_FINALITY_MS} ms`} label="Finality" />
          <Metric value={`${Math.round(MONAD_BLOCK_SECONDS * 1_000)} ms`} label="Block frequency" />
        </div>
      </section>
    </article>
  );
}

function Metric({ value, label, primary = false }: { value: string; label: string; primary?: boolean }) {
  return <div className={primary ? "metric primary" : "metric"}><strong>{value}</strong><span>{label}</span></div>;
}

function ResultValue({ value, label }: { value: string; label: string }) {
  return <div className="result-value"><strong>{value}</strong><span>{label}</span></div>;
}

function formatScore(score: bigint) {
  return (Number(score) / 1_000_000).toFixed(2);
}

function formatOptionalPercent(value?: number, digits = 1) {
  return value === undefined ? "—" : `${value.toFixed(digits)}%`;
}

function formatCapacityShare(value: number) {
  const digits = value < 0.1 ? 3 : value < 10 ? 2 : 1;
  return `${value.toFixed(digits)}%`;
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
