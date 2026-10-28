/**
 * localStorage access that never throws (private windows and blocked storage
 * make the accessor itself throw). Only used for per-browser preferences.
 */
export function readStored<T>(key: string, fallback: T, isValid: (v: unknown) => v is T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return isValid(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

export function writeStored(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Preferences simply won't persist.
  }
}
