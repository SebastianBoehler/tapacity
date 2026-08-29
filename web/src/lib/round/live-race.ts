import { hexToString } from "viem";

const LANE_COLORS = [
  "#00E5E8",
  "#A970FF",
  "#FFB84D",
  "#FF6FAE",
  "#71E67A",
  "#68A9FF",
  "#F0774F",
  "#D5E85C",
] as const;

export type LiveRaceLane = {
  address: `0x${string}`;
  name: string;
  taps: number;
  joinedAt: bigint;
};

export type RankedLiveRaceLane = LiveRaceLane & {
  color: string;
  rank: number;
};

export function displayPlayerName(nickname: `0x${string}`, address: `0x${string}`) {
  try {
    const decoded = hexToString(nickname).replaceAll("\0", "").trim();
    if (decoded) return decoded;
  } catch {
    // The optional nickname must never prevent a deterministic lane label.
  }
  return fallbackPlayerName(address);
}

export function fallbackPlayerName(address: `0x${string}`) {
  return `Guest ${address.slice(2, 6).toUpperCase()}`;
}

export function playerLaneColor(address: `0x${string}`) {
  const suffix = address.slice(-8);
  const index = Number.parseInt(suffix, 16) % LANE_COLORS.length;
  return LANE_COLORS[index];
}

export function joinRaceLane(
  lanes: Map<string, LiveRaceLane>,
  join: Omit<LiveRaceLane, "taps">,
) {
  const key = join.address.toLowerCase();
  const current = lanes.get(key);
  const next = new Map(lanes);
  next.set(key, {
    ...join,
    taps: current?.taps ?? 0,
    joinedAt: current?.joinedAt && current.joinedAt < join.joinedAt ? current.joinedAt : join.joinedAt,
  });
  return next;
}

export function recordRaceTap(
  lanes: Map<string, LiveRaceLane>,
  tap: { address: `0x${string}`; tapNumber: number; observedAt: bigint },
) {
  const key = tap.address.toLowerCase();
  const current = lanes.get(key);
  const next = new Map(lanes);
  next.set(key, {
    address: tap.address,
    name: current?.name ?? fallbackPlayerName(tap.address),
    taps: Math.max(current?.taps ?? 0, tap.tapNumber),
    joinedAt: current?.joinedAt ?? tap.observedAt,
  });
  return next;
}

export function rankLiveRace(lanes: Iterable<LiveRaceLane>): RankedLiveRaceLane[] {
  const joined = [...lanes].sort(compareJoined);
  const racing = [...joined].sort(compareRace);
  const rankByAddress = new Map(racing.map((lane, index) => [lane.address.toLowerCase(), index + 1]));
  return joined.map((lane) => ({
    ...lane,
    color: playerLaneColor(lane.address),
    rank: rankByAddress.get(lane.address.toLowerCase()) ?? joined.length,
  }));
}

export function eventOrder(blockNumber: bigint, logIndex: number) {
  return blockNumber * 1_000_000n + BigInt(logIndex);
}

function compareJoined(left: LiveRaceLane, right: LiveRaceLane) {
  if (left.joinedAt !== right.joinedAt) return left.joinedAt < right.joinedAt ? -1 : 1;
  return left.address.localeCompare(right.address);
}

function compareRace(left: LiveRaceLane, right: LiveRaceLane) {
  if (left.taps !== right.taps) return right.taps - left.taps;
  return compareJoined(left, right);
}
