import { createPublicClient, http } from "viem";
import { monadTestnet } from "viem/chains";

export const tapacityChain = monadTestnet;
export const monadWebSocketUrl = "wss://testnet-rpc.monad.xyz";

export const publicClient = createPublicClient({
  chain: tapacityChain,
  transport: http("https://testnet-rpc.monad.xyz"),
});
