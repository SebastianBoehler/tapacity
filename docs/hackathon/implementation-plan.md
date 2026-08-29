# TAPACITY Vertical-Slice Plan

Every step is one bounded AI cycle: specify -> edit -> run the named check -> inspect -> correct or stop.

## 0. Contract and tooling baseline

- Preserve the submission README and research memo.
- Scaffold `contracts/` with Foundry Monad configuration and `web/` with Next.js App Router, TypeScript ES2020, and pnpm.
- Keep application files below the 300 LOC soft limit.
- **Check:** clean tool resolution, `forge build`, and `pnpm lint`.

## 1. Contract kernel (committed core)

- Public seam: create a round, join with commitment, tap, reveal, settle, read round/player/ranking. Player calls transfer no value.
- Red/green slices: block window; exact commitment; scaled score and deterministic ordering; permissionless settlement.
- Store taps per player. Aggregate totals only in settlement.
- **Check:** focused Foundry invariant tests, including Monad execution configuration.

## 2. Sponsored transaction seam (committed core)

- A narrow adapter invokes Alchemy Wallet APIs with sponsorship enabled for every tap operation and never retries through participant-paid gas.
- Resolve a counterfactual smart account from the device-local owner key and use a distinct nonzero nonce key per physical tap for parallel submission.
- Restrict sponsorship to chain `10143`, zero value, the deployed TAPACITY contract, approved calldata, and a bounded policy.
- Separate sponsored submission from read/commitment WebSocket traffic and classify provider/rate-limit failures without inventing success.
- **Check:** one integration test with controlled sponsored-send responses and canonical emitted logs.

## 3. One-player browser path (committed core, red gate)

- Privy guest creation, optional nickname, device-local goal/salt, and zero-balance sponsored join/tap/reveal.
- Large mobile tap zone and one cell per goal; attempted, submitted, and finalized remain distinct.
- Automatic reveal, settlement result, explorer links, and bounded refresh reconstruction.
- **Check:** browser smoke plus one real Testnet probe with the full metric record.

## 4. Commitment feed (committed core, red gate)

- Subscribe to `monadNewHeads` and filtered `monadLogs`.
- Key speculative events by block hash/height and advance proposed -> voted -> finalized; supersede losing proposals honestly.
- Reconcile refresh by contract reads and paginated bounded logs.
- **Check:** one-player finalized counts exactly match canonical contract state before and after refresh.

## 5. Scale probes (gated)

- Run five wallets only after one wallet passes; run intended room envelope only after five pass.
- Measure sustainable signing/submission/finality under actual endpoint and venue-NAT constraints.
- **Check:** saved real probe report with nonce gaps, rate limits, p50/p95, and honest throughput ceiling.

## 6. Projector and reveal polish (after red gate)

- Implement the approved three-stage reveal in restrained carbon/violet/cyan telemetry styling.
- Keep protocol-capacity facts separate from measured application/network observations.
- **Check:** uninformed observer can repeat the audience-memory sentence and identify the platform-native mechanism.

## 7. Freeze and proof

- Deploy verified contract and verified web revision; publish repository and submission fields.
- Rehearse the exact three-minute live path repeatedly.
- Capture a real onchain replay/video and screenshots only after the live path works.
- **Check:** deployed canonical path rehearsed; fallback opens without changing evidence claims.

## Stop rules

- After two failed convergence cycles on a nonessential capability, cut it.
- Do not admit projector polish while any one-player red-gate item is merely Implemented.
- At T-60 minutes, only exact-path blockers, compliance fixes, and false/unsafe claim corrections may change.
