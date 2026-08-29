import { encodeFunctionData, type Hex } from "viem";
import { tapacityAbi } from "@/lib/contract/abi";

type Address = `0x${string}`;
type Fees = { maxFeePerGas: bigint; maxPriorityFeePerGas: bigint };
type Sign = (transaction: {
  to: Address;
  data: Hex;
  value: bigint;
  nonce: number;
  gasLimit: bigint;
  chainId: number;
  type: number;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
}) => Promise<{ signature: Hex }>;

export type SubmissionResult =
  | { attemptId: string; status: "submitted"; hash: Hex; nonce: number }
  | { attemptId: string; status: "failed"; error: string; nonce?: number };

const CHAIN_ID = 10_143;
const TAP_GAS_LIMIT = 50_000n;
const MAX_CONCURRENT_SUBMISSIONS = 6;

export function createRawSubmitter({
  contract,
  sign,
  broadcast,
  getNonce,
  getFees,
}: {
  contract: Address;
  sign: Sign;
  broadcast: (raw: Hex) => Promise<Hex>;
  getNonce: () => Promise<number>;
  getFees: () => Promise<Fees>;
}) {
  const attempts = new Map<string, Promise<SubmissionResult>>();
  const queue: Array<{ attemptId: string; roundId: bigint; resolve: (result: SubmissionResult) => void }> = [];
  let active = 0;
  let nextNonce: number | undefined;
  let fees: Fees | undefined;
  let preparation: Promise<void> | undefined;

  function prepare() {
    preparation ??= Promise.all([getNonce(), getFees()]).then(([nonce, nextFees]) => {
      nextNonce = nonce;
      fees = nextFees;
    });
    return preparation;
  }

  async function execute(roundId: bigint, attemptId: string): Promise<SubmissionResult> {
    let nonce: number | undefined;
    try {
      await prepare();
      if (nextNonce === undefined || !fees) throw new Error("Tap signer is not prepared");
      nonce = nextNonce++;
      const { signature } = await sign({
        to: contract,
        data: encodeFunctionData({ abi: tapacityAbi, functionName: "tap", args: [roundId] }),
        value: 0n,
        nonce,
        gasLimit: TAP_GAS_LIMIT,
        chainId: CHAIN_ID,
        type: 2,
        ...fees,
      });
      return { attemptId, status: "submitted", hash: await broadcast(signature), nonce };
    } catch (cause) {
      return {
        attemptId,
        status: "failed",
        error: cause instanceof Error ? cause.message : "Raw transaction failed",
        nonce,
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
    const submission = new Promise<SubmissionResult>((resolve) => {
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

  return { cancelPending, prepare, submitTap };
}
