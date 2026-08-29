# TAPACITY: Monad feature fit

Research snapshot: 2026-08-29. Primary sources only.

## Recommendation

The honest Monad story is not “we put a counter on a chain.” It is:

> Fifteen phone wallets create a burst of individually signed transactions; the
> projected course shows each action progress from local input to proposed block
> to finality, while Monad executes independent player lanes in parallel.

Commit these four things:

1. **A block-driven 20/30-second round** on Monad Testnet, using start/end block
   numbers rather than trusting phone clocks.
2. **One intended sponsored transaction per physical tap**, with separate local,
   submitted, proposed and finalized counters. This remains a measured feasibility
   gate because wallet/sponsor throughput can bottleneck before Monad does.
3. **Per-player contract state, no hot global tap counter.** Derive the room total
   from logs during play and sum player counters once during settlement.
4. **A live `monadNewHeads`/`monadLogs` dashboard** that visibly follows Monad's
   commitment states. Only finalized taps score.

Guest wallets and sponsorship make the experience possible, but they are provider
infrastructure rather than unique Monad protocol features. Say that plainly.

## Current Testnet facts

- Monad Testnet is chain ID `10143`, currently documented as `v0.15.2` /
  `MONAD_NINE`; it was reset from genesis on 2025-12-16. The official public
  QuickNode endpoint exposes HTTP and WebSocket, with a documented 50 requests/s,
  batch size 100, and archive support. [Testnet network information](https://docs.monad.xyz/developer-essentials/testnet)
- Current Monad documentation states **300 ms blocks**, **600 ms finality** and
  10,000 TPS protocol throughput. A block moves from Proposed to Voted after one
  block and Finalized after two. Provider, signing, mempool and inclusion latency
  are additional; do not promise every finger tap finalizes in exactly 600 ms.
  [Monad introduction](https://docs.monad.xyz/) · [Transaction lifecycle](https://docs.monad.xyz/monad-arch/transaction-lifecycle)
- A spot check against the official Testnet RPC during this research observed 20
  blocks in 6 seconds (300 ms average) around block 57,885,449, and the public
  WebSocket accepted a `monadNewHeads` subscription. This is evidence, not an SLA.
- At nominal cadence, 20 seconds is about 67 blocks and 30 seconds is 100 blocks.
  Configure the contract in blocks; the UI may present an approximate duration.

## A. Must-use, visible Monad features

| Feature | Material use in TAPACITY | Constraint / honest claim |
| --- | --- | --- |
| 300 ms blocks and two-block finality | The projector renders a moving block rail and transitions tap particles through proposed, voted and finalized states. A round can visibly settle within the pitch. | “Finality” is a consensus state, not the time from finger input. Track local/submission/provider latency separately. |
| Monad commitment-state subscriptions | Use `monadNewHeads` and preferably filtered `monadLogs` to receive the same proposed data as Geth subscriptions plus later `commitState` updates. | Proposed data is speculative. A losing proposal has no explicit abandonment event; a different finalized block at the same height supersedes it. Final score waits for `Finalized`. |
| Optimistic parallel execution | Each wallet increments `players[roundId][msg.sender].taps`, so different players write different slots. Fifteen wallets create useful independent lanes. | Monad preserves Ethereum's linear transaction semantics. Conflicts cause re-execution. Transactions from one wallet remain nonce-ordered and repeatedly write that player's own slot; do not call one player's taps parallel. |
| EVM compatibility with Monad-specific tooling | Keep the contract small and conventional Solidity, but test with Foundry's Monad execution environment and deploy/verify on Testnet. | Use official Foundry v1.8+ with `network = "monad"`; generic EVM simulation is not the strongest compatibility check. |

Sources: [real-time sources](https://docs.monad.xyz/monad-arch/realtime-data/data-sources),
[speculative real-time data](https://docs.monad.xyz/monad-arch/realtime-data/spec-realtime),
[JSON-RPC/WebSocket behavior](https://docs.monad.xyz/reference/json-rpc/overview),
[parallel execution](https://docs.monad.xyz/monad-arch/execution/parallel-execution),
[Foundry deployment](https://docs.monad.xyz/guides/deploy-smart-contract/foundry).

### Contract shape that preserves the parallel story

```solidity
mapping(uint256 roundId => mapping(address player => Player)) players;

function tap(uint256 roundId) external {
    // Validate membership and the shared read-only block window.
    players[roundId][msg.sender].taps += 1; // distinct slot per player
    emit TapRecorded(roundId, msg.sender, players[roundId][msg.sender].taps);
}
```

Do **not** increment `round.totalTaps` on every tap. That shared write is an
avoidable conflict. The dashboard can aggregate `TapRecorded` logs; settlement can
sum roughly fifteen stored player counts once.

## B. Enabling infrastructure

### Privy guest embedded wallets

- Privy guest accounts require no normal login flow, are locally persisted on the
  same device, include a fully functional embedded wallet and expire after 30 days.
  This implements `QR -> Continue as Guest -> play` without an extension, seed
  phrase, email or phone. [Privy guest accounts](https://docs.privy.io/recipes/react/guest-accounts)
- Monad's own wallet-infrastructure directory marks Privy supported on Testnet and
  says Privy subsidizes Monad Testnet usage; it directs builders to
  `monad@privy.io`. [Monad embedded-wallet providers](https://docs.monad.xyz/tooling-and-infra/wallet-infra/embedded-wallets)

### EIP-7702 native gas sponsorship

- Privy's app-pays sponsorship explicitly supports Monad Testnet and uses EIP-7702
  plus paymasters on EVM networks; the client request opts in with `sponsor: true`.
  Users need no MON. [Privy sponsorship overview](https://docs.privy.io/wallets/gas-and-asset-management/gas/overview) ·
  [setup](https://docs.privy.io/wallets/gas-and-asset-management/gas/setup)
- Monad supports type-4 EIP-7702 transactions. A Monad-specific caveat is that a
  delegated EOA cannot execute a transaction that decreases its balance below 10
  MON, although a zero/low-balance delegated account may be called by a sponsor if
  its balance does not decrease. TAPACITY sends no value, so the intended call fits
  that caveat. [EIP-7702 on Monad](https://docs.monad.xyz/developer-essentials/eip-7702)
- Privy's developer plan currently includes 50,000 monthly embedded-wallet
  signatures, but gas fees/credits are a separate concern. Confirm the Testnet
  subsidy or sufficient credits in the dashboard before rehearsal.
  [Privy pricing](https://www.privy.io/pricing)

### Critical sponsorship limitation

Privy says it **aggressively rate-limits transactions sent from the client** and
recommends backend routing for more control. It does not publish a burst limit on
that page. Therefore:

1. Build a one-wallet 20-second sponsored burst probe first.
2. Measure local taps, signing responses, submitted operations, proposed logs,
   finalized logs, reverts and late inclusions.
3. Repeat with at least 5 and preferably 15 simultaneous guest wallets on venue
   Wi-Fi.
4. Only then advertise “every tap is a transaction.”

[Privy sponsorship security](https://docs.privy.io/wallets/gas-and-asset-management/gas/security)

Privy policies can restrict `eth_sendTransaction` by chain, destination contract,
value and decoded calldata. Allow only chain `10143`, the TAPACITY contract, zero
value, and required methods; set a hard sponsorship cap/circuit breaker.
[Privy Ethereum policy examples](https://docs.privy.io/controls/policies/example-policies/ethereum)

### Live data and database-free recovery

- The host browser connects directly to `wss://testnet-rpc.monad.xyz`; no Vercel
  WebSocket server or database is required.
- On refresh, read round/player state and replay `TapRecorded`, `GoalCommitted`,
  `GoalRevealed` and settlement logs from the round's creation block, then resume
  subscriptions. Monad recommends indexers for large/read-heavy history, but one
  short round is bounded. Public `eth_getLogs` ranges are provider-limited, so
  paginate (the documented QuickNode limit is 100 blocks).
  [Monad high-performance app guidance](https://docs.monad.xyz/developer-essentials/best-practices) ·
  [JSON-RPC limits](https://docs.monad.xyz/reference/json-rpc/overview)
- Monad has no `newPendingTransactions` subscription, and a mempool transaction
  returns `null` from transaction-hash lookup. The UI's “submitted” count must come
  from local/Privy responses; “proposed/finalized” comes from chain logs.

### Hidden goal without a database

A plain onchain `goal` is public even if the UI hides it. Use a real commitment:

```text
commitment = keccak256(roundId, player, goal, salt)
```

Store `goal` and `salt` in same-device local storage, then automatically reveal
them in a transaction after the tap window. Same-browser refresh works because both
the Privy guest account and the secret persist locally. Losing browser storage before
reveal is intentionally unrecoverable without adding trusted escrow/backend state.

Game settlement must occur **after** the tap deadline: close taps at `endBlock`,
allow a short reveal grace period, then let anyone call deterministic settlement.
“Finalize” should be named `settleRound` in the contract/UI to avoid confusing it
with Monad block finality.

The combined score can be computed entirely onchain after reveal. A simple candidate
that rewards both throughput and calibration is:

```text
accuracy = min(goal, taps) / max(goal, taps)
score    = taps * accuracy
```

Use scaled integer math and lock the exact tie-breaker before implementation.

## C. Optional expansion after the core works

- **PWA/offline shell:** Monad publishes an official Next.js + Serwist + Privy PWA
  template. It can keep the shell/QR page available on unstable Wi-Fi, but it cannot
  make onchain taps work offline. [Official PWA template](https://docs.monad.xyz/templates/next-serwist-privy-embedded-wallet)
- **Humorous agent competitor:** one controlled wallet can tap with the same contract
  path after human burst reliability is proven. It must not become an agent-platform
  project.
- **Second round / dynamic duration:** reuse the same contract with configurable
  block windows only after the primary 20/30-second run is rehearsed.
- **VRF bonus modifier:** Gelato VRF, Pyth Entropy/VRF, Supra dVRF and Switchboard VRF
  are documented on Testnet, but current scoring needs no randomness. Add only if a
  later mechanic genuinely depends on unpredictable randomness.
  [Monad oracle/VRF support](https://docs.monad.xyz/tooling-and-infra/oracles)
- **Winner badge:** a post-score NFT is possible but adds no proof to the core demo.

## D. Reject as scope theatre

- **Execution Events SDK:** fastest feed, but requires C/C++/Rust software running
  beside a self-hosted Monad node on the same machine. Public WebSocket subscriptions
  already satisfy a 15-player room. [Real-time source comparison](https://docs.monad.xyz/monad-arch/realtime-data/data-sources)
- **Indexer/database for the first demo:** unnecessary for one bounded round and
  violates the desired chain-as-record architecture.
- **Oracle/VRF in deterministic scoring:** no offchain fact or randomness is needed.
- **x402, ERC-8004 agents, ERC-6551 accounts, DEX integration, tradable token or NFT
  economy:** none materially enables tap calibration; each weakens the three-minute
  explanation.
- **A global onchain total updated on every tap:** contradicts the parallel-state
  design and creates a shared conflict.
- **“Monad handled X TPS” on the dashboard:** report **TAPACITY app finalized tx/s**,
  block inclusion and provider losses. Do not present a small application burst as a
  benchmark of the chain's maximum capacity.
- **Treating proposed logs as final:** useful for animation, wrong for scoring.

## Build gate

Proceed with the full game only after this vertical slice succeeds on live Testnet:

`guest account -> goal commitment -> 20 s sponsored burst -> monadLogs dashboard ->`
`automatic reveal -> finalized deterministic score -> refresh reconstruction`.

The pass condition is measured, not visual: no missing finalized logs, correct
per-wallet counts, correct late-tap rejection, correct score after refresh, and a
documented sustainable per-wallet tap rate. If the provider path cannot sustain one
transaction per finger tap, change the mechanic or label accepted-chain taps honestly;
do not silently batch while claiming every tap was onchain.
