import type { Hex } from "viem";
import { encodeFunctionData } from "viem";
import { tapacityAbi } from "@/lib/contract/abi";

type Address = `0x${string}`;

type SendTransaction = (
  transaction: {
    to: Address;
    data: Hex;
    value: bigint;
    gasLimit: bigint;
  },
  options: {
    address: Address;
    sponsor: true;
    uiOptions: { showWalletUIs: false };
  },
) => Promise<{ hash: Hex }>;

export type SubmissionResult =
  | { attemptId: string; status: "submitted"; hash: Hex }
  | { attemptId: string; status: "failed"; error: string };

const TAP_GAS_LIMIT = 90_000n;

export function createSponsoredSubmitter({
  contract,
  wallet,
  send,
}: {
  contract: Address;
  wallet: Address;
  send: SendTransaction;
}) {
  const attempts = new Map<string, Promise<SubmissionResult>>();

  function submitTap(roundId: bigint, attemptId: string) {
    const previous = attempts.get(attemptId);
    if (previous) return previous;

    const submission = send(
      {
        to: contract,
        data: encodeFunctionData({ abi: tapacityAbi, functionName: "tap", args: [roundId] }),
        value: 0n,
        gasLimit: TAP_GAS_LIMIT,
      },
      {
        address: wallet,
        sponsor: true,
        uiOptions: { showWalletUIs: false },
      },
    )
      .then(({ hash }) => ({ attemptId, status: "submitted" as const, hash }))
      .catch((error: unknown) => ({
        attemptId,
        status: "failed" as const,
        error: error instanceof Error ? error.message : "Sponsored transaction failed",
      }));

    attempts.set(attemptId, submission);
    return submission;
  }

  return { submitTap };
}
