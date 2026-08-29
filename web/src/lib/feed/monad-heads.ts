import type { CommitState } from "./commitment-tracker";
import { subscribeMonadStream } from "./monad-stream";

export type MonadHead = {
  blockId: `0x${string}`;
  commitState: CommitState;
  hash: `0x${string}`;
  number: `0x${string}`;
  timestamp: `0x${string}`;
};

export function subscribeMonadHeads({
  url,
  onHead,
}: {
  url: string;
  onHead: (head: MonadHead) => void;
}) {
  return subscribeMonadStream({
    url,
    subscription: "monadNewHeads",
    isResult: (value): value is MonadHead =>
      typeof value === "object" && value !== null && "commitState" in value && "number" in value,
    onResult: onHead,
  });
}
