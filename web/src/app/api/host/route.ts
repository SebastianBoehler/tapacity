import { decodeEventLog } from "viem";
import { NextResponse } from "next/server";
import { adminConfig, HostError } from "@/lib/admin/server";
import { publicClient } from "@/lib/chain";
import { tapacityAbi } from "@/lib/contract/abi";

type HostRequest = {
  action?: "create" | "start" | "settle";
  roundId?: string;
  maxPlayers?: number;
};

export async function POST(request: Request) {
  try {
    const body = await request.json() as HostRequest;
    const { contract, wallet } = adminConfig();

    if (body.action === "create") {
      const maxPlayers = body.maxPlayers;
      if (!Number.isInteger(maxPlayers) || !maxPlayers || maxPlayers < 1 || maxPlayers > 32) {
        throw new HostError("Capacity must be from 1 to 32", 400);
      }
      const hash = await wallet.writeContract({
        address: contract,
        abi: tapacityAbi,
        functionName: "createRound",
        args: [50, 50, maxPlayers],
      });
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      for (const log of receipt.logs) {
        try {
          const event = decodeEventLog({ abi: tapacityAbi, data: log.data, topics: log.topics });
          if (event.eventName === "RoundCreated") {
            return NextResponse.json({ hash, roundId: event.args.roundId.toString() });
          }
        } catch {
          // The receipt can contain unrelated system logs.
        }
      }
      throw new HostError("Round creation was not finalized", 502);
    }

    const roundId = parseRoundId(body.roundId);
    if (body.action === "start") {
      const round = await publicClient.readContract({
        address: contract,
        abi: tapacityAbi,
        functionName: "getRound",
        args: [roundId],
        blockTag: "finalized",
      });
      if (round.playerCount === 0) throw new HostError("No players have joined", 409);
      const hash = await wallet.writeContract({
        address: contract,
        abi: tapacityAbi,
        functionName: "startRound",
        args: [roundId, 15],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      return NextResponse.json({ hash, roundId: roundId.toString() });
    }

    if (body.action === "settle") {
      const hash = await wallet.writeContract({
        address: contract,
        abi: tapacityAbi,
        functionName: "settleRound",
        args: [roundId],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      return NextResponse.json({ hash, roundId: roundId.toString() });
    }
    throw new HostError("Unknown host action", 400);
  } catch (cause) {
    const status = cause instanceof HostError ? cause.status : 500;
    const error = cause instanceof Error ? cause.message : "Host action failed";
    return NextResponse.json({ error }, { status });
  }
}

function parseRoundId(value?: string) {
  if (!value || !/^\d+$/.test(value) || BigInt(value) === 0n) throw new HostError("Invalid round", 400);
  return BigInt(value);
}
