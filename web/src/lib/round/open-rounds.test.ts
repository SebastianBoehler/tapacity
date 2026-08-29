import { describe, expect, it } from "vitest";
import type { RoundState } from "@/lib/contract/use-chain-state";
import { recentRoundIds, selectOpenRounds } from "./open-rounds";

const waiting: RoundState = {
  creator: "0x1111111111111111111111111111111111111111",
  startBlock: 0n,
  endBlock: 0n,
  revealEndBlock: 0n,
  durationBlocks: 50,
  revealBlocks: 50,
  maxPlayers: 20,
  playerCount: 3,
  totalTaps: 0n,
  settled: false,
};

describe("open round discovery", () => {
  it("scans only the newest bounded round ids", () => {
    expect(recentRoundIds(30n, 3)).toEqual([30n, 29n, 28n]);
    expect(recentRoundIds(2n, 24)).toEqual([2n, 1n]);
  });

  it("exposes only the newest round when it is joinable", () => {
    const started = { ...waiting, startBlock: 100n };
    const full = { ...waiting, playerCount: 20 };
    const missing = { ...waiting, creator: "0x0000000000000000000000000000000000000000" as const };

    expect(selectOpenRounds([
      { id: 4n, state: waiting },
      { id: 3n, state: waiting },
      { id: 2n, state: full },
      { id: 1n, state: missing },
    ])).toEqual([{ id: 4n, state: waiting }]);

    expect(selectOpenRounds([
      { id: 4n, state: started },
      { id: 3n, state: waiting },
    ])).toEqual([]);
  });
});
