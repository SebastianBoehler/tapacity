"use client";

import Link from "next/link";
import { useChainState } from "@/lib/contract/use-chain-state";
import { RoundTapLedger } from "@/components/proof/round-tap-ledger";
import { useRoundResults } from "./use-round-results";

export function HostProof({ contract, roundId }: { contract: `0x${string}`; roundId: bigint }) {
  const chain = useChainState(contract, roundId);
  const reconstruction = useRoundResults({
    contract,
    roundId,
    round: chain.round ?? emptyRound,
    ranking: chain.ranking,
  });
  if (chain.error && !chain.round) return <Status error={chain.error} />;
  if (!chain.round) return <Status label={`Loading round ${roundId.toString()}…`} />;
  if (!chain.round.settled) return <Status error={`Round ${roundId.toString()} has not settled yet.`} />;
  if (reconstruction.error) return <Status error={reconstruction.error} />;
  if (!reconstruction.results) return <Status label="Reconstructing finalized tap proof…" />;

  const { players, taps, summary } = reconstruction.results;
  const names = new Map(players.map((player) => [player.address.toLowerCase(), player.name]));
  return (
    <main className="host-proof-screen">
      <header className="proof-page-heading">
        <div><h1>Round {roundId.toString()} proof</h1><p>{summary.finalizedTaps} finalized tap operations on Monad Testnet.</p></div>
        <Link className="secondary-button proof-back" href="/host">Back to results</Link>
      </header>
      <RoundTapLedger taps={taps} playerNames={names} />
    </main>
  );
}

function Status({ label, error }: { label?: string; error?: string }) {
  return <main className="status-screen"><h1>{error ? "Proof unavailable" : "Onchain proof"}</h1><p className={error ? "error-note" : undefined} role={error ? "alert" : "status"}>{error ?? label}</p></main>;
}

const emptyRound = {
  creator: "0x0000000000000000000000000000000000000000" as const,
  startBlock: 0n,
  endBlock: 0n,
  revealEndBlock: 0n,
  durationBlocks: 0,
  revealBlocks: 0,
  maxPlayers: 0,
  playerCount: 0,
  totalTaps: 0n,
  settled: false,
};
