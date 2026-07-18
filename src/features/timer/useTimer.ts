import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import {
  timerReducer,
  type PendingPenalty,
  type TimerConfig,
  type TimerEvent,
  type TimerState,
} from "../../domain/timer/machine";

export interface SolveResult {
  elapsedMs: number;
  pending: PendingPenalty;
}

interface UseTimerOptions {
  config: TimerConfig;
  onSolve: (result: SolveResult) => void;
  /** When false, keyboard handling is suppressed (typing in inputs/modals). */
  enabled: boolean;
}

interface UseTimerResult {
  state: TimerState;
  /** Elapsed ms of the running solve, sampled on demand (for the rAF display). */
  getElapsedMs: () => number;
  /** ms of inspection elapsed, or null when not inspecting. */
  getInspectionElapsedMs: () => number | null;
  /** Attach to the touch surface for pointer (mobile) control. */
  surfaceHandlers: {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
    onPointerCancel: (e: React.PointerEvent) => void;
  };
}

const now = () => performance.now();

function reducerWithConfig(config: TimerConfig) {
  return (state: TimerState, event: TimerEvent) => timerReducer(state, event, config);
}

export function useTimer({ config, onSolve, enabled }: UseTimerOptions): UseTimerResult {
  const [state, rawDispatch] = useReducer(reducerWithConfig(config), { kind: "idle" });

  // Keep stable refs so the global listeners don't need re-binding each render.
  const stateRef = useRef(state);
  stateRef.current = state;
  const configRef = useRef(config);
  configRef.current = config;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const onSolveRef = useRef(onSolve);
  onSolveRef.current = onSolve;

  const holdTimerRef = useRef<number | null>(null);
  const inspectionTickRef = useRef<number | null>(null);
  const pressedRef = useRef(false);
  // Blocks re-arming with the very key/pointer that stopped the timer.
  const lockedRef = useRef(false);

  const dispatch = useCallback((event: TimerEvent) => {
    const prev = stateRef.current;
    const next = timerReducer(prev, event, configRef.current);
    if (next === prev) return;

    if (next.kind === "stopped" && prev.kind === "running") {
      onSolveRef.current({ elapsedMs: next.elapsedMs, pending: next.pending });
    }
    rawDispatch(event);
  }, []);

  const clearHold = () => {
    if (holdTimerRef.current !== null) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  };

  const scheduleHold = useCallback(() => {
    clearHold();
    holdTimerRef.current = window.setTimeout(() => {
      dispatch({ type: "HOLD_REACHED", at: now() });
    }, configRef.current.holdThresholdMs);
  }, [dispatch]);

  const press = useCallback(() => {
    if (pressedRef.current || lockedRef.current) return;
    pressedRef.current = true;
    const event: TimerEvent = { type: "PRESS", at: now() };
    // Compute the next state synchronously to decide whether to start the hold
    // timer (rawDispatch won't have updated stateRef by the next line).
    const next = timerReducer(stateRef.current, event, configRef.current);
    dispatch(event);
    if (next.kind === "holding" || next.kind === "inspHolding") scheduleHold();
  }, [dispatch, scheduleHold]);

  const release = useCallback(() => {
    if (!pressedRef.current) return;
    pressedRef.current = false;
    clearHold();
    dispatch({ type: "RELEASE", at: now() });
  }, [dispatch]);

  // Global keyboard control.
  useEffect(() => {
    function isTypingTarget(target: EventTarget | null): boolean {
      const el = target as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
    }

    function onKeyDown(e: KeyboardEvent) {
      if (!enabledRef.current || e.repeat || isTypingTarget(e.target)) return;
      if (e.code === "Space") {
        e.preventDefault();
        if (stateRef.current.kind === "running") {
          dispatch({ type: "ANY_KEY", at: now() });
        } else {
          press();
        }
        return;
      }
      if (e.code === "Escape") {
        dispatch({ type: "CANCEL" });
        return;
      }
      if (stateRef.current.kind === "running") {
        dispatch({ type: "ANY_KEY", at: now() });
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      if (e.code !== "Space") return;
      if (isTypingTarget(e.target)) return;
      lockedRef.current = false;
      release();
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [dispatch, press, release]);

  // When a solve stops, lock input until the stopping key/pointer is released.
  useEffect(() => {
    if (state.kind === "stopped") {
      lockedRef.current = true;
      pressedRef.current = false;
      clearHold();
    }
  }, [state.kind]);

  // Inspection countdown ticks drive voice alerts and the pending +2/DNF.
  useEffect(() => {
    const inspecting =
      state.kind === "inspecting" || state.kind === "inspHolding" || state.kind === "inspArmed";
    if (!inspecting) {
      if (inspectionTickRef.current !== null) {
        clearInterval(inspectionTickRef.current);
        inspectionTickRef.current = null;
      }
      return;
    }
    if (inspectionTickRef.current === null) {
      inspectionTickRef.current = window.setInterval(() => {
        dispatch({ type: "INSPECTION_TICK", at: now() });
      }, 100);
    }
    return () => {
      if (inspectionTickRef.current !== null) {
        clearInterval(inspectionTickRef.current);
        inspectionTickRef.current = null;
      }
    };
  }, [state.kind, dispatch]);

  const getElapsedMs = useCallback((): number => {
    const s = stateRef.current;
    if (s.kind === "running") return now() - s.startedAt;
    if (s.kind === "stopped") return s.elapsedMs;
    return 0;
  }, []);

  const getInspectionElapsedMs = useCallback((): number | null => {
    const s = stateRef.current;
    if (s.kind === "inspecting" || s.kind === "inspHolding" || s.kind === "inspArmed") {
      return now() - s.inspectionStartedAt;
    }
    return null;
  }, []);

  const surfaceHandlers = useMemo(
    () => ({
      onPointerDown: (e: React.PointerEvent) => {
        e.preventDefault();
        if (!enabledRef.current) return;
        if (stateRef.current.kind === "running") {
          dispatch({ type: "ANY_KEY", at: now() });
        } else {
          press();
        }
      },
      onPointerUp: (e: React.PointerEvent) => {
        e.preventDefault();
        lockedRef.current = false;
        release();
      },
      onPointerCancel: () => {
        lockedRef.current = false;
        release();
      },
    }),
    [dispatch, press, release],
  );

  return { state, getElapsedMs, getInspectionElapsedMs, surfaceHandlers };
}
