"use client";

import { useMemo } from "react";
import type { GoalSession } from "@/lib/session/goal-session";
import { createAlchemySmartAccount } from "./alchemy-smart-account";
import { createSponsoredSubmitter } from "./sponsored-submitter";

export function useSponsoredTapSubmitter({
  apiKey,
  contract,
  policyId,
  session,
}: {
  apiKey: string;
  contract: `0x${string}`;
  policyId: string;
  session: GoalSession | null;
}) {
  return useMemo(() => {
    if (!session) return undefined;
    const { client, account } = createAlchemySmartAccount({ apiKey, policyId, privateKey: session.tapPrivateKey });

    return createSponsoredSubmitter({
      contract,
      prepare: async () => { await account; },
      sendTap: async (call, nonceKey) => {
        const smartAccount = await account;
        const { id } = await client.sendCalls({
          account: smartAccount.address,
          capabilities: { nonceOverride: { nonceKey } },
          calls: [call],
        });
        const status = await client.waitForCallsStatus({ id, timeout: 30_000 });
        const hash = status.receipts?.[0]?.transactionHash;
        if (!hash) throw new Error(status.status === "failure" ? "Sponsored tap reverted without a receipt" : "Sponsored tap receipt unavailable");
        return hash;
      },
    });
  }, [apiKey, contract, policyId, session]);
}
