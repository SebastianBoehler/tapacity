import { keccak256, type Hex } from "viem";
import { paidRpcUrl, publicRpcUrls } from "@/lib/rpc-endpoints";

type Endpoint = { url: string; weight: number };

const ENDPOINTS: Endpoint[] = publicRpcUrls.map((url, index) => ({ url, weight: [50, 20, 20][index] }));

const ACCEPTED_ERRORS = ["already known", "nonce too low", "known transaction"];
const RETRYABLE_ERRORS = ["429", "rate limit", "too many requests", "timeout", "temporarily", "upstream"];
class RpcRejectedError extends Error {}

export function createRpcRouter(wallet: `0x${string}`, request: typeof fetch = fetch) {
  const ordered = paidRpcUrl
    ? [{ url: paidRpcUrl, weight: 1 }, ...stickyOrder(wallet, ENDPOINTS)]
    : stickyOrder(wallet, ENDPOINTS);

  async function broadcast(raw: Hex): Promise<Hex> {
    const expectedHash = keccak256(raw);
    let lastError = "RPC submission failed";

    for (const endpoint of ordered) {
      try {
        const response = await withTimeout(request(endpoint.url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_sendRawTransaction", params: [raw] }),
        }), 2_000);
        const payload = await response.json() as { result?: Hex; error?: { message?: string } };
        if (payload.result) return payload.result;

        const message = payload.error?.message ?? `RPC ${response.status}`;
        lastError = message;
        if (includesAny(message, ACCEPTED_ERRORS)) return expectedHash;
        if (response.status === 429 || response.status >= 500 || includesAny(message, RETRYABLE_ERRORS)) continue;
        throw new RpcRejectedError(message);
      } catch (cause) {
        lastError = cause instanceof Error ? cause.message : lastError;
        if (cause instanceof RpcRejectedError) throw cause;
      }
    }
    throw new Error(lastError);
  }

  return { broadcast, primaryUrl: ordered[0].url };
}

function stickyOrder(wallet: `0x${string}`, endpoints: Endpoint[]) {
  const totalWeight = endpoints.reduce((sum, endpoint) => sum + endpoint.weight, 0);
  const bucket = Number.parseInt(wallet.slice(-8), 16) % totalWeight;
  let cursor = 0;
  let primary = 0;
  for (let index = 0; index < endpoints.length; index += 1) {
    cursor += endpoints[index].weight;
    if (bucket < cursor) {
      primary = index;
      break;
    }
  }
  return [endpoints[primary], ...endpoints.filter((_, index) => index !== primary)];
}

function includesAny(message: string, fragments: string[]) {
  const normalized = message.toLowerCase();
  return fragments.some((fragment) => normalized.includes(fragment));
}

async function withTimeout<T>(task: Promise<T>, timeoutMs: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new DOMException("RPC timeout", "AbortError")), timeoutMs);
  });
  try {
    return await Promise.race([task, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
