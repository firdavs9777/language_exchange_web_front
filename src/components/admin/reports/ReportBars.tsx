import React from "react";

export interface ReportBarRow {
  key: string;
  label: React.ReactNode;
  value: number;
  /** What to print at the end of the bar; the raw count when absent. */
  display?: string;
}

/**
 * A ranked list as horizontal bars (countries, sources, devices, the funnel).
 * Widths are relative to `max` (default: the largest row), and every width is
 * guarded so an empty or all-zero list never writes `NaN%` into the markup.
 */
const ReportBars: React.FC<{
  rows: ReportBarRow[];
  max?: number;
  emptyText: string;
  barClassName?: string;
  testId?: string;
}> = ({ rows, max, emptyText, barClassName = "bg-brand", testId }) => {
  const safe = (rows || []).filter(Boolean);
  if (safe.length === 0) {
    return <p className="py-2 text-sm text-ink-500 dark:text-ink-400">{emptyText}</p>;
  }
  const peak = typeof max === "number" && max > 0 ? max : Math.max(0, ...safe.map((r) => Number(r.value) || 0));
  return (
    <ul data-testid={testId} className="space-y-1.5 text-sm">
      {safe.map((row) => {
        const v = Number(row.value) || 0;
        const width = peak > 0 ? Math.min(100, Math.max(0, (v / peak) * 100)) : 0;
        return (
          <li key={row.key} data-testid="report-bar" className="flex items-center gap-2">
            <span className="w-36 shrink-0 truncate text-ink-800 dark:text-ink-100 sm:w-44">{row.label}</span>
            <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800" aria-hidden="true">
              <span className={`block h-full rounded-full ${barClassName}`} style={{ width: `${width}%` }} />
            </span>
            <span className="w-16 shrink-0 text-right tabular-nums text-ink-700 dark:text-ink-200">
              {row.display !== undefined ? row.display : v.toLocaleString("en-US")}
            </span>
          </li>
        );
      })}
    </ul>
  );
};

export default ReportBars;
