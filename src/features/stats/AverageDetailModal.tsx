import { Modal } from "../../components/Modal";
import { useI18n } from "../../i18n/useI18n";
import { formatAverageMs, formatSolveResult } from "../../domain/time/format";
import { formatDateRange, formatDateTime } from "../../domain/time/date";
import type { AverageWindow } from "../../domain/stats/highlights";
import type { Solve } from "../../domain/types";

interface AverageDetailModalProps {
  title: string;
  window: AverageWindow<Solve>;
  onClose: () => void;
  onSelectSolve: (solve: Solve) => void;
}

/** The solves that make up an average, trimmed ones shown in parentheses. */
export function AverageDetailModal({
  title,
  window,
  onClose,
  onSelectSolve,
}: AverageDetailModalProps) {
  const { t, locale } = useI18n();

  return (
    <Modal title={title} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <div>
          <p className="font-mono text-3xl font-semibold tabular-nums">
            {formatAverageMs(window.value)}
          </p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {formatDateRange(window.startMs, window.endMs, locale)}
          </p>
        </div>

        <ul className="divide-y divide-[var(--border)]">
          {window.entries.map(({ solve, number, trimmed }) => {
            const result = formatSolveResult(solve);
            return (
              <li key={solve.id}>
                <button
                  onClick={() => onSelectSolve(solve)}
                  title={t("solve.detail")}
                  className="flex w-full items-center gap-3 rounded py-2 text-left text-sm hover:bg-[var(--surface-hover)]"
                >
                  <span className="w-10 shrink-0 text-[var(--muted)] tabular-nums">{number}.</span>
                  <span
                    className={`w-24 shrink-0 font-mono font-semibold tabular-nums ${
                      trimmed ? "text-[var(--muted)]" : "text-[var(--fg)]"
                    }`}
                  >
                    {trimmed ? `(${result})` : result}
                  </span>
                  <span className="flex-1 truncate text-right text-xs text-[var(--muted)]">
                    {formatDateTime(solve.timestamp, locale)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </Modal>
  );
}
