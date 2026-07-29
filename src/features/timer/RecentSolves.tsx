import { useI18n } from "../../i18n/useI18n";
import { formatSolveResult } from "../../domain/time/format";
import type { Penalty, Solve } from "../../domain/types";
import { solveRepo } from "../../db/repo/solveRepo";

interface RecentSolvesProps {
  solves: Solve[];
  totalCount: number;
  onDeleted: (solve: Solve) => void;
  onSelect: (solve: Solve) => void;
}

/** Newest-first list of recent solves with inline penalty toggles and delete. */
export function RecentSolves({ solves, totalCount, onDeleted, onSelect }: RecentSolvesProps) {
  const { t } = useI18n();

  if (solves.length === 0) {
    return <p className="py-8 text-center text-sm text-[var(--muted)]">{t("list.empty")}</p>;
  }

  const cyclePenalty = (solve: Solve, penalty: Penalty) => {
    void solveRepo.setPenalty(solve.id, solve.penalty === penalty ? "OK" : penalty);
  };

  return (
    <ul className="divide-y divide-[var(--border)]">
      {solves.map((solve, i) => {
        const number = totalCount - i;
        return (
          <li key={solve.id} className="flex items-center justify-between gap-3 py-2 text-sm">
            <button
              onClick={() => onSelect(solve)}
              title={t("solve.detail")}
              className="flex flex-1 items-center gap-3 rounded text-left hover:bg-[var(--surface-hover)]"
            >
              <span className="w-10 shrink-0 text-[var(--muted)] tabular-nums">{number}.</span>
              <span
                className={`flex-1 font-mono font-semibold tabular-nums ${
                  solve.penalty === "DNF" ? "text-[var(--muted)]" : "text-[var(--fg)]"
                }`}
              >
                {formatSolveResult(solve)}
              </span>
            </button>
            <div className="flex items-center gap-1">
              <button
                onClick={() => cyclePenalty(solve, "+2")}
                className={`rounded px-2 py-0.5 text-xs ${
                  solve.penalty === "+2"
                    ? "bg-amber-500/20 text-amber-400"
                    : "text-[var(--muted)] hover:bg-[var(--surface-hover)]"
                }`}
              >
                +2
              </button>
              <button
                onClick={() => cyclePenalty(solve, "DNF")}
                className={`rounded px-2 py-0.5 text-xs ${
                  solve.penalty === "DNF"
                    ? "bg-red-500/20 text-red-400"
                    : "text-[var(--muted)] hover:bg-[var(--surface-hover)]"
                }`}
              >
                DNF
              </button>
              <button
                onClick={async () => {
                  await solveRepo.remove(solve.id);
                  onDeleted(solve);
                }}
                aria-label={t("solve.delete")}
                className="rounded px-2 py-0.5 text-xs text-[var(--muted)] hover:bg-red-500/20 hover:text-red-400"
              >
                ✕
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
