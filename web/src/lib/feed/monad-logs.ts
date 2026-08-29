import type { CommitState } from "./commitment-tracker";
import { subscribeMonadStream, type FeedStatus } from "./monad-stream";

export type MonadLog = {
  address: `0x${string}`;
  blockId: `0x${string}`;
  blockNumber: `0x${string}`;
  commitState: CommitState;
  data: `0x${string}`;
  logIndex: `0x${string}`;
  topics: [`0x${string}`, ...`0x${string}`[]];
  transactionHash: `0x${string}`;
};

export function subscribeMonadLogs({
  url,
  address,
  onLog,
  onStatus,
}: {
  url: string;
  address: `0x${string}`;
  onLog: (log: MonadLog) => void;
  onStatus: (status: FeedStatus) => void;
}) {
  return subscribeMonadStream({
    url,
    subscription: "monadLogs",
    filter: { address },
    isResult: (value): value is MonadLog =>
      typeof value === "object" && value !== null && "commitState" in value && "transactionHash" in value,
    onResult: onLog,
    onStatus,
  });
}
