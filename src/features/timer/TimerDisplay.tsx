import { useEffect, useRef } from "react";
import { formatMs } from "../../domain/time/format";
import type { TimerState } from "../../domain/timer/machine";

interface TimerDisplayProps {
  state: TimerState;
  getElapsedMs: () => number;
  getInspectionElapsedMs: () => number | null;
  hideWhileRunning: boolean;
}

const INSPECTION_LIMIT_S = 15;

/**
 * The one component that repaints at 60fps. It owns a rAF loop and writes text
 * directly, so a running clock never re-renders the React tree.
 */
export function TimerDisplay({
  state,
  getElapsedMs,
  getInspectionElapsedMs,
  hideWhileRunning,
}: TimerDisplayProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;
    const el = ref.current;
    if (!el) return;

    const paint = () => {
      const inspectionMs = getInspectionElapsedMs();
      if (inspectionMs !== null) {
        const remaining = Math.ceil((INSPECTION_LIMIT_S * 1000 - inspectionMs) / 1000);
        el.textContent = remaining > 0 ? String(remaining) : remaining > -2 ? "+2" : "DNF";
      } else if (state.kind === "running") {
        el.textContent = hideWhileRunning ? "···" : formatMs(getElapsedMs());
      } else if (state.kind === "stopped") {
        el.textContent = formatMs(getElapsedMs());
      }
      raf = requestAnimationFrame(paint);
    };

    // Static phases render once; live phases animate.
    const isLive =
      state.kind === "running" ||
      state.kind === "inspecting" ||
      state.kind === "inspHolding" ||
      state.kind === "inspArmed";
    if (isLive) {
      raf = requestAnimationFrame(paint);
    } else if (state.kind === "stopped") {
      el.textContent = formatMs(getElapsedMs());
    } else {
      el.textContent = formatMs(0);
    }
    return () => cancelAnimationFrame(raf);
  }, [state.kind, getElapsedMs, getInspectionElapsedMs, hideWhileRunning]);

  const color =
    state.kind === "armed" || state.kind === "inspArmed"
      ? "text-emerald-400"
      : state.kind === "holding" || state.kind === "inspHolding"
        ? "text-amber-400"
        : "text-[var(--fg)]";

  return (
    <div
      ref={ref}
      className={`select-none font-mono text-7xl font-bold tabular-nums sm:text-8xl md:text-9xl ${color}`}
    >
      0.00
    </div>
  );
}
