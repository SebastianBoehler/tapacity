import { keccak256 } from "viem";
import { describe, expect, it, vi } from "vitest";
import { createRpcRouter } from "./rpc-router";

const wallet = "0x2222222222222222222222222222222222222222" as const;
const raw = `0x${"ab".repeat(100)}` as const;

describe("sticky raw transaction routing", () => {
  it("retries the exact same signed bytes after a 429", async () => {
    const request = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: "Too many requests" } }), { status: 429 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ result: keccak256(raw) }), { status: 200 }));
    const router = createRpcRouter(wallet, request);

    await expect(router.broadcast(raw)).resolves.toBe(keccak256(raw));
    expect(request).toHaveBeenCalledTimes(2);
    const firstBody = JSON.parse(request.mock.calls[0][1].body as string);
    const secondBody = JSON.parse(request.mock.calls[1][1].body as string);
    expect(firstBody.params).toEqual([raw]);
    expect(secondBody.params).toEqual([raw]);
  });

  it("treats already-known as accepted for the same signed transaction", async () => {
    const request = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { message: "already known" } }), { status: 200 }),
    );
    await expect(createRpcRouter(wallet, request).broadcast(raw)).resolves.toBe(keccak256(raw));
    expect(request).toHaveBeenCalledTimes(1);
  });
});
