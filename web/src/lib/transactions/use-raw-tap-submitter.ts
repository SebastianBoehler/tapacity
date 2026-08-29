"use client";

import { useMemo } from "react";
import { privateKeyToAccount } from "viem/accounts";
import { publicClient } from "@/lib/chain";
import type { GoalSession } from "@/lib/session/goal-session";
import { createRawSubmitter } from "./raw-submitter";
import { createRpcRouter } from "./rpc-router";

export function useRawTapSubmitter(contract: `0x${string}`, session: GoalSession | null) {
  return useMemo(() => {
    if (!session) return undefined;
    const account = privateKeyToAccount(session.tapPrivateKey);
    const router = createRpcRouter(account.address);
    return createRawSubmitter({
      contract,
      sign: async ({ gasLimit, ...transaction }) => ({
        signature: await account.signTransaction({ ...transaction, gas: gasLimit, type: "eip1559" }),
      }),
      broadcast: router.broadcast,
      getNonce: () => publicClient.getTransactionCount({ address: account.address, blockTag: "pending" }),
      getFees: async () => {
        const fees = await publicClient.estimateFeesPerGas({ type: "eip1559" });
        if (!fees.maxFeePerGas || fees.maxPriorityFeePerGas === undefined) {
          throw new Error("Monad fee quote unavailable");
        }
        return { maxFeePerGas: fees.maxFeePerGas, maxPriorityFeePerGas: fees.maxPriorityFeePerGas };
      },
    });
  }, [contract, session]);
}
