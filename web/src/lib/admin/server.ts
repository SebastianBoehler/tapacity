import { createWalletClient, http, isAddress, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { tapacityChain } from "@/lib/chain";

export function requireHost(request: Request) {
  const expected = process.env.TAPACITY_HOST_KEY;
  if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`) {
    throw new HostError("Host key rejected", 401);
  }
}

export function adminConfig() {
  const privateKey = process.env.TAPACITY_ADMIN_PRIVATE_KEY as Hex | undefined;
  const contract = process.env.NEXT_PUBLIC_TAPACITY_CONTRACT;
  if (!privateKey || !/^0x[\da-f]{64}$/i.test(privateKey) || !contract || !isAddress(contract)) {
    throw new HostError("Host wallet is not configured", 503);
  }
  return {
    contract,
    wallet: createWalletClient({
      account: privateKeyToAccount(privateKey),
      chain: tapacityChain,
      transport: http("https://rpc-testnet.monadinfra.com"),
    }),
  };
}

export class HostError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}
