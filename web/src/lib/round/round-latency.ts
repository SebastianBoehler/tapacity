export type LatencyObservation = {
  proposedAt?: number;
  finalizedAt?: number;
};

export function medianFinalityMs(observations: Record<string, LatencyObservation>) {
  const samples = Object.values(observations)
    .flatMap(({ proposedAt, finalizedAt }) => (
      proposedAt !== undefined && finalizedAt !== undefined && finalizedAt >= proposedAt
        ? [finalizedAt - proposedAt]
        : []
    ))
    .sort((left, right) => left - right);

  if (samples.length === 0) return undefined;
  const middle = Math.floor(samples.length / 2);
  return samples.length % 2 === 1
    ? samples[middle]
    : (samples[middle - 1] + samples[middle]) / 2;
}
