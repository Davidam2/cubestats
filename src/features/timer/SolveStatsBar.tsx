import { useI18n } from "../../i18n/useI18n";
import { formatAverageMs, formatMs } from "../../domain/time/format";
import type { SessionStats } from "../../domain/stats/session";

interface SolveStatsBarProps {
  stats: SessionStats;
}

/** Singles are truncated to centiseconds (WCA); averages are rounded. */
function fmtSingle(value: number | null): string {
  return value === null ? "—" : formatMs(value);
}
function fmtAvg(value: number | null): string {
  return value === null ? "—" : formatAverageMs(value);
}

/** Compact readout of the headline session stats under the timer. */
export function SolveStatsBar({ stats }: SolveStatsBarProps) {
  const { t } = useI18n();
  const items: { label: string; value: string }[] = [
    { label: t("stat.count"), value: String(stats.count) },
    { label: t("stat.best"), value: fmtSingle(stats.best) },
    { label: "ao5", value: fmtAvg(stats.ao5.current) },
    { label: "ao12", value: fmtAvg(stats.ao12.current) },
    { label: t("stat.mean"), value: fmtAvg(stats.mean) },
  ];
  return (
    <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-[var(--muted)]">
      {items.map((item) => (
        <div key={item.label} className="flex items-baseline gap-1.5">
          <span className="uppercase tracking-wide">{item.label}</span>
          <span className="font-mono font-semibold text-[var(--fg)]">{item.value}</span>
        </div>
      ))}
    </div>
  );
}
