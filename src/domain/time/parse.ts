/**
 * Parses manual time entry into milliseconds. Returns null when invalid.
 *
 * Accepted forms:
 * - "12.34"          → 12340 (seconds with decimals)
 * - "1:23.45"        → 83450 (m:ss.cc, seconds must be < 60)
 * - "1:02:03.45"     → h:mm:ss.cc
 * - "1234"           → 12.34 (csTimer bare-digit style: last two digits are
 *   centiseconds, the two before are seconds, then minutes, then hours)
 */
export function parseTimeInput(raw: string): number | null {
  const text = raw.trim().replace(",", ".");
  if (text.length === 0) return null;

  if (text.includes(":")) {
    const parts = text.split(":");
    if (parts.length > 3 || parts.some((p) => p.length === 0)) return null;
    const secondsPart = parts[parts.length - 1];
    if (!/^\d{1,2}(\.\d{1,3})?$/.test(secondsPart)) return null;
    const seconds = Number(secondsPart);
    if (seconds >= 60) return null;
    let totalMs = Math.round(seconds * 1000);
    const minutes = Number(parts[parts.length - 2]);
    if (!/^\d+$/.test(parts[parts.length - 2]) || (parts.length === 3 && minutes >= 60)) return null;
    totalMs += minutes * 60_000;
    if (parts.length === 3) {
      if (!/^\d+$/.test(parts[0])) return null;
      totalMs += Number(parts[0]) * 3_600_000;
    }
    return totalMs > 0 ? totalMs : null;
  }

  if (text.includes(".")) {
    if (!/^\d*\.\d{1,3}$/.test(text) && !/^\d+\.?$/.test(text)) return null;
    const seconds = Number(text);
    if (!Number.isFinite(seconds)) return null;
    const ms = Math.round(seconds * 1000);
    return ms > 0 ? ms : null;
  }

  if (!/^\d+$/.test(text)) return null;
  // csTimer convention: digits fill cs → ss → mm → hh from the right.
  const digits = text.padStart(8, "0").slice(-8);
  const hours = Number(digits.slice(0, 2));
  const minutes = Number(digits.slice(2, 4));
  const seconds = Number(digits.slice(4, 6));
  const cs = Number(digits.slice(6, 8));
  if (text.length > 8) return null;
  const ms = ((hours * 60 + minutes) * 60 + seconds) * 1000 + cs * 10;
  return ms > 0 ? ms : null;
}
