import { alchemyWalletTransport, createSmartWalletClient } from "@alchemy/wallet-apis";
import {
  createPublicClient,
  encodeAbiParameters,
  encodeFunctionData,
  formatEther,
  http,
  keccak256,
  parseAbi,
  sliceHex,
  stringToHex,
  toHex,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { monadTestnet } from "viem/chains";
import { writeFile } from "node:fs/promises";

const APP_URL = process.env.LOAD_TEST_APP_URL ?? "https://web-alpha-six-19.vercel.app";
const PLAYERS = Number(process.env.LOAD_TEST_PLAYERS ?? 15);
const TAPS_PER_PLAYER = Number(process.env.LOAD_TEST_TAPS_PER_PLAYER ?? 24);
const TAP_RATE = Number(process.env.LOAD_TEST_TAP_RATE ?? 8);
const ADMIN_RESERVE_MON = Number(process.env.LOAD_TEST_ADMIN_RESERVE_MON ?? 50);
const REPORT_PATH = process.env.LOAD_TEST_REPORT_PATH;
const contract = process.env.NEXT_PUBLIC_TAPACITY_CONTRACT;
const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const policyId = process.env.NEXT_PUBLIC_ALCHEMY_POLICY_ID;

if (process.env.LOAD_TEST_CONFIRM !== "YES") throw new Error("Set LOAD_TEST_CONFIRM=YES to create a live testnet round");
if (!contract || !apiKey || !policyId) throw new Error("Load-test environment is incomplete");
if (!Number.isInteger(PLAYERS) || PLAYERS < 1 || PLAYERS > 32) throw new Error("LOAD_TEST_PLAYERS must be 1-32");
if (!Number.isInteger(TAPS_PER_PLAYER) || TAPS_PER_PLAYER < 1) throw new Error("LOAD_TEST_TAPS_PER_PLAYER must be positive");
if (!Number.isFinite(TAP_RATE) || TAP_RATE <= 0) throw new Error("LOAD_TEST_TAP_RATE must be positive");

const abi = parseAbi([
  "function roundCount() view returns (uint256)",
  "function joinRound(uint256 roundId, address tapper, bytes32 commitment, bytes16 nickname)",
  "function tap(uint256 roundId)",
  "function revealGoal(uint256 roundId, address player, uint32 goal, bytes32 salt)",
  "function getRound(uint256 roundId) view returns ((address creator, uint64 startBlock, uint64 endBlock, uint64 revealEndBlock, uint32 durationBlocks, uint32 revealBlocks, uint16 maxPlayers, uint16 playerCount, uint64 totalTaps, bool settled))",
  "function getPlayer(uint256 roundId, address player) view returns ((bytes32 commitment, bytes16 nickname, uint32 taps, uint32 goal, uint32 accuracyPpm, uint64 score, uint64 lastTapBlock, bool joined, bool revealed, address controller))",
]);

const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(`https://monad-testnet.g.alchemy.com/v2/${apiKey}`),
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const asHash = (receipt) => receipt?.transactionHash ?? receipt?.hash;

function percentile(values, fraction) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
}

function errorKind(error) {
  const value = String(error ?? "unknown").toLowerCase();
  if (value.includes("429") || value.includes("rate limit")) return "rate-limit";
  if (value.includes("paymaster") || value.includes("sponsor")) return "sponsorship";
  if (value.includes("timeout")) return "timeout";
  if (value.includes("revert")) return "revert";
  return "other";
}

async function host(action, body = {}) {
  const response = await fetch(`${APP_URL}/api/host`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action, ...body }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(`${action}: ${result.error ?? response.statusText}`);
  return result;
}

async function waitForBlock(target) {
  while (await publicClient.getBlockNumber() < target) await sleep(200);
}

async function waitForScheduledRound(roundId) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const round = await publicClient.readContract({ address: contract, abi, functionName: "getRound", args: [roundId] });
    if (round.startBlock > 0n) return round;
    await sleep(250);
  }
  throw new Error("Started round was not visible through the load-test RPC within 15 seconds");
}

