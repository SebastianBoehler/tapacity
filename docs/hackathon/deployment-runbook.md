# TAPACITY Deployment Runbook

## Current red gate

The replacement contract is verified at `0x6adA9a80D616Ce2Bd0FAaf0dD26c52E8f7985241`. Privy, Alchemy Gas Manager, and Vercel configuration exist. The zero-balance sponsored operation probe passed; the remaining deployment gate is the exact multi-browser Privy journey.

## Contract

1. Export a dedicated Monad Testnet deployer `PRIVATE_KEY` with enough Testnet MON.
2. Run the focused checks in `contracts/README.md`.
3. Broadcast `DeployTapacity` through the named `monad-testnet` RPC.
4. Verify the exact address through the monskills multi-explorer verification API; use Monad's Sourcify flow only if that API fails.
5. Set `NEXT_PUBLIC_TAPACITY_CONTRACT` to that verified address.

## Guest and gas sponsorship

1. Create or select the TAPACITY app and enable guest accounts with embedded wallets.
2. Sponsor low-rate controller calls (`joinRound` and `revealGoal`) through Privy.
3. Use Alchemy policy `7fdb948f-a078-458f-85ee-fa092ab5a2a4` for counterfactual smart-account tap operations on Monad Testnet.
4. Keep each physical tap as one `sendCalls` request containing one zero-value `tap(roundId)` call and a distinct nonce key. Alchemy may pack user operations into an outer transaction; the app does not batch them.

## Red-gate proof

1. Create a 50-block round with enough lead time for the phone to join.
2. Use a new zero-balance guest and verify sponsored join, rapid smart-account taps, automatic sponsored reveal, sponsored settlement, and refresh reconstruction.
3. Record attempted/submitted/finalized/late/failed counts, 429s, signing latency, finality p50/p95, and nonce gaps.
4. Repeat with five wallets only after the one-wallet record passes; run the room envelope only after five pass.
5. Link the Vercel project and deploy only after the live Testnet path is green.
