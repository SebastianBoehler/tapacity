# TAPACITY Tiny GDD

## Classification

UI-heavy competitive microgame. The committed Next.js/DOM stack is the stable runtime; Phaser/canvas would add a second rendering model without improving the one-button mechanic.

## Fantasy and brand story

You are an execution lane inside a live Monad round. Your pressure becomes individually sponsored transactions, and their visible progress turns chain architecture into the game surface.

## Session

- Lobby: scan, create a guest, optionally choose a nickname, privately commit a goal.
- Game: one block-defined execution window, 50 blocks by default (20 seconds at the current 400 ms cadence).
- Reveal: the app automatically reveals the device-held goal secret.
- Result: leaderboard first, personal Chainprint second, room architecture insight third.

## Player verb and controls

- Primary verb: tap/press the large bottom execution zone.
- Touch/pointer: pressure zone reacts on pointer-down for low input latency.
- Keyboard equivalent: Space or Enter while the native button is focused.
- Every physical input increments Attempted. Only a successfully sponsored request increments Submitted. Only finalized accepted contract events score.

## Win, loss, and scoring

- Score = finalized taps × scaled goal accuracy.
- Goal accuracy = `min(goal, taps) / max(goal, taps)`.
- Ranking ties: accuracy, finalized taps, earlier last qualifying block, then address.
- There is no fake loss state: rate-limited, rejected, and late transactions stay visible and do not score.

## State model

Input is local and immediate; tap submission is Alchemy-sponsored while join/reveal use the Privy controller; proposed/voted/finalized are Monad commitment states; settlement is deterministic contract state. UI animation may react to speculative state, but score and Chainprint use finalized canonical state.

## Rendering and feedback

- DOM/CSS renders dense HUD text and the goal-length transaction track.
- Carbon black is environment, violet means pending/speculative, cyan means finalized, and text labels repeat every color meaning.
- High-frequency tapping avoids decorative per-input animation. Counters, cells, pressure color, and optional haptics provide interruptible feedback.

## Verification

- Build/typecheck and focused adapter tests.
- Browser smoke at narrow mobile width: guest -> commit -> tap -> reveal -> result.
- Touch, keyboard, 200% zoom, reduced motion, and 320 px reflow.
- Capture a screenshot only from the running real-state UI; no mock result data.
