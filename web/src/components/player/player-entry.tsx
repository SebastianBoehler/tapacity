"use client";

import { getEmbeddedConnectedWallet, useGuestAccounts, usePrivy, useWallets } from "@privy-io/react-auth";
import { useCallback, useEffect, useRef, useState } from "react";
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
  const creatingGuest = useRef(false);
  const wallet = getEmbeddedConnectedWallet(wallets);

  const startGuestAccount = useCallback(() => {
    if (creatingGuest.current) return;
    creatingGuest.current = true;
    setError(undefined);
    void createGuestAccount().catch((cause) => setError(message(cause)));
  }, [createGuestAccount]);

  useEffect(() => {
    if (ready && !authenticated) startGuestAccount();
  }, [authenticated, ready, startGuestAccount]);

  if (!ready) return <StatusScreen label="Initializing guest wallet" />;
  if (!authenticated) {
    if (!error) return <StatusScreen label="Creating guest wallet" />;
    return (
      <main className="entry-screen">
        <h1>Wallet setup failed</h1>
        <p className="error-note" role="alert">{error}</p>
        <button className="primary-button" onClick={() => {
          creatingGuest.current = false;
          startGuestAccount();
        }}>Retry wallet setup</button>
      </main>
    );
  }
  if (!wallet) return <StatusScreen label="Creating embedded wallet" />;
  return <ConnectedGame contract={contract} roundId={roundId} address={wallet.address as `0x${string}`} alchemyApiKey={alchemyApiKey} alchemyPolicyId={alchemyPolicyId} />;
}

function message(cause: unknown) {
  return cause instanceof Error ? cause.message : "Guest wallet unavailable";
}
