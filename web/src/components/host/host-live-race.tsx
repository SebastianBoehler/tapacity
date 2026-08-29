"use client";

import type { CSSProperties } from "react";
import { useLiveRace } from "./use-live-race";

export function HostLiveRace({
  contract,
  roundId,
  startBlock,
  endBlock,
  expectedPlayers,
  phase,
}: {
  contract: `0x${string}`;
  roundId: bigint;
  startBlock: bigint;
  endBlock: bigint;
  expectedPlayers: number;
  phase: string;
}) {
  const { connection, lanes } = useLiveRace({ contract, roundId, startBlock, endBlock });
  const maxTaps = Math.max(1, ...lanes.map((lane) => lane.taps));
  const dense = lanes.length > 16;

  return (
    <section className="live-race" aria-labelledby="live-race-title">
      <div className="live-race-heading">
        <div>
          <h3 id="live-race-title">Live tap race</h3>
          <p>Provisional tap count · goals stay hidden until settlement</p>
        </div>
        <span className={`live-race-feed is-${connection}`}>{raceStatus(phase, connection)}</span>
      </div>
      {lanes.length === 0 && (
        <p className="live-race-empty" role="status">Reconstructing {expectedPlayers} player lane{expectedPlayers === 1 ? "" : "s"}…</p>
      )}
      {lanes.length > 0 && (
        <ol className={dense ? "live-race-lanes is-dense" : "live-race-lanes"}>
          {lanes.map((lane) => {
            const width = lane.taps === 0 ? 0 : Math.max(3, lane.taps / maxTaps * 100);
            const style = {
              "--lane-color": lane.color,
              "--lane-progress": `${width}%`,
            } as CSSProperties;
            return (
              <li key={lane.address} style={style}>
                <strong className="live-race-rank">#{lane.rank}</strong>
                <span className="live-race-name"><i aria-hidden="true" />{lane.name}</span>
                <span className="live-race-track" aria-hidden="true"><i /></span>
                <strong className="live-race-taps">{lane.taps}</strong>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

function raceStatus(phase: string, connection: string) {
  if (connection === "offline") return "FEED OFFLINE";
  return {
    lobby: "GET READY",
    live: "RACE LIVE",
    reveal: "RACE LOCKED",
    settlement: "AWAITING RESULTS",
  }[phase] ?? "SYNCING";
}
