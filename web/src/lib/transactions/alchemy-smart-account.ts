import { alchemyWalletTransport, createSmartWalletClient } from "@alchemy/wallet-apis";
import { privateKeyToAccount } from "viem/accounts";
import { tapacityChain } from "@/lib/chain";

export function createAlchemySmartAccount({
  apiKey,
  policyId,
  privateKey,
}: {
  apiKey: string;
  policyId: string;
  privateKey: `0x${string}`;
}) {
  const client = createSmartWalletClient({
    signer: privateKeyToAccount(privateKey),
    chain: tapacityChain,
    transport: alchemyWalletTransport({ apiKey }),
    paymaster: { policyId },
  });
  return { client, account: client.requestAccount() };
}

export async function sponsoredAccountAddress(config: Parameters<typeof createAlchemySmartAccount>[0]) {
  return (await createAlchemySmartAccount(config).account).address;
}
