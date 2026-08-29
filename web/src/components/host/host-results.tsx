import Link from "next/link";
import {
  MONAD_BLOCK_SECONDS,
  MONAD_DOCUMENTED_FINALITY_MS,
  MONAD_DOCUMENTED_TPS,
} from "@/lib/round/round-insights";
import type { RoundState } from "@/lib/contract/use-chain-state";
import { useRoundResults, type RankedPlayer } from "./use-round-results";

export function HostResults({
  contract,
  roundId,
  round,
  ranking,
  medianFinalityMs,
  onNewRound,
}: {
  contract: `0x${string}`;
  roundId: bigint;
  round: RoundState;
  ranking: readonly `0x${string}`[];
  medianFinalityMs?: number;
  onNewRound: () => void;
}) {
  const { results, error } = useRoundResults({ contract, roundId, round, ranking });
  if (error) return <p className="error-note" role="alert">Unable to reconstruct round insights: {error}</p>;
  if (!results) return <p className="host-status" role="status">Reconstructing finalized round {roundId.toString()}…</p>;
  const { players, summary } = results;
  const podium = players.slice(0, 3);
  const remaining = players.slice(3);

  return (
    <article className="host-results">
      <div className="results-heading">
        <h1>Round {roundId.toString()}</h1>
        <div className="results-actions">
          <Link className="secondary-button results-proof-link" href={`/host/proof?round=${roundId.toString()}`}>Onchain proof</Link>
          <button className="secondary-button results-new-round" onClick={onNewRound}>All rounds</button>
        </div>
      </div>

      <section className="leaderboard" aria-labelledby="leaderboard-title">
        <h2 id="leaderboard-title">Leaderboard</h2>
        <ol className="podium" data-count={podium.length}>
          {podium.map((player, index) => <PodiumPlace key={player.address} player={player} rank={index + 1} />)}
        </ol>
        {remaining.length > 0 && <ol className="leaderboard-rest" start={4}>
          {remaining.map((player, index) => <LeaderboardRow key={player.address} player={player} rank={index + 4} />)}
        </ol>}
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
          <Metric value={medianFinalityMs === undefined ? "—" : `${Math.round(medianFinalityMs)} ms`} label="Median proposal → finality" />
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

function PodiumPlace({ player, rank }: { player: RankedPlayer; rank: number }) {
  return (
    <li className={`podium-place place-${rank}`}>
      <strong className="leaderboard-rank">#{rank}</strong>
      <div className="leaderboard-player"><strong>{player.name}</strong><span>{shortAddress(player.address)}</span></div>
      <div className="podium-stats"><ResultValue value={player.finalized.toString()} label="finalized" /><ResultValue value={`${(player.accuracyPpm / 10_000).toFixed(1)}%`} label="accuracy" /><ResultValue value={formatScore(player.score)} label="score" /></div>
    </li>
  );
}

function LeaderboardRow({ player, rank }: { player: RankedPlayer; rank: number }) {
  return (
    <li>
      <strong className="leaderboard-rank">{rank}</strong>
      <div className="leaderboard-player"><strong>{player.name}</strong><span>{shortAddress(player.address)}</span></div>
      <ResultValue value={player.finalized.toString()} label="final" />
      <ResultValue value={formatScore(player.score)} label="score" />
    </li>
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
