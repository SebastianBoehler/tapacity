import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { HostLiveRace } from "./host-live-race";

vi.mock("./use-live-race", () => ({
  useLiveRace: () => ({
    connection: "live",
    lanes: [
      {
        address: "0x00000000000000000000000000000000000000a1",
        name: "Alice",
        taps: 12,
        joinedAt: 1n,
        color: "#00E5E8",
        rank: 1,
      },
      {
        address: "0x00000000000000000000000000000000000000b2",
        name: "Bob",
        taps: 9,
        joinedAt: 2n,
        color: "#A970FF",
        rank: 2,
      },
    ],
  }),
}));

describe("host live race", () => {
  it("uses large sparse lanes and renders each player name inside its bar", () => {
    const html = renderToStaticMarkup(
      <HostLiveRace
        contract="0x0000000000000000000000000000000000000001"
        roundId={1n}
        startBlock={10n}
        endBlock={20n}
        expectedPlayers={2}
        phase="live"
      />,
    );

    expect(html).toContain("live-race-lanes is-sparse");
    expect(html).toMatch(/class="live-race-track"[^>]*>.*Alice.*<\/span>/);
    expect(html).toMatch(/class="live-race-track"[^>]*>.*Bob.*<\/span>/);
  });
});
