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
  return (
    <button
      className={`tap-zone has-lane is-${phase}`}
      style={{ "--lane-color": laneColor } as CSSProperties}
      disabled={phase !== "live"}
      onPointerDown={(event) => { event.preventDefault(); onTap(); }}
      onKeyDown={(event) => {
        if (event.key === " " || event.key === "Enter") {
          event.preventDefault();
          onTap();
        }
      }}
    >
      <span>{pressureLabel(phase, startBlock, blockNumber)}</span>
      <small>{pressureDetail(phase, startBlock)}</small>
    </button>
  );
}

function pressureLabel(phase: string, startBlock: bigint, blockNumber: bigint) {
  return {
    waiting: "Waiting",
    lobby: `${secondsUntil(startBlock, blockNumber)}s`,
    live: "Tap",
    reveal: "Locked",
    settlement: "Results pending",
  }[phase];
}

function pressureDetail(phase: string, startBlock: bigint) {
  return {
    waiting: "Host starts the shared countdown",
    lobby: `Starts on finalized block ${startBlock.toString()}`,
    live: "One accepted tap · one sponsored onchain call",
    reveal: "Automatic goal reveal in progress",
    settlement: "Host is settling finalized results",
  }[phase];
}

function secondsUntil(target: bigint, block: bigint) {
  return Math.max(0, Number(target - block) * 0.4).toFixed(1);
}
