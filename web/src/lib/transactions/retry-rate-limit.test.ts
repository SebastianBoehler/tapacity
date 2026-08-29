import { describe, expect, it, vi } from "vitest";
import { retryRateLimited } from "./retry-rate-limit";

describe("sponsored reveal retry", () => {
  it("backs off after an observed rate limit and then succeeds", async () => {
    const action = vi.fn()
      .mockRejectedValueOnce(new Error("Too many requests"))
      .mockResolvedValue({ hash: "0x01" });
    const wait = vi.fn().mockResolvedValue(undefined);

    await expect(retryRateLimited(action, { delaysMs: [1_000], wait })).resolves.toEqual({ hash: "0x01" });
    expect(wait).toHaveBeenCalledWith(1_000);
    expect(action).toHaveBeenCalledTimes(2);
  });

  it("does not retry a contract rejection", async () => {
    const action = vi.fn().mockRejectedValue(new Error("InvalidReveal"));
    await expect(retryRateLimited(action, { delaysMs: [1], wait: vi.fn() })).rejects.toThrow("InvalidReveal");
    expect(action).toHaveBeenCalledTimes(1);
  });
});
