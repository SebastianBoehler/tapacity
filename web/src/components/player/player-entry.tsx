"use client";

import { getEmbeddedConnectedWallet, useGuestAccounts, usePrivy, useWallets } from "@privy-io/react-auth";
import { useState } from "react";
import { ConnectedGame } from "./player-game";
import { StatusScreen } from "./player-ui";

export function PlayerEntry({
  alchemyApiKey,
  alchemyPolicyId,
  contract,
  roundId,
}: {
  alchemyApiKey: string;
  alchemyPolicyId: string;
  contract: `0x${string}`;
  roundId: bigint;
}) {
  const { ready, authenticated } = usePrivy();
  const { createGuestAccount } = useGuestAccounts();
  const { wallets } = useWallets();
  const [error, setError] = useState<string>();
  const wallet = getEmbeddedConnectedWallet(wallets);

  if (!ready) return <StatusScreen label="Initializing guest wallet" />;
  if (!authenticated) {
    return (
      <main className="entry-screen">
        <h1>TAPACITY</h1>
        <p className="lead">Round {roundId.toString()} on Monad Testnet. Predict your output, then turn every accepted tap into a sponsored onchain operation.</p>
        <button className="primary-button" onClick={() => void createGuestAccount().catch((cause) => setError(message(cause)))}>Continue as guest</button>
        <p className="cost-note">No wallet extension. No MON. You never pay gas.</p>
        {error && <p className="error-note" role="alert">{error}</p>}
      </main>
    );
  }
  if (!wallet) return <StatusScreen label="Creating embedded wallet" />;
  return <ConnectedGame contract={contract} roundId={roundId} address={wallet.address as `0x${string}`} alchemyApiKey={alchemyApiKey} alchemyPolicyId={alchemyPolicyId} />;
}

function message(cause: unknown) {
  return cause instanceof Error ? cause.message : "Guest wallet unavailable";
}
