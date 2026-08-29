import { alchemyWalletTransport, createSmartWalletClient } from "@alchemy/wallet-apis";
import {
  createPublicClient,
  decodeEventLog,
  encodeAbiParameters,
  encodeFunctionData,
  http,
  keccak256,
  parseAbi,
  toHex,
} from "viem";
import { monadTestnet } from "viem/chains";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

const contract = process.env.NEXT_PUBLIC_TAPACITY_CONTRACT;
const apiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const policyId = process.env.NEXT_PUBLIC_ALCHEMY_POLICY_ID;
if (!contract || !apiKey || !policyId) throw new Error("Probe environment is incomplete");

const abi = parseAbi([
  "function createRound(uint32 durationBlocks, uint32 revealBlocks, uint16 maxPlayers) returns (uint256)",
  "function joinRound(uint256 roundId, address tapper, bytes32 commitment, bytes16 nickname)",
  "function startRound(uint256 roundId, uint32 leadBlocks)",
  "function tap(uint256 roundId)",
  "function revealGoal(uint256 roundId, address player, uint32 goal, bytes32 salt)",
  "function settleRound(uint256 roundId)",
  "function getRound(uint256 roundId) view returns ((address creator, uint64 startBlock, uint64 endBlock, uint64 revealEndBlock, uint32 durationBlocks, uint32 revealBlocks, uint16 maxPlayers, uint16 playerCount, uint64 totalTaps, bool settled))",
  "event RoundCreated(uint256 indexed roundId, address indexed creator, uint32 durationBlocks, uint32 revealBlocks, uint16 maxPlayers)",
]);

const signer = privateKeyToAccount(generatePrivateKey());
const wallet = createSmartWalletClient({
  signer,
  chain: monadTestnet,
  transport: alchemyWalletTransport({ apiKey }),
  paymaster: { policyId },
});
const publicClient = createPublicClient({ chain: monadTestnet, transport: http(`https://monad-testnet.g.alchemy.com/v2/${apiKey}`) });
const account = await wallet.requestAccount();
let nonceKey = 1n;

async function send(functionName, args) {
  const submittedAt = Date.now();
  const { id } = await wallet.sendCalls({
    account: account.address,
    capabilities: { nonceOverride: { nonceKey: toHex(nonceKey++) } },
    calls: [{ to: contract, value: 0n, data: encodeFunctionData({ abi, functionName, args }) }],
  });
  const status = await wallet.waitForCallsStatus({ id, timeout: 30_000 });
  const receipt = status.receipts?.[0];
  if (!receipt) throw new Error(`${functionName}: ${status.status ?? "no receipt"}`);
  return { receipt, latencyMs: Date.now() - submittedAt, success: receipt.status === "success" };
}

async function waitForBlock(target) {
  while (await publicClient.getBlockNumber() < target) {
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

const before = await publicClient.getBalance({ address: account.address });
const created = await send("createRound", [20, 12, 1]);
const createdLog = created.receipt.logs.map((log) => {
  try { return decodeEventLog({ abi, ...log }); } catch { return undefined; }
}).find((event) => event?.eventName === "RoundCreated");
if (!createdLog) throw new Error("RoundCreated event missing");
const roundId = createdLog.args.roundId;
const goal = 8;
const salt = toHex(crypto.getRandomValues(new Uint8Array(32)));
const commitment = keccak256(encodeAbiParameters(
  [{ type: "uint256" }, { type: "address" }, { type: "uint32" }, { type: "bytes32" }],
  [roundId, account.address, goal, salt],
));

await send("joinRound", [roundId, account.address, commitment, toHex("PROBE", { size: 16 })]);
await send("startRound", [roundId, 5]);
let round = await publicClient.readContract({ address: contract, abi, functionName: "getRound", args: [roundId] });
await waitForBlock(round.startBlock);
const taps = await Promise.all(Array.from({ length: goal }, () => send("tap", [roundId])));
await waitForBlock(round.endBlock);
const reveal = await send("revealGoal", [roundId, account.address, goal, salt]);
await waitForBlock(round.revealEndBlock);
const settled = await send("settleRound", [roundId]);
round = await publicClient.readContract({ address: contract, abi, functionName: "getRound", args: [roundId] });
const after = await publicClient.getBalance({ address: account.address });

console.log(JSON.stringify({
  roundId: roundId.toString(),
  owner: signer.address,
  smartAccount: account.address,
  balanceBefore: before.toString(),
  balanceAfter: after.toString(),
  requestedTaps: goal,
  successfulTapCalls: taps.filter((tap) => tap.success).length,
  tapLatencyMs: taps.map((tap) => tap.latencyMs),
  revealSuccess: reveal.success,
  settleSuccess: settled.success,
  totalTaps: round.totalTaps.toString(),
  settled: round.settled,
}, null, 2));
