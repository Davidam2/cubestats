/**
 * Asks the browser to keep our IndexedDB data around.
 *
 * Without this, storage is "best-effort": the browser may evict the whole
 * database under disk pressure, which for a local-first app means silently
 * losing every solve. Granting is at the browser's discretion (Chrome weighs
 * engagement/installation, Firefox prompts), so a `false` result is normal and
 * not an error — we just stay best-effort.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  // Absent in jsdom and on older/embedded browsers.
  if (!navigator.storage?.persist) return false;
  try {
    // Already granted on a previous visit: don't ask again.
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}
