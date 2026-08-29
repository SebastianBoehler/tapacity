import { describe, expect, it } from "vitest";
import { medianFinalityMs } from "./round-latency";

describe("medianFinalityMs", () => {
  it("returns the median proposal-to-finality observation", () => {
    expect(medianFinalityMs({
      first: { proposedAt: 1_000, finalizedAt: 1_780 },
      second: { proposedAt: 2_000, finalizedAt: 2_900 },
      third: { proposedAt: 3_000, finalizedAt: 3_820 },
      fourth: { proposedAt: 4_000 },
    })).toBe(820);
  });

  it("does not invent a value from incomplete observations", () => {
    expect(medianFinalityMs({ onlyFinalized: { finalizedAt: 1_800 } })).toBeUndefined();
  });
});
