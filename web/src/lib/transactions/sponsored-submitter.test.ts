import { decodeFunctionData, encodeFunctionData } from "viem";
import { describe, expect, it, vi } from "vitest";
import { tapacityAbi } from "@/lib/contract/abi";
import { createSponsoredSubmitter } from "./sponsored-submitter";

const contract = "0x1111111111111111111111111111111111111111" as const;
const hash = `0x${"cd".repeat(32)}` as const;

describe("sponsored tap transaction seam", () => {
  it("submits one sponsored contract call per unique physical tap", async () => {
    const sendTap = vi.fn().mockResolvedValue(hash);
    const submitter = createSponsoredSubmitter({ contract, sendTap });

    const first = await submitter.submitTap(7n, "tap-1");
    const duplicate = await submitter.submitTap(7n, "tap-1");

    expect(first).toEqual({ attemptId: "tap-1", status: "submitted", hash });
    expect(duplicate).toEqual(first);
    expect(sendTap).toHaveBeenCalledTimes(1);
    const call = sendTap.mock.calls[0][0];
    expect(call.to).toBe(contract);
    expect(call.value).toBe(0n);
    expect(decodeFunctionData({ abi: tapacityAbi, data: call.data })).toEqual({
      functionName: "tap",
      args: [7n],
    });
  });

  it("reports sponsorship failure without charging or funding the player", async () => {
    const submitter = createSponsoredSubmitter({
      contract,
      sendTap: vi.fn().mockRejectedValue(new Error("policy rejected")),
    });

    await expect(submitter.submitTap(7n, "tap-2")).resolves.toEqual({
      attemptId: "tap-2",
      status: "failed",
      error: "policy rejected",
    });
  });

  it("never combines two taps into one call payload", async () => {
    const sendTap = vi.fn().mockImplementation(async () => hash);
    const submitter = createSponsoredSubmitter({ contract, sendTap });

    await Promise.all([
      submitter.submitTap(7n, "tap-1"),
      submitter.submitTap(7n, "tap-2"),
    ]);

    expect(sendTap).toHaveBeenCalledTimes(2);
    const nonceKeys = sendTap.mock.calls.map(([, nonceKey]) => nonceKey);
    expect(new Set(nonceKeys).size).toBe(2);
    for (const [call, nonceKey] of sendTap.mock.calls) {
      expect(call.data).toBe(encodeFunctionData({ abi: tapacityAbi, functionName: "tap", args: [7n] }));
      expect(nonceKey).toMatch(/^0x[0-9a-f]{38}$/);
    }
  });
});
