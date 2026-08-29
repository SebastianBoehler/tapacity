"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { tapacityChain } from "@/lib/chain";
import { PlayerGame } from "./player/player-game";

export function TapacityApp({
  appId,
  clientId,
  contract,
  roundId,
}: {
  appId: string;
  clientId: string;
  contract: `0x${string}`;
  roundId: bigint;
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
      <PlayerGame contract={contract} roundId={roundId} />
    </PrivyProvider>
  );
}
