import { decodeFunctionData } from "viem";
import { describe, expect, it, vi } from "vitest";
import { tapacityAbi } from "@/lib/contract/abi";
import { createRawSubmitter } from "./raw-submitter";

const contract = "0x1111111111111111111111111111111111111111" as const;
const raw = `0x${"ab".repeat(100)}` as const;
const hash = `0x${"cd".repeat(32)}` as const;

describe("raw tap transaction seam", () => {
  it("signs and broadcasts one explicit-nonce transaction per unique attempt", async () => {
    const sign = vi.fn().mockResolvedValue({ signature: raw });
    const broadcast = vi.fn().mockResolvedValue(hash);
    const submitter = createRawSubmitter({
      contract,
      sign,
      broadcast,
      getNonce: vi.fn().mockResolvedValue(12),
      getFees: vi.fn().mockResolvedValue({ maxFeePerGas: 200n, maxPriorityFeePerGas: 100n }),
    });

    const first = await submitter.submitTap(7n, "tap-1");
    const duplicate = await submitter.submitTap(7n, "tap-1");

    expect(first).toEqual({ attemptId: "tap-1", status: "submitted", hash, nonce: 12 });
    expect(duplicate).toEqual(first);
    expect(sign).toHaveBeenCalledTimes(1);
    expect(broadcast).toHaveBeenCalledWith(raw);
    expect(sign.mock.calls[0][0]).toMatchObject({
      to: contract,
      value: 0n,
      nonce: 12,
      gasLimit: 50_000n,
      chainId: 10_143,
      type: 2,
    });
    expect(decodeFunctionData({ abi: tapacityAbi, data: sign.mock.calls[0][0].data })).toEqual({
      functionName: "tap",
      args: [7n],
    });
  });

  it("reports a signing failure without a participant-paid fallback", async () => {
    const submitter = createRawSubmitter({
      contract,
      sign: vi.fn().mockRejectedValue(new Error("signing denied")),
      broadcast: vi.fn(),
      getNonce: vi.fn().mockResolvedValue(4),
      getFees: vi.fn().mockResolvedValue({ maxFeePerGas: 2n, maxPriorityFeePerGas: 1n }),
    });

    await expect(submitter.submitTap(7n, "tap-2")).resolves.toEqual({
      attemptId: "tap-2",
      status: "failed",
      error: "signing denied",
      nonce: 4,
    });
  });
});
