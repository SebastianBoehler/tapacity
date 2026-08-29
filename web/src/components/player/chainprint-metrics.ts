import type { TrackedTap } from "@/lib/feed/use-tap-commitments";
import type { GoalSession } from "@/lib/session/goal-session";

export type FinalizedTap = TrackedTap;

export function chainprintMetrics(session: GoalSession, finalized: FinalizedTap[]) {
  const attemptedAt = session.attempts.map((attempt) => attempt.attemptedAt).sort((a, b) => a - b);
  let peakRate = 0;
  for (let left = 0, right = 0; right < attemptedAt.length; right += 1) {
    while (attemptedAt[right] - attemptedAt[left] >= 1_000) left += 1;
    peakRate = Math.max(peakRate, right - left + 1);
  }

  const finalityMs = session.attempts.flatMap((attempt) => {
    if (!attempt.hash) return [];
    const observation = session.finality[attempt.hash];
    return observation ? [observation.observedAt - attempt.attemptedAt] : [];
  }).sort((a, b) => a - b);
  const middle = Math.floor(finalityMs.length / 2);
  const medianMs = finalityMs.length === 0
    ? undefined
    : finalityMs.length % 2
      ? finalityMs[middle]
      : (finalityMs[middle - 1] + finalityMs[middle]) / 2;

  const blockCounts = new Map<string, number>();
  for (const tap of finalized) {
    if (tap.blockNumber) blockCounts.set(tap.blockNumber, (blockCounts.get(tap.blockNumber) ?? 0) + 1);
  }
  const busiest = [...blockCounts].sort((a, b) => b[1] - a[1] || Number(BigInt(a[0]) - BigInt(b[0])))[0];
  return { peakRate, medianMs, busiestBlock: busiest?.[0], busiestCount: busiest?.[1] };
}
