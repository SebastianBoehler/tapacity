"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { tapacityChain } from "@/lib/chain";
import { PlayerGame } from "./player/player-game";

export function TapacityApp({
  appId,
  clientId,
  contract,
  roundId,
  alchemyApiKey,
  alchemyPolicyId,
}: {
  appId: string;
  clientId: string;
  contract: `0x${string}`;
  roundId: bigint;
  alchemyApiKey: string;
  alchemyPolicyId: string;
}) {
  return (
    <PrivyProvider
      appId={appId}
      clientId={clientId}
      config={{
        defaultChain: tapacityChain,
        supportedChains: [tapacityChain],
        embeddedWallets: {
          ethereum: { createOnLogin: "all-users" },
          showWalletUIs: false,
        },
        appearance: { theme: "dark", accentColor: "#836ef9" },
      }}
    >
      <PlayerGame contract={contract} roundId={roundId} alchemyApiKey={alchemyApiKey} alchemyPolicyId={alchemyPolicyId} />
    </PrivyProvider>
  );
}
