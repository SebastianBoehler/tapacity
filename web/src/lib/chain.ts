import { createPublicClient, fallback, http } from "viem";
import { monadTestnet } from "viem/chains";

export const tapacityChain = monadTestnet;
export const monadWebSocketUrl = "wss://testnet-rpc.monad.xyz";
const rpcUrls = [
  "https://testnet-rpc.monad.xyz",
  "https://rpc.ankr.com/monad_testnet",
  "https://rpc-testnet.monadinfra.com",
];

export const publicClient = createPublicClient({
  chain: tapacityChain,
  transport: fallback(orderedRpcUrls().map((url) => http(url, { batch: true }))),
});

function orderedRpcUrls() {
  let primary = 0;
  if (typeof window !== "undefined") {
    try {
      const stored = sessionStorage.getItem("tapacity:read-rpc");
      primary = stored === null ? weightedRpcIndex() : Number(stored);
      sessionStorage.setItem("tapacity:read-rpc", primary.toString());
    } catch {
      primary = 0;
    }
  }
  return [rpcUrls[primary], ...rpcUrls.filter((_, index) => index !== primary)];
}

function weightedRpcIndex() {
  const bucket = crypto.getRandomValues(new Uint8Array(1))[0] % 9;
  return bucket < 5 ? 0 : bucket < 7 ? 1 : 2;
}
