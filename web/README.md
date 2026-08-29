# TAPACITY web

The App Router client owns the participant journey: Privy guest creation, local commit/reveal secret, fully app-sponsored zero-value contract calls, `monadLogs`/`monadNewHeads` commitment telemetry, and bounded finalized-state reconstruction.

## Configuration

Copy `.env.example` to `.env.local` and set:

- `NEXT_PUBLIC_PRIVY_APP_ID`: a Privy app with guest accounts and native gas sponsorship enabled for Monad Testnet.
- `NEXT_PUBLIC_PRIVY_CLIENT_ID`: the Privy web client restricted to the deployed app origin.
- `NEXT_PUBLIC_TAPACITY_CONTRACT`: the verified Testnet deployment.
- `NEXT_PUBLIC_ALCHEMY_API_KEY`: the domain-restricted Wallet APIs key.
- `NEXT_PUBLIC_ALCHEMY_POLICY_ID`: an active Monad Testnet Gas Manager policy.

Privy sponsors the low-rate controller calls. Alchemy Gas Manager sponsors one zero-value smart-account call per tap with a distinct nonce key. A rejected sponsorship remains a visible failure; the client never retries with participant funds or silently batches physical taps.

## Checks

```bash
pnpm install
pnpm test
pnpm lint
pnpm build
pnpm dev
pnpm probe:sponsored
```

Open `/?round=<roundId>`. Without real configuration the page deliberately renders an error state rather than demo data.
