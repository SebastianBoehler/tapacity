import { describe, expect, it } from "vitest";
import {
  displayPlayerName,
  eventOrder,
  joinRaceLane,
  playerLaneColor,
  rankLiveRace,
  recordRaceTap,
  type LiveRaceLane,
} from "./live-race";

const alice = "0x00000000000000000000000000000000000000a1" as const;
const bob = "0x00000000000000000000000000000000000000b2" as const;

describe("live race", () => {
  it("keeps lanes in join order while updating their provisional ranks", () => {
    const lanes = new Map<string, LiveRaceLane>([
      [alice, { address: alice, name: "Alice", taps: 3, joinedAt: 10n }],
      [bob, { address: bob, name: "Bob", taps: 8, joinedAt: 20n }],
    ]);

    expect(rankLiveRace(lanes.values()).map((lane) => [lane.name, lane.rank])).toEqual([
      ["Alice", 2],
      ["Bob", 1],
    ]);
  });

  it("uses authoritative tap numbers without double counting repeated logs", () => {
    let lanes = new Map<string, LiveRaceLane>();
    lanes = recordRaceTap(lanes, { address: alice, tapNumber: 4, observedAt: 30n });
    lanes = recordRaceTap(lanes, { address: alice, tapNumber: 4, observedAt: 30n });
    lanes = recordRaceTap(lanes, { address: alice, tapNumber: 2, observedAt: 20n });

    expect(lanes.get(alice)?.taps).toBe(4);
  });

  it("preserves tap progress when the finalized join identity arrives later", () => {
    let lanes = recordRaceTap(new Map(), { address: bob, tapNumber: 2, observedAt: 40n });
    lanes = joinRaceLane(lanes, { address: bob, name: "Basti", joinedAt: 10n });

    expect(lanes.get(bob)).toMatchObject({ name: "Basti", taps: 2, joinedAt: 10n });
  });

  it("decodes nicknames and derives stable player colors", () => {
    expect(displayPlayerName("0x53656261737469616e00000000000000", alice)).toBe("Sebastian");
    expect(playerLaneColor(alice)).toBe(playerLaneColor(alice));
    expect(eventOrder(12n, 3)).toBe(12_000_003n);
  });
});
