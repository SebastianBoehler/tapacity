import type { RoundState } from "@/lib/contract/use-chain-state";
import type { GoalSession } from "@/lib/session/goal-session";
import { Header } from "./player-ui";

export function PlayerSetup({
  roundId,
  feed,
  round,
  goal,
  nickname,
  busy,
  session,
  error,
  onGoal,
  onNickname,
  onJoin,
}: {
  roundId: bigint;
  feed: string;
  round: RoundState;
  goal: string;
  nickname: string;
  busy: boolean;
  session: GoalSession | null;
  error?: string;
  onGoal: (goal: string) => void;
  onNickname: (nickname: string) => void;
  onJoin: () => void;
}) {
  return (
    <main className="setup-screen">
      <Header roundId={roundId} feed={feed} />
      <h1>Predict your taps.</h1>
      <p className="cost-note">{round.playerCount} joined · capacity {round.maxPlayers} · host starts the shared round</p>
      <form className="setup-form" onSubmit={(event) => { event.preventDefault(); onJoin(); }}>
        <label htmlFor="goal">Goal<input id="goal" name="goal" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={3} placeholder="50" required value={goal} onFocus={(event) => event.currentTarget.select()} onChange={(event) => onGoal(event.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, ""))} /></label>
        <label htmlFor="nickname">Nickname · optional<input id="nickname" name="nickname" autoComplete="nickname" maxLength={16} value={nickname} onChange={(event) => onNickname(event.target.value)} /></label>
        <button type="submit" className="primary-button" disabled={busy || round.startBlock !== 0n}>
          {busy ? "Sponsoring commitment…" : session ? "Resubmit commitment" : "Lock goal"}
        </button>
      </form>
      <p className="cost-note">App-sponsored. Zero value. Your goal stays hidden until reveal.</p>
      {error && <p className="error-note" role="alert">{error}</p>}
    </main>
  );
}
