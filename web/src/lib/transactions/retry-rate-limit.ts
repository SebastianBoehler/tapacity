const DEFAULT_DELAYS_MS = [1_000, 2_000, 4_000, 8_000, 12_000];

export async function retryRateLimited<T>(
  action: () => Promise<T>,
  options: {
    delaysMs?: number[];
    wait?: (delayMs: number) => Promise<void>;
  } = {},
) {
  const delays = options.delaysMs ?? DEFAULT_DELAYS_MS;
  const wait = options.wait ?? ((delayMs: number) => new Promise<void>((resolve) => setTimeout(resolve, delayMs)));

  for (let attempt = 0; ; attempt += 1) {
    try {
      return await action();
    } catch (cause) {
      if (!isRateLimit(cause) || attempt === delays.length) throw cause;
      await wait(delays[attempt]);
    }
  }
}

function isRateLimit(cause: unknown) {
  const detail = cause instanceof Error ? cause.message : String(cause);
  return /429|too many requests|rate limit/i.test(detail);
}
