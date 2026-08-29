import { encodeFunctionData, keccak256, sliceHex, stringToHex, type Hex } from "viem";
import { tapacityAbi } from "@/lib/contract/abi";

type Address = `0x${string}`;
type TapCall = { to: Address; data: Hex; value: bigint };

export type SponsoredSubmissionResult =
  | { attemptId: string; status: "submitted"; hash: Hex }
  | { attemptId: string; status: "failed"; error: string };

const MAX_CONCURRENT_SUBMISSIONS = 12;

export function createSponsoredSubmitter({
  contract,
  prepare,
  sendTap,
}: {
  contract: Address;
  prepare?: () => Promise<void>;
  sendTap: (call: TapCall, nonceKey: Hex) => Promise<Hex>;
}) {
  const attempts = new Map<string, Promise<SponsoredSubmissionResult>>();
  const queue: Array<{
    attemptId: string;
    roundId: bigint;
    resolve: (result: SponsoredSubmissionResult) => void;
  }> = [];
  let active = 0;

  async function execute(roundId: bigint, attemptId: string): Promise<SponsoredSubmissionResult> {
    try {
      const hash = await sendTap({
        to: contract,
        value: 0n,
        data: encodeFunctionData({ abi: tapacityAbi, functionName: "tap", args: [roundId] }),
      }, nonceKey(attemptId));
      return { attemptId, status: "submitted", hash };
    } catch (cause) {
      return {
        attemptId,
        status: "failed",
        error: cause instanceof Error ? cause.message : "Sponsored tap failed",
      };
    }
  }

  function pump() {
    while (active < MAX_CONCURRENT_SUBMISSIONS && queue.length > 0) {
      const job = queue.shift();
      if (!job) return;
      active += 1;
      void execute(job.roundId, job.attemptId).then(job.resolve).finally(() => {
        active -= 1;
        pump();
      });
    }
  }

  function submitTap(roundId: bigint, attemptId: string) {
    const previous = attempts.get(attemptId);
    if (previous) return previous;
    const submission = new Promise<SponsoredSubmissionResult>((resolve) => {
      queue.push({ attemptId, roundId, resolve });
      pump();
    });
    attempts.set(attemptId, submission);
    return submission;
  }

  function cancelPending(reason: string) {
    for (const job of queue.splice(0)) {
      job.resolve({ attemptId: job.attemptId, status: "failed", error: reason });
    }
  }

  return { cancelPending, prepare: prepare ?? (async () => undefined), submitTap };
}

function nonceKey(attemptId: string) {
  return sliceHex(keccak256(stringToHex(attemptId)), 0, 19);
}
