# TAPACITY Product/Demo Contract

Deadline: Monad Blitz Amsterdam presentation, exact slot not yet recorded.
Internal feature freeze: at least 60 minutes before the presentation.
Demo rehearsal window: feature freeze through presentation.

## AI-native delivery budget

- **Committed core:** one zero-cost guest completes the app-funded Testnet loop, refreshes, and sees the same result; then prove five wallets and the room envelope.
- **Expected cycles:** contract kernel (green), raw transaction adapter (green), guest auth (green), commitment feed (green), mobile path (green), one-player live proof/deploy (green).
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

Given a Privy guest session, when the player commits a goal, receives an app-funded temporary game wallet, submits rapid individually signed raw taps, automatically reveals, and the round is settled, then the same finalized score and evidence reappear after refresh.

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
- Privy guest session with app-sponsored `joinRound` and `revealGoal`; the round treasury funds a device-local game wallet for direct raw `tap` transactions. The participant supplies no MON and never pays.
- Tight transaction policy restricted to chain `10143`, the TAPACITY contract, zero-value calls, explicit nonces, and a 90,000 gas limit per tap.
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

- One integration seam exercises local signing, explicit nonce allocation, exact raw-byte RPC retry, and commitment classification without duplicate logical submissions or invented success.

### Deployed red gate

- One real zero-cost guest: sponsored join/commit -> treasury funding -> 20-second direct raw tap burst -> commitment feed -> automatic reveal -> finalized score -> refresh reconstruction.
- Record signing latency, attempted/submitted/accepted/finalized/late/failed, nonce gaps, 429s, p50/p95 tap-to-finality, and sustainable per-wallet rate.
- Repeat with five wallets, then the intended room envelope on venue Wi-Fi.

### Failure behavior

- If a physical tap cannot be submitted, keep attempted/submitted/finalized separate and score only finalized accepted taps.
- After the live path works, capture a real onchain replay/video; never replace chain evidence with mock data.

## Completion ledger

| Capability | State | Evidence |
|---|---|---|
| Product/demo contract | Specified | This document |
| Contract kernel | Verified | Four focused Foundry tests pass, including treasury funding and controller-authorized reveal |
| Raw tap submission | Verified | Six web checks pass; exact signed bytes retry across sticky RPCs without participant-paid fallback |
| Commitment-state feed | Verified | Production run showed proposed/voted/finalized progression and canonical finalized scoring |
| Privy zero-cost guest | Verified | Production guest joined with no wallet extension or participant funds |
| Refresh reconstruction | Implemented | Finalized reads, bounded logs, and same-device commitment restore compile; explicit refresh rehearsal remains |
| One-player Testnet loop | Verified | Round 3: 31 attempted/submitted, 15 finalized in-window, automatic reveal, settlement, and Chainprint |
| Five-wallet load probe | Specified | Admitted only after one-player pass |
| Room-envelope probe | Specified | Admitted only after five-wallet pass |
| Host room control | Verified | Production `/host` created round 3, showed joined count, and started a synchronized 2.4-second observed countdown |
| Vercel deployment | Deployed | `https://web-alpha-six-19.vercel.app` on contract `0xbf190f2f02C0661F4e21A869C7b7B5548cC069E6` |
| Three-minute demo | Implemented | Player loop works; projector leaderboard and whole-round insight view remain |

## Open assumptions

- The presentation slot must be added as soon as it is known; freeze remains T-60 minutes minimum.
- Privy guest accounts and app-pays sponsorship are enabled for the deployed origins; Privy is not in the rapid tap path.
- Public read calls are batched and tab-sticky across QuickNode, Ankr, and Monad Foundation. Venue network behavior still requires the five-wallet and room probes.
- The live raw path preserves one-transaction-per-submitted-tap semantics and reports attempted, submitted, finalized, late, and failed separately; it never charges the participant.
