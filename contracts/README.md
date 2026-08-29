# TAPACITY contract

`Tapacity.sol` keeps each player's taps in an independent storage lane and emits one `TapRecorded` event per accepted transaction. It does not update a global counter during play; totals and ranking are produced by `settleRound` after the reveal window.

## Local checks

```bash
forge fmt --check
forge build
forge test
```

## Monad Testnet

The scripts read secrets from the process environment and never from committed files.

```bash
PRIVATE_KEY=... forge script script/DeployTapacity.s.sol:DeployTapacity \
  --rpc-url monad-testnet --broadcast

PRIVATE_KEY=... TAPACITY_CONTRACT=0x... \
  forge script script/CreateRound.s.sol:CreateRound \
  --rpc-url monad-testnet --broadcast
```

Round defaults are 25 blocks of lead time, 50 live blocks (20 seconds at 400 ms), 25 reveal blocks, and 15 players. Override them with the `ROUND_*` variables used in `CreateRound.s.sol`.

Deployment is not complete until the exact address is verified on the Monad explorers.
