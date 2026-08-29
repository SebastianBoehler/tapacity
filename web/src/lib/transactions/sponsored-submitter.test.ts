import { decodeFunctionData } from "viem";
import { describe, expect, it, vi } from "vitest";
import { tapacityAbi } from "@/lib/contract/abi";
import { advanceTapState, pruneSupersededTapStates } from "@/lib/feed/commitment-tracker";
import { createSponsoredSubmitter } from "./sponsored-submitter";

const contract = "0x1111111111111111111111111111111111111111" as const;
const wallet = "0x2222222222222222222222222222222222222222" as const;
const hash = `0x${"ab".repeat(32)}` as const;

describe("sponsored transaction seam", () => {
  it("submits one sponsored zero-value transaction per unique tap attempt", async () => {
    const send = vi.fn().mockResolvedValue({ hash });
    const submitter = createSponsoredSubmitter({ contract, wallet, send });

    const first = await submitter.submitTap(7n, "tap-1");
    const duplicate = await submitter.submitTap(7n, "tap-1");

    expect(first).toEqual({ attemptId: "tap-1", status: "submitted", hash });
    expect(duplicate).toEqual(first);
    expect(send).toHaveBeenCalledTimes(1);

    const [transaction, options] = send.mock.calls[0];
    expect(transaction).toMatchObject({ to: contract, value: 0n });
    expect(options).toEqual({
      address: wallet,
      sponsor: true,
      uiOptions: { showWalletUIs: false },
    });
    expect(decodeFunctionData({ abi: tapacityAbi, data: transaction.data })).toEqual({
      functionName: "tap",
      args: [7n],
    });
  });

  it("reports sponsorship rejection without a participant-paid retry", async () => {
    const send = vi.fn().mockRejectedValue(new Error("429 sponsorship rate limit"));
    const submitter = createSponsoredSubmitter({ contract, wallet, send });

    await expect(submitter.submitTap(7n, "tap-2")).resolves.toEqual({
      attemptId: "tap-2",
      status: "failed",
      error: "429 sponsorship rate limit",
    });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("limits concurrent sponsor requests instead of stampeding Privy", async () => {
    const releases: Array<(value: { hash: typeof hash }) => void> = [];
    const send = vi.fn(() => new Promise<{ hash: typeof hash }>((resolve) => releases.push(resolve)));
    const submitter = createSponsoredSubmitter({ contract, wallet, send });
    const submissions = [1, 2, 3, 4].map((tap) => submitter.submitTap(7n, `tap-${tap}`));

    await Promise.resolve();
    expect(send).toHaveBeenCalledTimes(3);
    releases.shift()?.({ hash });
    await vi.waitFor(() => expect(send).toHaveBeenCalledTimes(4));

    for (const release of releases) release({ hash });
    await Promise.all(submissions);
  });

  it("tracks a submitted tap through speculative and canonical commitment states", async () => {
    const send = vi.fn().mockResolvedValue({ hash });
    const result = await createSponsoredSubmitter({ contract, wallet, send }).submitTap(7n, "tap-3");
    expect(result.status).toBe("submitted");

    const losingBlock = `0x${"01".repeat(32)}` as const;
    const canonicalBlock = `0x${"02".repeat(32)}` as const;
    let state = advanceTapState(undefined, { blockId: losingBlock, blockNumber: "0x10", commitState: "Proposed" });
    const speculative = new Map([[hash, state]]);
    expect(pruneSupersededTapStates(speculative, {
      blockId: canonicalBlock,
      blockNumber: "0x10",
      commitState: "Voted",
    }).size).toBe(0);

    state = advanceTapState(state, { blockId: canonicalBlock, blockNumber: "0x11", commitState: "Proposed" });
    state = advanceTapState(state, { blockId: state.blockId, commitState: "Voted" });
    state = advanceTapState(state, { blockId: state.blockId, commitState: "Finalized" });

    expect(state).toEqual({ blockId: canonicalBlock, blockNumber: "0x11", commitState: "Finalized" });
    expect(advanceTapState(state, { blockId: state.blockId, commitState: "Voted" })).toEqual(state);
  });
});
