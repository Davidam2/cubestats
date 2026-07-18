/**
 * Pure timer state machine. No clocks inside: the caller supplies timestamps
 * (performance.now()) on every event, which makes every path testable.
 *
 * Inspection OFF: idle → holding → armed → running → stopped
 * Inspection ON:  idle → readyToInspect → inspecting → inspHolding → inspArmed → running → stopped
 */

export type PendingPenalty = "none" | "+2" | "DNF";

export interface TimerConfig {
  inspectionEnabled: boolean;
  holdThresholdMs: number;
}

export type TimerState =
  | { kind: "idle" }
  | { kind: "readyToInspect" }
  | { kind: "inspecting"; inspectionStartedAt: number; pending: PendingPenalty }
  | { kind: "inspHolding"; inspectionStartedAt: number; heldSince: number; pending: PendingPenalty }
  | { kind: "inspArmed"; inspectionStartedAt: number; pending: PendingPenalty }
  | { kind: "holding"; heldSince: number }
  | { kind: "armed" }
  | { kind: "running"; startedAt: number; pending: PendingPenalty }
  | { kind: "stopped"; elapsedMs: number; pending: PendingPenalty };

export type TimerEvent =
  | { type: "PRESS"; at: number }
  | { type: "RELEASE"; at: number }
  | { type: "HOLD_REACHED"; at: number }
  | { type: "ANY_KEY"; at: number }
  | { type: "INSPECTION_TICK"; at: number }
  | { type: "CANCEL" }
  | { type: "RESET" };

/** WCA: starting between 15s and 17s of inspection is +2; after 17s the attempt is DNF. */
export function inspectionPenalty(elapsedMs: number): PendingPenalty {
  if (elapsedMs >= 17000) return "DNF";
  if (elapsedMs >= 15000) return "+2";
  return "none";
}

export function timerReducer(state: TimerState, event: TimerEvent, config: TimerConfig): TimerState {
  switch (event.type) {
    case "RESET":
      return { kind: "idle" };

    case "CANCEL":
      // Escape aborts inspection/holding and discards a running solve.
      if (state.kind === "stopped") return state;
      return { kind: "idle" };

    case "PRESS":
      switch (state.kind) {
        case "idle":
        case "stopped":
          return config.inspectionEnabled
            ? { kind: "readyToInspect" }
            : { kind: "holding", heldSince: event.at };
        case "inspecting":
          return {
            kind: "inspHolding",
            inspectionStartedAt: state.inspectionStartedAt,
            heldSince: event.at,
            pending: state.pending,
          };
        case "running":
          return stop(state, event.at);
        default:
          return state;
      }

    case "RELEASE":
      switch (state.kind) {
        case "readyToInspect":
          return { kind: "inspecting", inspectionStartedAt: event.at, pending: "none" };
        case "holding":
          // Released before the hold threshold: not armed.
          return { kind: "idle" };
        case "armed":
          return { kind: "running", startedAt: event.at, pending: "none" };
        case "inspHolding":
          return {
            kind: "inspecting",
            inspectionStartedAt: state.inspectionStartedAt,
            pending: inspectionPenalty(event.at - state.inspectionStartedAt),
          };
        case "inspArmed":
          // The solve starts NOW: the penalty is decided by the release moment (WCA).
          return {
            kind: "running",
            startedAt: event.at,
            pending: inspectionPenalty(event.at - state.inspectionStartedAt),
          };
        default:
          return state;
      }

    case "HOLD_REACHED":
      if (state.kind === "holding" && event.at - state.heldSince >= config.holdThresholdMs) {
        return { kind: "armed" };
      }
      if (state.kind === "inspHolding" && event.at - state.heldSince >= config.holdThresholdMs) {
        return {
          kind: "inspArmed",
          inspectionStartedAt: state.inspectionStartedAt,
          pending: inspectionPenalty(event.at - state.inspectionStartedAt),
        };
      }
      return state;

    case "ANY_KEY":
      return state.kind === "running" ? stop(state, event.at) : state;

    case "INSPECTION_TICK":
      if (
        state.kind === "inspecting" ||
        state.kind === "inspHolding" ||
        state.kind === "inspArmed"
      ) {
        return { ...state, pending: inspectionPenalty(event.at - state.inspectionStartedAt) };
      }
      return state;
  }
}

function stop(state: Extract<TimerState, { kind: "running" }>, at: number): TimerState {
  return { kind: "stopped", elapsedMs: Math.max(0, at - state.startedAt), pending: state.pending };
}
