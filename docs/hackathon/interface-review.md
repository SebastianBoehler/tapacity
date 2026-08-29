# TAPACITY Interface Review

Scope: entry, configuration, guest join, private goal setup, live player screen, and Chainprint. The projector surface remains gated behind the one-player Testnet proof.

## Accessibility

- Native buttons, inputs, labels, forms, headings, `main`, and `header` landmarks provide the interaction semantics.
- Touch targets are at least 56 px. The tap zone is a native button with pointer-down plus Space/Enter support and visible focus.
- Transaction states have text counters and a screen-reader summary; color is not the only carrier.
- High-frequency telemetry is not live-announced on every tap. Errors remain assertive alerts.
- Reduced-motion and forced-colors rules are present. The reachable page reflows at a 320 px CSS viewport with no horizontal overflow.
- Full guest-to-result assistive-technology verification remains blocked on the real Privy app and deployed round.

## Layout

- Mobile is the canonical surface. The fixed pressure zone uses 33% of the dynamic viewport plus safe-area padding.
- Content reserves bottom space for the pressure zone, and desktop width is deliberately capped rather than stretching a phone game into a dashboard.
- Goal cells use an auto-filling grid for 1–200 cells; telemetry uses a fixed five-column scan line.

## Writing

- Eyebrows were removed throughout the app.
- Entry copy explicitly says no MON and no gas payment. Sponsorship failures are presented as failures, not retried through participant funds.
- Setup explains that the goal is private and device-held. The unconfigured state explicitly refuses demo data.

## Typography

- Proportional Geist carries primary content; monospaced Geist is restricted to transaction telemetry, identifiers, and numeric results.
- Large headings use tight display spacing; functional phase titles use ordinary sentence case rather than eyebrow styling.
- Tabular numerals stabilize changing block and transaction counts.

## Colors

- Carbon is the environment, violet is sponsored/pending activity, and cyan is canonical finality.
- Runtime contrast checks on the reachable state measured 18.60:1 for primary text, 8.74:1 for muted text, and 12.61:1 for cyan telemetry.
- Violet action surfaces use carbon text at 6.61:1; the earlier light-on-violet combination was rejected at 2.82:1.

## UI behavior

- Attempted increments locally on input; Submitted changes only after Privy returns a hash; Proposed/Voted/Finalized come from Monad commitment data.
- Superseded speculative proposal logs are removed when a competing Voted/Finalized head wins.
- Refresh combines finalized contract reads, bounded round logs, and the same-device goal/attempt record.
- Chainprint derives late/failed outcomes from receipts and canonical hashes; unavailable observed-finality data renders as `—`.

## Considered but rejected

| Pattern | Reason |
|---|---|
| Eyebrow labels | Explicitly rejected by product direction; they added hierarchy noise. |
| Phaser/canvas runtime | The one-button, telemetry-heavy loop benefits from DOM semantics and does not need physics. |
| Per-tap decorative particles | Adds frame and attention cost during the transaction burst. |
| Color-only transaction cells | Fails non-visual comprehension; aggregate text remains present. |
| Live-announcing every counter change | Would flood assistive technology during rapid tapping. |
| Mock result states for screenshots | Conflicts with the evidence standard; real guest/result visuals wait for the deployed path. |
