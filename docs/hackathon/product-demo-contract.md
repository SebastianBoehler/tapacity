# TAPACITY Product/Demo Contract

Deadline: Monad Blitz Amsterdam presentation, exact slot not yet recorded.
Internal feature freeze: at least 60 minutes before the presentation.
Demo rehearsal window: feature freeze through presentation.

## AI-native delivery budget

- **Committed core:** one zero-balance guest completes the fully sponsored Testnet loop, refreshes, and sees the same result; then prove five wallets and the room envelope.
- **Expected cycles:** contract kernel (green), Privy sponsored-submission adapter (green), guest auth (amber), commitment feed (amber), mobile path (amber), live proof/deploy (red).
- **Feasibility probes:** one wallet first; five only after it passes; roughly fifteen only after five pass.
- **Ranked expansion:** projector comprehension polish, PWA shell, then at most one same-kernel refinement.
- **Admission gate:** no expansion until the red-gate ledger entries are Verified.
- **Buffer:** deployment, submission, real replay capture, and repeated three-minute rehearsal.

## Audience memory

After the demo, a voter should say:

> TAPACITY turns a room of people into a live Monad execution experiment.

## Magic moment

- **Actor:** roughly fifteen audience members.
- **Action:** scan a QR code, continue as a guest, privately predict a tap count, and tap for one block-defined round.
- **Visible result:** the projector reveals the competitive leaderboard; each phone reveals its Chainprint; the projector then explains whole-round execution insights.
- **Onchain proof:** individually signed Testnet transactions and `GoalCommitted`, `TapRecorded`, `GoalRevealed`, and `RoundSettled` logs, interpreted through commitment-state subscriptions and linked to an explorer.
- **Why Monad matters:** rapid blocks/finality make state progression visible; independent per-player storage lanes deliberately support optimistic parallel execution. MonadDB enables node state and is not browser-benchmarked.

## Abstraction contract

- **Lowest stable primitive:** one accepted `tap(roundId)` transaction writes only the caller's player slot and emits one event.
- **Open input:** bounded block durations, participant wallets, optional nicknames, committed goals, and salts.
- **Closed execution:** Monad Testnet `10143`; one active player record per round; block-bounded taps/reveals; deterministic settlement; finalized canonical data alone scores.
- **Temporarily enumerated facts:** Privy's sponsored send path, a separate public read/WebSocket feed, and a room-size settlement loop.
- **Extension check:** a second 30-second round changes round parameters, not the tap or settlement kernel.

## Canonical journey

Given a zero-balance Privy guest wallet and app sponsorship, when the player commits a goal, submits rapid individually signed sponsored taps, automatically reveals, and the round is settled, then the same finalized score and evidence reappear after refresh.

It must not silently batch physical taps, count speculative or late taps, reveal goals before settlement, route each transaction randomly, or claim to benchmark Monad's maximum throughput.

## Reveal sequence

1. Projector: competitive leaderboard.
2. Phone: rank, goal versus finalized taps, accuracy, attempted/submitted/finalized/late/failed counts, peak rate, median tap-to-finality, busiest block, and explorer links.
3. Projector: finalized transactions, peak TAPACITY TPS, active independent lanes, finalization rate/latency, observed Testnet TPS/share during the round, documented-capacity room equivalent, and a concise architecture explanation.

Measured application results and documented protocol capacity are labeled separately.

## Scope

### Must build

- Block-defined 20-second default round (50 blocks at the current 400 ms cadence), configurable to 30 seconds.
- `keccak256(abi.encode(roundId, player, goal, salt))` commit/reveal with device-local salt.
- Score: `taps * min(goal,taps) / max(goal,taps)` using scaled integer accuracy.
- Ties: score, accuracy, finalized taps, earlier final qualifying tap, then address only as a deterministic final fallback.
- Permissionless `settleRound` after a short reveal window.
- Privy guest wallet with app-sponsored `joinRound`, every `tap`, `revealGoal`, and settlement transaction. The participant holds no MON and never pays gas or transfers value.
- Tight transaction policy restricted to chain `10143`, the TAPACITY contract, zero value, approved methods, and bounded sponsorship spend.
- Honest attempted/submitted/proposed/voted/finalized/late/failed telemetry. Sponsorship rejection or rate limiting is shown as failure and never falls back to participant-paid gas.
- `monadLogs`/`monadNewHeads` commitment handling with speculative proposals clearly marked.
- Bounded contract reads/log replay plus same-device session recovery; no application database.
- Mobile play path and projector reveal path sufficient for the three-minute demo.

