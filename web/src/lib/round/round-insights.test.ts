import { describe, expect, it } from "vitest";
import { summarizeRound } from "./round-insights";

describe("summarizeRound", () => {
  it("separates measured room activity from documented protocol capacity", () => {
    const summary = summarizeRound({
      startBlock: 100n,
      endBlock: 106n,
      acceptedTaps: [
        { blockNumber: 100n, player: "0xaaa", transactionHash: "0x01" },
        { blockNumber: 101n, player: "0xaaa", transactionHash: "0x02" },
        { blockNumber: 101n, player: "0xbbb", transactionHash: "0x02" },
        { blockNumber: 103n, player: "0xbbb", transactionHash: "0x03" },
      ],
      blocks: [
        { number: 100n, transactionCount: 10 },
        { number: 101n, transactionCount: 12 },
        { number: 102n, transactionCount: 8 },
        { number: 103n, transactionCount: 10 },
        { number: 104n, transactionCount: 5 },
        { number: 105n, transactionCount: 3 },
        { number: 106n, transactionCount: 4 },
      ],
      totalGoal: 10,
    });

    expect(summary.finalizedTaps).toBe(4);
    expect(summary.activeLanes).toBe(2);
    expect(summary.averageAppTps).toBeCloseTo(1.667, 3);
    expect(summary.peakAppTps).toBeCloseTo(2.5, 3);
    expect(summary.testnetTps).toBeCloseTo(20, 3);
    expect(summary.tapacitySharePercent).toBeCloseTo(6.25, 3);
    expect(summary.tapacityTransactions).toBe(3);
    expect(summary.operationsPerTransaction).toBeCloseTo(1.333, 3);
    expect(summary.goalRealizationPercent).toBe(40);
    expect(summary.equivalentRooms).toBe(4_000);
    expect(summary.capacitySharePercent).toBeCloseTo(0.025, 4);
  });

  it("does not invent ratios when no transactions were observed", () => {
    const summary = summarizeRound({
      startBlock: 10n,
      endBlock: 12n,
      acceptedTaps: [],
      blocks: [],
      totalGoal: 0,
    });

    expect(summary.tapacitySharePercent).toBeUndefined();
    expect(summary.operationsPerTransaction).toBeUndefined();
    expect(summary.goalRealizationPercent).toBeUndefined();
    expect(summary.equivalentRooms).toBeUndefined();
  });
});
