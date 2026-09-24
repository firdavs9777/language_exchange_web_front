/**
 * "30m ago" for a story timestamp.
 *
 * Deliberately borrows the `moments_section.timeAgo.*` keys instead of minting
 * `stories.*` twins: those four strings are already translated into all 18
 * locales, they say exactly the same thing here, and a second copy would be a
 * second thing to keep in sync. The English fallbacks match the English
 * values in `locales/eng.json` so a missing translation reads identically.
 *
 * `t` is passed in rather than pulled from a hook so this stays callable from
 * a `useMemo` in any component and testable without a provider.
 */
export function timeAgo(date: string | number | Date | undefined, t: any): string {
  if (!date) return "";
  const then = new Date(date).getTime();
  if (isNaN(then)) return "";

  const minutes = Math.floor((Date.now() - then) / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return t("moments_section.timeAgo.justNow") || "just now";
  if (minutes < 60)
    return t("moments_section.timeAgo.minutesAgo", { minutes }) || `${minutes}m ago`;
  if (hours < 24)
    return t("moments_section.timeAgo.hoursAgo", { hours }) || `${hours}h ago`;
  if (days < 7)
    return t("moments_section.timeAgo.daysAgo", { days }) || `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

export default timeAgo;