async function waitForSettledRound(roundId) {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const round = await publicClient.readContract({ address: contract, abi, functionName: "getRound", args: [roundId] });
    if (round.settled) return round;
    await sleep(250);
  }
  throw new Error("Settled round was not visible through the load-test RPC within 15 seconds");
}

function player(index) {
  const signer = privateKeyToAccount(generatePrivateKey());
  const wallet = createSmartWalletClient({
    signer,
    chain: monadTestnet,
    transport: alchemyWalletTransport({ apiKey }),
    paymaster: { policyId },
  });
  return { index, signer, wallet, account: null, salt: generatePrivateKey(), goal: TAPS_PER_PLAYER };
}

function nonceKey(label) {
  return sliceHex(keccak256(stringToHex(label)), 0, 19);
}

async function send(item, roundId, functionName, args, label) {
  const submittedAt = Date.now();
  try {
    const { id } = await item.wallet.sendCalls({
      account: item.account.address,
      capabilities: { nonceOverride: { nonceKey: nonceKey(label) } },
      calls: [{
        to: contract,
        value: 0n,
        data: encodeFunctionData({ abi, functionName, args }),
      }],
    });
    const status = await item.wallet.waitForCallsStatus({ id, timeout: 45_000 });
    const receipt = status.receipts?.[0];
    if (!receipt) throw new Error(status.status ?? "no receipt");
    return {
      ok: receipt.status === "success",
      latencyMs: Date.now() - submittedAt,
      hash: asHash(receipt),
      blockNumber: receipt.blockNumber?.toString(),
      error: receipt.status === "success" ? undefined : `receipt ${receipt.status}`,
    };
  } catch (cause) {
    const error = cause instanceof Error ? cause.message : String(cause);
    return { ok: false, latencyMs: Date.now() - submittedAt, error, errorKind: errorKind(error) };
  }
}

