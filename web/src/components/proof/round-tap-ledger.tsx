import { compareTapProof, summarizeTapProof, type TapProofRecord } from "@/lib/proof/tap-proof";

export function RoundTapLedger({
  taps,
  playerNames,
}: {
  taps: TapProofRecord[];
  playerNames: ReadonlyMap<string, string>;
}) {
  const ordered = [...taps].sort(compareTapProof);
  const summary = summarizeTapProof(ordered);
  return (
    <section className="proof-ledger round-proof" aria-labelledby="round-proof-title">
      <div className="proof-heading">
        <h2 id="round-proof-title">Finalized tap operations</h2>
        <strong>{summary.operations} operations · {summary.outerTransactions} outer transactions</strong>
      </div>
      <p className="proof-note">Each row is one canonical TapRecorded event. The log index keeps packed operations distinct when explorer hashes repeat.</p>
      <ol className="proof-list">
        {ordered.map((tap, index) => (
          <li key={tap.operationId}>
            <span className="proof-index">{index + 1}</span>
            <span className="proof-player">{playerNames.get(tap.player.toLowerCase()) ?? shortAddress(tap.player)} · tap {tap.tapNumber}</span>
            <span className="proof-block">Block {tap.blockNumber.toString()} · log {tap.logIndex}</span>
            <a href={explorerUrl(tap.transactionHash)} target="_blank" rel="noreferrer" aria-label={`Open outer transaction for finalized tap ${index + 1} in Monad Explorer`}>{shortHash(tap.transactionHash)} ↗</a>
          </li>
        ))}
      </ol>
    </section>
  );
}

function explorerUrl(hash: string) {
  return `https://testnet.monadexplorer.com/tx/${hash}`;
}

function shortHash(hash: string) {
  return `${hash.slice(0, 10)}…${hash.slice(-4)}`;
}

function shortAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
