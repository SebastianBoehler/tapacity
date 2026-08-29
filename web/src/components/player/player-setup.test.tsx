import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { RoundState } from "@/lib/contract/use-chain-state";
import { PlayerSetup } from "./player-setup";

type InputElement = ReactElement<{
  id?: string;
  inputMode?: string;
  onChange?: (event: { target: { value: string } }) => void;
  type?: string;
}>;

function findInput(node: ReactNode, id: string): InputElement | undefined {
  if (!isValidElement(node)) return undefined;
  const element = node as InputElement;
  if (element.props.id === id) return element;
  let found: InputElement | undefined;
  Children.forEach((element.props as { children?: ReactNode }).children, (child) => {
    found ??= findInput(child, id);
  });
  return found;
}

const round: RoundState = {
  creator: "0x0000000000000000000000000000000000000001",
  startBlock: 0n,
  endBlock: 0n,
  revealEndBlock: 0n,
  durationBlocks: 50,
  revealBlocks: 10,
  maxPlayers: 32,
  playerCount: 0,
  totalTaps: 0n,
  settled: false,
};

describe("player goal input", () => {
  it("can stay empty while a mobile user replaces the existing value", () => {
    const onGoal = vi.fn();
    const view = PlayerSetup({
      roundId: 12n,
      feed: "connecting",
      round,
      goal: "0",
      nickname: "",
      busy: false,
      session: null,
      onGoal,
      onNickname: vi.fn(),
      onJoin: vi.fn(),
    });

    const input = findInput(view, "goal");
    expect(input).toBeDefined();
    input?.props.onChange?.({ target: { value: "" } });

    expect(onGoal).toHaveBeenCalledWith("");
  });

  it("uses the mobile numeric keyboard and removes accidental leading zeroes", () => {
    const onGoal = vi.fn();
    const view = PlayerSetup({
      roundId: 12n,
      feed: "connecting",
      round,
      goal: "",
      nickname: "",
      busy: false,
      session: null,
      onGoal,
      onNickname: vi.fn(),
      onJoin: vi.fn(),
    });

    const input = findInput(view, "goal");
    expect(input?.props.type).toBe("text");
    expect(input?.props.inputMode).toBe("numeric");
    input?.props.onChange?.({ target: { value: "030" } });

    expect(onGoal).toHaveBeenCalledWith("30");
  });
});
