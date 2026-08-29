# TAPACITY Deployment Runbook

## Current red gate

No Privy app ID, deployment signer, contract address, or Vercel project is available in the local environment. GitHub and Vercel CLI authentication are valid. Do not deploy the unconfigured shell or replace the missing chain path with user-funded transactions.

## Contract

1. Export a dedicated Monad Testnet deployer `PRIVATE_KEY` with enough Testnet MON.
2. Run the focused checks in `contracts/README.md`.
3. Broadcast `DeployTapacity` through the named `monad-testnet` RPC.
4. Verify the exact address through the monskills multi-explorer verification API; use Monad's Sourcify flow only if that API fails.
5. Set `NEXT_PUBLIC_TAPACITY_CONTRACT` to that verified address.

## Privy

1. Create or select the TAPACITY app and enable guest accounts with embedded wallets.
2. Enable native gas sponsorship on Monad Testnet.
3. Restrict the sponsorship policy to chain `10143`, the verified contract, zero value, the four required methods, and a bounded total spend.
4. Put only the public app ID in `NEXT_PUBLIC_PRIVY_APP_ID`; no participant secret or funding key belongs in the browser.

## Red-gate proof

1. Create a 50-block round with enough lead time for the phone to join.
2. Use a new zero-balance guest and verify sponsored join, rapid sponsored taps, automatic sponsored reveal, sponsored settlement, and refresh reconstruction.
3. Record attempted/submitted/finalized/late/failed counts, 429s, signing latency, finality p50/p95, and nonce gaps.
4. Repeat with five wallets only after the one-wallet record passes; run the room envelope only after five pass.
5. Link the Vercel project and deploy only after the live Testnet path is green.
