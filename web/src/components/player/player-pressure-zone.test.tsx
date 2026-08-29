import { isValidElement, type ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { PlayerPressureZone } from "./player-pressure-zone";

type PressureZoneElement = ReactElement<{ children: ReactElement; role?: string }>;

function render(phase: string) {
  const view = PlayerPressureZone({
    phase,
    startBlock: 100n,
    blockNumber: 110n,
    laneColor: "#00ffff",
    onTap: vi.fn(),
  });
  expect(isValidElement(view)).toBe(true);
  return view as PressureZoneElement;
}

function copy(view: PressureZoneElement) {
  const content = view.props.children as ReactElement<{ children: ReactElement<{ children: string }>[] }>;
  return content.props.children;
}

describe("player pressure zone", () => {
  it("is an actionable button only during the tap window", () => {
    expect(render("live").type).toBe("button");
  });

  it("becomes a passive finalization status when tapping ends", () => {
    const view = render("reveal");
    const children = copy(view);
    expect(view.type).toBe("section");
    expect(view.props.role).toBe("status");
    expect(children[0].props.children).toBe("Taps locked");
    expect(children[1].props.children).toContain("automatically");
  });

  it("tells players that settled results will appear automatically", () => {
    const view = render("settlement");
    const children = copy(view);
    expect(view.type).toBe("section");
    expect(children[0].props.children).toBe("Results incoming");
    expect(children[1].props.children).toContain("leaderboard will appear here automatically");
  });
});
