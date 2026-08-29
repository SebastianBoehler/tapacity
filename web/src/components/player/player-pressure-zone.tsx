import type { CSSProperties } from "react";

export function PlayerPressureZone({
  phase,
  startBlock,
  blockNumber,
  laneColor,
  onTap,
}: {
  phase: string;
  startBlock: bigint;
  blockNumber: bigint;
  laneColor: string;
  onTap: () => void;
}) {
  const content = (
    <>
      <span>{pressureLabel(phase, startBlock, blockNumber)}</span>
      <small>{pressureDetail(phase, startBlock)}</small>
    </>
  );

  if (phase !== "live") {
    return (
      <section
        className={`tap-zone has-lane is-status is-${phase}`}
        style={{ "--lane-color": laneColor } as CSSProperties}
        role="status"
        aria-live="polite"
      >
        {content}
      </section>
    );
  }

  return (
    <button
      className={`tap-zone has-lane is-${phase}`}
      style={{ "--lane-color": laneColor } as CSSProperties}
      onPointerDown={(event) => { event.preventDefault(); onTap(); }}
      onKeyDown={(event) => {
        if (event.key === " " || event.key === "Enter") {
          event.preventDefault();
          onTap();
        }
      }}
    >
      {content}
    </button>
  );
}

function pressureLabel(phase: string, startBlock: bigint, blockNumber: bigint) {
  return {
    waiting: "Waiting",
    lobby: `${secondsUntil(startBlock, blockNumber)}s`,
    live: "Tap",
    reveal: "Taps locked",
    settlement: "Results incoming",
  }[phase];
}

function pressureDetail(phase: string, startBlock: bigint) {
  return {
    waiting: "Host starts the shared countdown",
    lobby: `Starts on finalized block ${startBlock.toString()}`,
    live: "One accepted tap · one sponsored onchain call",
    reveal: "Finalizing transactions and revealing your goal automatically",
    settlement: "Hang tight — the leaderboard will appear here automatically",
  }[phase];
}

function secondsUntil(target: bigint, block: bigint) {
  return Math.max(0, Number(target - block) * 0.4).toFixed(1);
}
