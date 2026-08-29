import { encodeAbiParameters, keccak256, toHex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

export type GoalSession = {
  goal: number;
  nickname: string;
  salt: `0x${string}`;
  tapPrivateKey: `0x${string}`;
  tapperAddress: `0x${string}`;
  joinHash?: `0x${string}`;
  attempted: number;
  submitted: number;
  failed: number;
  hashes: `0x${string}`[];
  attempts: TapAttempt[];
  finality: Record<string, { observedAt: number; blockNumber: `0x${string}` }>;
};

export type TapAttempt = {
  id: string;
  attemptedAt: number;
  submittedAt?: number;
  hash?: `0x${string}`;
  callId?: string;
  callStatus?: "success" | "failure";
  receiptBlock?: string;
  failure?: string;
};

export function createGoalSession(goal: number, nickname: string): GoalSession {
  const saltBytes = new Uint8Array(32);
  crypto.getRandomValues(saltBytes);
  const tapPrivateKey = generatePrivateKey();
  return {
    goal,
    nickname,
    salt: toHex(saltBytes),
    tapPrivateKey,
    tapperAddress: privateKeyToAccount(tapPrivateKey).address,
    attempted: 0,
    submitted: 0,
    failed: 0,
    hashes: [],
    attempts: [],
    finality: {},
  };
}

export function goalCommitment(
  roundId: bigint,
  player: `0x${string}`,
  goal: number,
  salt: `0x${string}`,
) {
  return keccak256(
    encodeAbiParameters(
      [
        { type: "uint256" },
        { type: "address" },
        { type: "uint32" },
        { type: "bytes32" },
      ],
      [roundId, player, goal, salt],
    ),
  );
}

export function nicknameBytes(nickname: string) {
  const bytes = new TextEncoder().encode(nickname).slice(0, 16);
  return toHex(bytes, { size: 16 });
}

export function sessionKey(contract: string, roundId: bigint, player: string) {
  return `tapacity:${contract.toLowerCase()}:${roundId}:${player.toLowerCase()}`;
}

export function loadGoalSession(key: string): GoalSession | null {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as GoalSession;
    return {
      ...parsed,
      attempted: parsed.attempted ?? 0,
      submitted: parsed.submitted ?? 0,
      failed: parsed.failed ?? 0,
      hashes: parsed.hashes ?? [],
      attempts: parsed.attempts ?? [],
      finality: parsed.finality ?? {},
    };
  } catch {
    return null;
  }
}

export function saveGoalSession(key: string, session: GoalSession) {
  localStorage.setItem(key, JSON.stringify(session));
}
