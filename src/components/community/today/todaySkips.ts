/**
 * People skipped from today's batch. The server sends the same cached batch
 * all day, skipped cards included (it does not read skips when building it),
 * so the web remembers them per batch date in sessionStorage -- surviving a
 * reload, and starting clean when the date moves on. Storage that throws
 * (private mode, blocked site data) only means skips last until reload.
 */
const KEY = (date: string) => `bt.todaySkips.${date}`;

export function loadSkips(date: string): string[] {
  try {
    const raw = window.sessionStorage.getItem(KEY(date));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch (e) {
    return [];
  }
}

export function addSkip(date: string, id: string): string[] {
  const current = loadSkips(date);
  const next = current.indexOf(id) > -1 ? current : current.concat([id]);
  try {
    window.sessionStorage.setItem(KEY(date), JSON.stringify(next));
  } catch (e) {
    // Remembered for this call only.
  }
  return next;
}
