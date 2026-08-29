import { describe, expect, it } from "vitest";
import { knownAttemptStatus, operationId, summarizeTapProof } from "./tap-proof";

const HASH = `0x${"ab".repeat(32)}` as const;

describe("tap proof identity", () => {
  it("keeps separately accepted operations when a bundler shares one outer transaction", () => {
    expect(operationId(HASH, 3)).not.toBe(operationId(HASH, 4));
  });

  it("reports operations separately from outer transactions", () => {
    const summary = summarizeTapProof([
      { transactionHash: HASH },
      { transactionHash: HASH },
      { transactionHash: `0x${"cd".repeat(32)}` },
    ]);

    expect(summary).toEqual({ operations: 3, outerTransactions: 2 });
  });
});

describe("tap attempt proof status", () => {
  it("distinguishes finalized, late, and pre-submission failures", () => {
    expect(knownAttemptStatus({ hasHash: true, finalized: true, endBlock: 50n, settled: true })).toBe("finalized");
    expect(knownAttemptStatus({ hasHash: true, finalized: false, callStatus: "failure", receiptBlock: "51", endBlock: 50n, settled: true })).toBe("late");
    expect(knownAttemptStatus({ hasHash: false, finalized: false, endBlock: 50n, settled: true })).toBe("not-submitted");
  });
});
