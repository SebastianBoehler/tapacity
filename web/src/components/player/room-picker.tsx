"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { loadOpenRounds, type OpenRound } from "@/lib/round/open-rounds";

export function RoomPicker({ contract }: { contract: `0x${string}` }) {
  const [rooms, setRooms] = useState<OpenRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const refresh = useCallback(async () => {
    try {
      setRooms(await loadOpenRounds(contract));
      setError(undefined);
    } catch {
      setError("Unable to load rounds. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [contract]);

  useEffect(() => {
    const initial = setTimeout(() => void refresh(), 0);
    const timer = setInterval(() => void refresh(), 2_000);
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, [refresh]);

  return (
    <main className="room-screen">
      <h1>Choose your round.</h1>
      <p className="lead">Open TAPACITY lobbies on Monad Testnet appear here automatically.</p>
      {loading && <p className="room-message" role="status">Finding open rounds…</p>}
      {!loading && rooms.length === 0 && !error && (
        <section className="room-message" role="status">
          <h2>No open rounds yet</h2>
          <p>The host has not opened a lobby. This page updates automatically.</p>
        </section>
      )}
      {rooms.length > 0 && (
        <section className="room-list" aria-label="Open rounds">
          {rooms.map(({ id, state }) => (
            <Link className="room-card" href={`/?round=${id}`} key={id.toString()}>
              <span><strong>Round {id.toString()}</strong><small>Lobby open</small></span>
              <span><strong>{state.playerCount}/{state.maxPlayers}</strong><small>joined</small></span>
              <span className="room-arrow" aria-hidden="true">→</span>
            </Link>
          ))}
        </section>
      )}
      {error && <div className="room-error" role="alert"><p>{error}</p><button className="secondary-button" onClick={() => void refresh()}>Retry loading rounds</button></div>}
    </main>
  );
}
