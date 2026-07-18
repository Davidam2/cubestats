import { useRef, useState } from "react";
import type { Locale, RaceTargetSource, Theme } from "../../domain/settings";
import { sessionRepo } from "../../db/repo/sessionRepo";
import { useSessionStore } from "../../state/sessionStore";
import { useSettingsStore } from "../../state/settingsStore";
import { useI18n } from "../../i18n/useI18n";
import { exportBackup, exportSessionCsv, importBackup, importCsTimer } from "./dataTransfer";

export function SettingsView() {
  const { t } = useI18n();
  const settings = useSettingsStore((s) => s.settings);
  const set = useSettingsStore((s) => s.set);
  const activeSessionId = useSessionStore((s) => s.activeSessionId);

  const backupInput = useRef<HTMLInputElement>(null);
  const cstimerInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  const raceSources: { value: RaceTargetSource; label: string }[] = [
    { value: "pb-single", label: t("settings.raceSource.pbSingle") },
    { value: "pb-ao5", label: t("settings.raceSource.pbAo5") },
    { value: "goal", label: t("settings.raceSource.goal") },
    { value: "custom", label: t("settings.raceSource.custom") },
  ];

  const onExportCsv = async () => {
    if (!activeSessionId) return;
    const session = await sessionRepo.get(activeSessionId);
    const count = await exportSessionCsv(activeSessionId, session?.name ?? "session");
    setMessage(count === 0 ? t("settings.exportEmpty") : null);
  };

  const onImportFile = async (
    file: File | undefined,
    parse: (raw: string) => Promise<number | null>,
  ) => {
    if (!file) return;
    try {
      const imported = await parse(await file.text());
      setMessage(imported === null ? t("settings.importFailed") : t("settings.importDone", imported));
    } catch {
      setMessage(t("settings.importFailed"));
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-xl flex-col gap-6 px-4 py-4">
        <Section title={t("settings.section.general")}>
          <SelectRow
            label={t("settings.language")}
            value={settings.locale}
            options={[
              { value: "es", label: "Español" },
              { value: "en", label: "English" },
            ]}
            onChange={(v) => void set("locale", v as Locale)}
          />
          <SelectRow
            label={t("settings.theme")}
            value={settings.theme}
            options={[
              { value: "dark", label: t("settings.theme.dark") },
              { value: "light", label: t("settings.theme.light") },
            ]}
            onChange={(v) => void set("theme", v as Theme)}
          />
        </Section>

        <Section title={t("settings.section.timer")}>
          <ToggleRow
            label={t("settings.inspection")}
            checked={settings.inspectionEnabled}
            onChange={(v) => void set("inspectionEnabled", v)}
          />
          <ToggleRow
            label={t("settings.inspectionVoice")}
            checked={settings.inspectionVoiceAlerts}
            disabled={!settings.inspectionEnabled}
            onChange={(v) => void set("inspectionVoiceAlerts", v)}
          />
          <NumberRow
            label={t("settings.holdThreshold")}
            value={settings.holdThresholdMs}
            min={0}
            max={1000}
            step={50}
            onChange={(v) => void set("holdThresholdMs", v)}
          />
          <ToggleRow
            label={t("settings.hideTime")}
            checked={settings.hideTimeWhileRunning}
            onChange={(v) => void set("hideTimeWhileRunning", v)}
          />
          <ToggleRow
            label={t("settings.manualEntry")}
            checked={settings.manualEntryMode}
            onChange={(v) => void set("manualEntryMode", v)}
          />
        </Section>

        <Section title={t("settings.section.stats")}>
          <NumberRow
            label={t("settings.streakMinSolves")}
            value={settings.streakMinSolves}
            min={1}
            max={99}
            step={1}
            onChange={(v) => void set("streakMinSolves", v)}
          />
        </Section>

        <Section title={t("settings.section.race")}>
          <ToggleRow
            label={t("settings.raceMode")}
            checked={settings.raceModeEnabled}
            onChange={(v) => void set("raceModeEnabled", v)}
          />
          <SelectRow
            label={t("settings.raceTargetSource")}
            value={settings.raceTargetSource}
            options={raceSources}
            disabled={!settings.raceModeEnabled}
            onChange={(v) => void set("raceTargetSource", v as RaceTargetSource)}
          />
          {settings.raceTargetSource === "custom" && (
            <NumberRow
              label={t("settings.raceCustomTarget")}
              value={settings.raceCustomTargetMs / 1000}
              min={1}
              max={3600}
              step={0.5}
              onChange={(v) => void set("raceCustomTargetMs", Math.round(v * 1000))}
            />
          )}
        </Section>

        <Section title={t("settings.section.data")}>
          <div className="flex flex-wrap gap-2 py-2">
            <DataButton onClick={() => void onExportCsv()}>{t("settings.exportCsv")}</DataButton>
            <DataButton onClick={() => void exportBackup()}>
              {t("settings.exportBackup")}
            </DataButton>
            <DataButton onClick={() => backupInput.current?.click()}>
              {t("settings.importBackup")}
            </DataButton>
            <DataButton onClick={() => cstimerInput.current?.click()}>
              {t("settings.importCsTimer")}
            </DataButton>
          </div>
          {message && <p className="pb-2 text-sm text-[var(--muted)]">{message}</p>}
          <input
            ref={backupInput}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              void onImportFile(e.target.files?.[0], importBackup);
              e.target.value = "";
            }}
          />
          <input
            ref={cstimerInput}
            type="file"
            accept=".txt,.json,text/plain,application/json"
            className="hidden"
            onChange={(e) => {
              void onImportFile(e.target.files?.[0], importCsTimer);
              e.target.value = "";
            }}
          />
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
        {title}
      </h2>
      <div className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4">
        {children}
      </div>
    </section>
  );
}

function ToggleRow({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label
      className={`flex items-center justify-between gap-4 py-3 text-sm ${
        disabled ? "opacity-50" : ""
      }`}
    >
      {label}
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-[var(--accent)]"
      />
    </label>
  );
}

function SelectRow({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label
      className={`flex items-center justify-between gap-4 py-3 text-sm ${
        disabled ? "opacity-50" : ""
      }`}
    >
      {label}
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-sm text-[var(--fg)]"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function NumberRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 py-3 text-sm">
      {label}
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const v = e.target.valueAsNumber;
          if (Number.isFinite(v)) onChange(Math.min(max, Math.max(min, v)));
        }}
        className="w-24 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-right font-mono text-sm text-[var(--fg)]"
      />
    </label>
  );
}

function DataButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--fg)] hover:bg-[var(--surface-hover)]"
    >
      {children}
    </button>
  );
}
