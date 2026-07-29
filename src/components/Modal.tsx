import { useEffect } from "react";
import { useUiStore } from "../state/uiStore";
import { useI18n } from "../i18n/useI18n";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

/** Centered dialog with backdrop dismissal; suspends timer input while open. */
export function Modal({ title, onClose, children }: ModalProps) {
  const { t } = useI18n();
  const setTimerInputEnabled = useUiStore((s) => s.setTimerInputEnabled);

  useEffect(() => {
    setTimerInputEnabled(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      setTimerInputEnabled(true);
    };
  }, [onClose, setTimerInputEnabled]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xl"
      >
        <header className="flex items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-3">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button
            onClick={onClose}
            aria-label={t("common.close")}
            className="rounded px-2 py-0.5 text-[var(--muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--fg)]"
          >
            ✕
          </button>
        </header>
        <div className="overflow-y-auto px-4 py-3">{children}</div>
      </div>
    </div>
  );
}
