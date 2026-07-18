import { describe, expect, it } from "vitest";
import { inspectionPenalty, timerReducer, type TimerConfig, type TimerState } from "./machine";

const noInspection: TimerConfig = { inspectionEnabled: false, holdThresholdMs: 300 };
const withInspection: TimerConfig = { inspectionEnabled: true, holdThresholdMs: 300 };

function run(config: TimerConfig, events: Parameters<typeof timerReducer>[1][]): TimerState {
  return events.reduce<TimerState>((state, event) => timerReducer(state, event, config), {
    kind: "idle",
  });
}

describe("inspectionPenalty", () => {
  it("applies WCA thresholds", () => {
    expect(inspectionPenalty(14999)).toBe("none");
    expect(inspectionPenalty(15000)).toBe("+2");
    expect(inspectionPenalty(16999)).toBe("+2");
    expect(inspectionPenalty(17000)).toBe("DNF");
  });
});

describe("timer without inspection", () => {
  it("runs the happy path: hold, arm, start, stop", () => {
    let s = run(noInspection, [{ type: "PRESS", at: 1000 }]);
    expect(s).toEqual({ kind: "holding", heldSince: 1000 });
    s = timerReducer(s, { type: "HOLD_REACHED", at: 1300 }, noInspection);
    expect(s.kind).toBe("armed");
    s = timerReducer(s, { type: "RELEASE", at: 1400 }, noInspection);
    expect(s).toEqual({ kind: "running", startedAt: 1400, pending: "none" });
    s = timerReducer(s, { type: "ANY_KEY", at: 9650 }, noInspection);
    expect(s).toEqual({ kind: "stopped", elapsedMs: 8250, pending: "none" });
  });

  it("does not arm when released before the threshold", () => {
    const s = run(noInspection, [
      { type: "PRESS", at: 0 },
      { type: "RELEASE", at: 200 },
    ]);
    expect(s.kind).toBe("idle");
  });

  it("ignores a stale HOLD_REACHED", () => {
    const s = run(noInspection, [
      { type: "PRESS", at: 0 },
      { type: "HOLD_REACHED", at: 250 },
    ]);
    expect(s.kind).toBe("holding");
  });

  it("space itself stops a running solve", () => {
    const s = run(noInspection, [
      { type: "PRESS", at: 0 },
      { type: "HOLD_REACHED", at: 300 },
      { type: "RELEASE", at: 350 },
      { type: "PRESS", at: 5350 },
    ]);
    expect(s).toEqual({ kind: "stopped", elapsedMs: 5000, pending: "none" });
  });

  it("starts the next attempt from stopped", () => {
    const stopped: TimerState = { kind: "stopped", elapsedMs: 5000, pending: "none" };
    const s = timerReducer(stopped, { type: "PRESS", at: 10000 }, noInspection);
    expect(s).toEqual({ kind: "holding", heldSince: 10000 });
  });
});

describe("timer with inspection", () => {
  it("starts inspection on press+release", () => {
    let s = run(withInspection, [{ type: "PRESS", at: 0 }]);
    expect(s.kind).toBe("readyToInspect");
    s = timerReducer(s, { type: "RELEASE", at: 10 }, withInspection);
    expect(s).toEqual({ kind: "inspecting", inspectionStartedAt: 10, pending: "none" });
  });

  it("arms during inspection and starts on release with no penalty before 15s", () => {
    const s = run(withInspection, [
      { type: "PRESS", at: 0 },
      { type: "RELEASE", at: 10 },
      { type: "INSPECTION_TICK", at: 8010 },
      { type: "PRESS", at: 12010 },
      { type: "HOLD_REACHED", at: 12310 },
      { type: "RELEASE", at: 13000 },
    ]);
    expect(s).toEqual({ kind: "running", startedAt: 13000, pending: "none" });
  });

  it("keeps inspecting when released before the hold threshold", () => {
    const s = run(withInspection, [
      { type: "PRESS", at: 0 },
      { type: "RELEASE", at: 10 },
      { type: "PRESS", at: 5000 },
      { type: "RELEASE", at: 5100 },
    ]);
    expect(s).toEqual({ kind: "inspecting", inspectionStartedAt: 10, pending: "none" });
  });

  it("applies +2 when the solve starts between 15s and 17s", () => {
    const s = run(withInspection, [
      { type: "PRESS", at: 0 },
      { type: "RELEASE", at: 0 },
      { type: "PRESS", at: 14800 },
      { type: "HOLD_REACHED", at: 15100 },
      { type: "RELEASE", at: 15500 },
    ]);
    expect(s).toEqual({ kind: "running", startedAt: 15500, pending: "+2" });
  });

  it("does not penalize a release just under 15s", () => {
    const s = run(withInspection, [
      { type: "PRESS", at: 0 },
      { type: "RELEASE", at: 0 },
      { type: "PRESS", at: 14000 },
      { type: "HOLD_REACHED", at: 14300 },
      { type: "RELEASE", at: 14999 },
    ]);
    expect(s).toEqual({ kind: "running", startedAt: 14999, pending: "none" });
  });

  it("marks DNF when the solve starts after 17s", () => {
    const s = run(withInspection, [
      { type: "PRESS", at: 0 },
      { type: "RELEASE", at: 0 },
      { type: "PRESS", at: 16900 },
      { type: "HOLD_REACHED", at: 17200 },
      { type: "RELEASE", at: 17300 },
    ]);
    expect(s).toEqual({ kind: "running", startedAt: 17300, pending: "DNF" });
  });

  it("updates pending on ticks for the UI", () => {
    const s = run(withInspection, [
      { type: "PRESS", at: 0 },
      { type: "RELEASE", at: 0 },
      { type: "INSPECTION_TICK", at: 15200 },
    ]);
    expect(s).toEqual({ kind: "inspecting", inspectionStartedAt: 0, pending: "+2" });
  });

  it("carries the pending penalty through to stopped", () => {
    let s = run(withInspection, [
      { type: "PRESS", at: 0 },
      { type: "RELEASE", at: 0 },
      { type: "PRESS", at: 15100 },
      { type: "HOLD_REACHED", at: 15400 },
      { type: "RELEASE", at: 15600 },
    ]);
    s = timerReducer(s, { type: "ANY_KEY", at: 25600 }, withInspection);
    expect(s).toEqual({ kind: "stopped", elapsedMs: 10000, pending: "+2" });
  });
});

describe("cancel and reset", () => {
  it("cancel aborts inspection", () => {
    const s = run(withInspection, [
      { type: "PRESS", at: 0 },
      { type: "RELEASE", at: 0 },
      { type: "CANCEL" },
    ]);
    expect(s.kind).toBe("idle");
  });

  it("cancel discards a running solve", () => {
    const s = run(noInspection, [
      { type: "PRESS", at: 0 },
      { type: "HOLD_REACHED", at: 300 },
      { type: "RELEASE", at: 400 },
      { type: "CANCEL" },
    ]);
    expect(s.kind).toBe("idle");
  });

  it("cancel does not clear a stopped result", () => {
    const stopped: TimerState = { kind: "stopped", elapsedMs: 1234, pending: "none" };
    expect(timerReducer(stopped, { type: "CANCEL" }, noInspection)).toBe(stopped);
  });

  it("reset returns to idle", () => {
    const stopped: TimerState = { kind: "stopped", elapsedMs: 1234, pending: "none" };
    expect(timerReducer(stopped, { type: "RESET" }, noInspection).kind).toBe("idle");
  });
});
