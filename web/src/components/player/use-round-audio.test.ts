import { describe, expect, it } from "vitest";
import { roundCueForTransition } from "./use-round-audio";

describe("roundCueForTransition", () => {
  it("plays once when the execution window opens", () => {
    expect(roundCueForTransition("lobby", "live")).toBe("start");
    expect(roundCueForTransition("live", "live")).toBeUndefined();
  });

  it("plays once when the execution window closes", () => {
    expect(roundCueForTransition("live", "reveal")).toBe("end");
    expect(roundCueForTransition("reveal", "settlement")).toBeUndefined();
  });

  it("stays silent for lobby-only transitions and initial states", () => {
    expect(roundCueForTransition("waiting", "lobby")).toBeUndefined();
    expect(roundCueForTransition("reveal", "reveal")).toBeUndefined();
  });
});