async function main() {
  const startedAt = new Date().toISOString();
  const previousRoundCount = await publicClient.readContract({ address: contract, abi, functionName: "roundCount" });
  const previousRound = await publicClient.readContract({ address: contract, abi, functionName: "getRound", args: [previousRoundCount] });
  const admin = previousRound.creator;
  const adminBalanceBefore = await publicClient.getBalance({ address: admin });
  if (Number(formatEther(adminBalanceBefore)) < ADMIN_RESERVE_MON) {
    throw new Error(`Admin reserve stop: ${formatEther(adminBalanceBefore)} MON is below ${ADMIN_RESERVE_MON} MON`);
  }

  console.log(`Preflight: ${PLAYERS} players, ${TAPS_PER_PLAYER} taps each at ${TAP_RATE}/s; admin ${formatEther(adminBalanceBefore)} MON`);
  const created = await host("create", { maxPlayers: PLAYERS });
  const roundId = BigInt(created.roundId);
  console.log(`Round ${roundId} created`);

  const players = Array.from({ length: PLAYERS }, (_, index) => player(index));
  await Promise.all(players.map(async (item) => {
    item.account = await item.wallet.requestAccount();
  }));

  const joins = await Promise.all(players.map((item) => {
    const commitment = keccak256(encodeAbiParameters(
      [{ type: "uint256" }, { type: "address" }, { type: "uint32" }, { type: "bytes32" }],
      [roundId, item.account.address, item.goal, item.salt],
    ));
    return send(
      item,
      roundId,
      "joinRound",
      [roundId, item.account.address, commitment, toHex(`BOT${String(item.index + 1).padStart(2, "0")}`, { size: 16 })],
      `${roundId}:join:${item.index}`,
    );
  }));
  const joinedStates = await Promise.all(players.map((item) => publicClient.readContract({
    address: contract,
    abi,
    functionName: "getPlayer",
    args: [roundId, item.account.address],
    blockTag: "finalized",
  })));
  const joinedPlayers = players.filter((_, index) => joinedStates[index].joined);
  console.log(`Joined: ${joinedPlayers.length}/${PLAYERS}`);
  if (joinedPlayers.length === 0) throw new Error("No simulated player joined; round cannot start");

  const afterCreate = await publicClient.getBalance({ address: admin });
  if (Number(formatEther(afterCreate)) < ADMIN_RESERVE_MON) {
    throw new Error(`Admin reserve stop after create: ${formatEther(afterCreate)} MON`);
  }

  await host("start", { roundId: roundId.toString() });
  const scheduled = await waitForScheduledRound(roundId);
  await waitForBlock(scheduled.startBlock);
  console.log(`Tap burst started at block ${scheduled.startBlock}`);

  const burstStarted = Date.now();
  const tapTasks = joinedPlayers.flatMap((item) => Array.from({ length: TAPS_PER_PLAYER }, (_, tapIndex) => (async () => {
    const due = burstStarted + Math.floor(tapIndex * 1_000 / TAP_RATE);
    await sleep(Math.max(0, due - Date.now()));
    return {
      player: item.index,
      tap: tapIndex + 1,
      ...(await send(item, roundId, "tap", [roundId], `${roundId}:tap:${item.index}:${tapIndex}`)),
    };
  })()));
  const taps = await Promise.all(tapTasks);
  await waitForBlock(scheduled.endBlock);

  const reveals = await Promise.all(joinedPlayers.map((item) => send(
    item,
    roundId,
    "revealGoal",
    [roundId, item.account.address, item.goal, item.salt],
    `${roundId}:reveal:${item.index}`,
  )));
  await waitForBlock(scheduled.revealEndBlock);
  const settled = await host("settle", { roundId: roundId.toString() });
  const finalRound = await waitForSettledRound(roundId);
  const finalPlayers = await Promise.all(players.map((item) => publicClient.readContract({
    address: contract,
    abi,
    functionName: "getPlayer",
    args: [roundId, item.account.address],
    blockTag: "finalized",
  })));
  const adminBalanceAfter = await publicClient.getBalance({ address: admin });

  const successfulTaps = taps.filter((result) => result.ok);
  const failedTaps = taps.filter((result) => !result.ok);
  const blockCounts = successfulTaps.reduce((counts, result) => {
    if (result.blockNumber) counts[result.blockNumber] = (counts[result.blockNumber] ?? 0) + 1;
    return counts;
  }, {});
  const busiestBlock = Object.entries(blockCounts).sort((left, right) => right[1] - left[1])[0] ?? null;
  const errors = failedTaps.reduce((counts, result) => {
    const kind = result.errorKind ?? errorKind(result.error);
    counts[kind] = (counts[kind] ?? 0) + 1;
    return counts;
  }, {});
  const latencies = successfulTaps.map((result) => result.latencyMs);
  const report = {
    startedAt,
    finishedAt: new Date().toISOString(),
    appUrl: APP_URL,
    contract,
    roundId: roundId.toString(),
    configuration: { requestedPlayers: PLAYERS, joinedPlayers: joinedPlayers.length, tapsPerPlayer: TAPS_PER_PLAYER, tapRatePerPlayer: TAP_RATE },
    joins: { submittedSuccess: joins.filter((result) => result.ok).length, onchainJoined: joinedPlayers.length },
    taps: {
      attempted: taps.length,
      submittedSuccess: successfulTaps.length,
      onchainFinalized: Number(finalRound.totalTaps),
      failures: failedTaps.length,
      failureKinds: errors,
      latencyMs: { p50: percentile(latencies, 0.5), p95: percentile(latencies, 0.95), max: latencies.length ? Math.max(...latencies) : null },
      uniqueOuterTransactions: new Set(successfulTaps.map((result) => result.hash).filter(Boolean)).size,
      busiestBlock: busiestBlock ? { block: busiestBlock[0], operations: busiestBlock[1] } : null,
    },
    reveals: { submittedSuccess: reveals.filter((result) => result.ok).length, onchainRevealed: finalPlayers.filter((state) => state.revealed).length },
    settlement: { hash: settled.hash, settled: finalRound.settled },
    adminWallet: {
      address: admin,
      balanceBeforeMON: formatEther(adminBalanceBefore),
      balanceAfterMON: formatEther(adminBalanceAfter),
      consumedMON: formatEther(adminBalanceBefore - adminBalanceAfter),
      configuredReserveMON: ADMIN_RESERVE_MON,
    },
  };
  if (REPORT_PATH) await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((cause) => {
  console.error(cause);
  process.exitCode = 1;
});
