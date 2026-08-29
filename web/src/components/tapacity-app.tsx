"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { tapacityChain } from "@/lib/chain";
import { PlayerGame } from "./player/player-game";

export function TapacityApp({
  appId,
  contract,
  roundId,
}: {
  appId: string;
  contract: `0x${string}`;
  roundId: bigint;
}) {
  return (
    <PrivyProvider
      appId={appId}
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
