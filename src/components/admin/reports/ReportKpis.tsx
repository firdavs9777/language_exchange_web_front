import React from "react";
import { useTranslation } from "react-i18next";
import { Report } from "../../../store/slices/adminSlice";
import StatCard from "../parts/StatCard";
import { change, num, visitDuration } from "./reportFormat";

/**
 * A metric's definition, as a tooltip on an ⓘ. Focusable, and the definition
 * is its accessible name, so it reaches keyboard and screen-reader users too.
 */
export const InfoTip: React.FC<{ text: string }> = ({ text }) => (
  <span
    tabIndex={0}
    role="img"
    aria-label={text}
    title={text}
    className="ml-1 inline-block cursor-help select-none align-middle text-[11px] normal-case text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand dark:text-ink-500"
  >
    ⓘ
  </span>
);

const TONE: Record<string, string> = {
  up: "text-brand-deep dark:text-brand-light",
  down: "text-orange-700 dark:text-orange-300",
  flat: "text-ink-500 dark:text-ink-400",
  none: "text-ink-500 dark:text-ink-400",
};

/** "▲ 12%", "▼ 3%", "new" or "—" against the previous period. */
export const Change: React.FC<{ current: any; previous: any }> = ({ current, previous }) => {
  const { t } = useTranslation();
  const c = change(current, previous, t("admin.reports.new") || "new");
  return (
    <span data-testid="report-change" className={`font-semibold ${TONE[c.tone]}`}>
      {c.text}
    </span>
  );
};

/** The five headline numbers, each with its definition and comparison. */
const ReportKpis: React.FC<{ report: Report }> = ({ report }) => {
  const { t } = useTranslation();
  const prev: any = report.previous || {};
  const web = report.web;

  const label = (key: string, fallback: string, defKey: string, defFallback: string) => (
    <span>
      {t(`admin.reports.${key}`) || fallback}
      <InfoTip text={t(`admin.reports.${defKey}`) || defFallback} />
    </span>
  );

  const pagesPerVisit =
    typeof web.pagesPerVisit === "number" && isFinite(web.pagesPerVisit) ? web.pagesPerVisit.toFixed(1) : "—";
  const avg = visitDuration(web.avgVisitMs);

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      <StatCard
        label={label(
          "visitors",
          "Visitors",
          "defVisitors",
          "Distinct anonymous visitors in the period. Visitors are told apart within a calendar month, so a week that crosses into a new month can count someone twice."
        )}
        value={num(web.visitors)}
        hint={<Change current={web.visitors} previous={prev.visitors} />}
      />
      <StatCard
        label={label("pageViews", "Page views", "defPageViews", "Every page shown, including repeat views.")}
        value={num(web.pageViews)}
        hint={<Change current={web.pageViews} previous={prev.pageViews} />}
      />
      <StatCard
        label={label(
          "webSignups",
          "Sign-ups (web)",
          "defWebSignups",
          "Members who finished registering on the website in this period. Counted on the server, so ad blockers can't hide them."
        )}
        value={num(report.members.webSignups)}
        hint={<Change current={report.members.webSignups} previous={prev.webSignups} />}
      />
      <StatCard
        label={label(
          "activeMembers",
          "Active members",
          "defActiveMembers",
          "Distinct members who used the app or the website on at least one day of the period (daily, weekly or monthly actives)."
        )}
        value={num(report.members.active)}
        hint={<Change current={report.members.active} previous={prev.active} />}
      />
      <StatCard
        label={label(
          "pagesPerVisit",
          "Pages / visit",
          "defPagesPerVisit",
          "Page views divided by visits. A visit ends after 30 minutes without activity. The average visit is the time pages were on screen, summed per visit."
        )}
        value={pagesPerVisit}
        hint={t("admin.reports.avgVisit", { duration: avg }) || `avg ${avg}`}
      />
    </div>
  );
};

export default ReportKpis;
