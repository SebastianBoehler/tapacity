# TAPACITY web

The App Router client owns the participant journey: Privy guest creation, local commit/reveal secret, fully app-sponsored zero-value contract calls, `monadLogs`/`monadNewHeads` commitment telemetry, and bounded finalized-state reconstruction.

## Configuration

Copy `.env.example` to `.env.local` and set:

- `NEXT_PUBLIC_PRIVY_APP_ID`: a Privy app with guest accounts and native gas sponsorship enabled for Monad Testnet.
- `NEXT_PUBLIC_TAPACITY_CONTRACT`: the verified Testnet deployment.

Privy's dashboard policy must be limited to chain `10143`, the exact contract address, zero native value, and the `joinRound`, `tap`, `revealGoal`, and `settleRound` methods with a bounded spend limit. A rejected sponsorship remains a visible failure; the client never retries with participant funds.

## Checks

```bash
pnpm install
pnpm test
pnpm lint
pnpm build
pnpm dev
```

Open `/?round=<roundId>`. Without real configuration the page deliberately renders an error state rather than demo data.