### Must not build

- External database/indexer, self-hosted node, Execution Events SDK, tokens/NFTs/DEX, VRF/oracles, x402, ERC-8004, ERC-6551, autonomous agents, or generic analytics.
- A global total updated on every tap, silent batching, mock success data, speculative score, or maximum-throughput claim.
- Dashboard polish before the one-player red gate passes.

### Must remain unchanged

- Existing submission history and the primary-source memo in `docs/research/`.
- Live demo remains primary; a real onchain replay/video is captured only after it works.

## Acceptance evidence

### Essential contract tests

- Taps are accepted only in `[startBlock, endBlock)`; late taps revert.
- Reveal succeeds only for the exact committed round/player/goal/salt in `[endBlock, revealEndBlock)`.
- Scaled score and ordering are deterministic across score, accuracy, taps, last qualifying block, and address.
- Settlement is permissionless only after the reveal window and never writes a shared total during taps.

### Critical seam check

- One integration test exercises the sponsored-send adapter and classifies emitted logs without duplicate logical submissions or invented success.

### Deployed red gate

- One real zero-balance guest: sponsored join/commit -> 20-second sponsored tap burst -> commitment feed -> sponsored automatic reveal -> finalized score -> refresh reconstruction.
- Record signing latency, attempted/submitted/accepted/finalized/late/failed, nonce gaps, 429s, p50/p95 tap-to-finality, and sustainable per-wallet rate.
- Repeat with five wallets, then the intended room envelope on venue Wi-Fi.

### Failure behavior

- If a physical tap cannot be submitted, keep attempted/submitted/finalized separate and score only finalized accepted taps.
- After the live path works, capture a real onchain replay/video; never replace chain evidence with mock data.

## Completion ledger

| Capability | State | Evidence |
|---|---|---|
| Product/demo contract | Specified | This document |
| Contract kernel | Verified | Three focused Foundry tests pass; production build succeeds |
| Sponsored transaction submission | Verified | Three critical-seam checks pass, including no paid retry and commitment progression |
| Commitment-state feed | Implemented | `monadLogs` replay/live tracking plus `monadNewHeads` supersession; live endpoint payload probed, app E2E pending |
| Privy zero-balance guest | Implemented | Guest and sponsored-call code compiles; real app credentials absent |
| Refresh reconstruction | Implemented | Finalized reads, bounded logs, and same-device commitment restore compile; live refresh proof pending |
| One-player Testnet loop | Implemented | Browser path and honest configuration state compile; real sponsored loop pending credentials/deployment |
| Five-wallet load probe | Specified | Admitted only after one-player pass |
| Room-envelope probe | Specified | Admitted only after five-wallet pass |
| Vercel deployment | Specified | Intended public environment |
| Three-minute demo | Specified | Exact reveal sequence and fallback above |

## Open assumptions

- The presentation slot must be added as soon as it is known; freeze remains T-60 minutes minimum.
- Privy guest accounts and app-pays sponsorship must be enabled in the dashboard, and a project app ID/credentials are not present locally yet.
- Native sponsorship uses Privy's EIP-7702/paymaster path. It is intentionally not described as direct public-RPC raw-byte broadcast.
- Privy's client-sponsored transaction rate limit and venue network behavior are unknown until the live probes measure them.
- If sponsored throughput is below physical tapping speed, TAPACITY preserves one-transaction-per-submitted-tap semantics and reports attempted versus submitted honestly; it never charges the participant.
