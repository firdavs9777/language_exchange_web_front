import React from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import {
  AdminReportSettings,
  Report,
  ReportPeriod,
  useGetAdminReportQuery,
  useGetAdminReportSettingsQuery,
  useUpdateAdminReportSettingsMutation,
} from "../../../store/slices/adminSlice";
import { SurfaceCard } from "../../../design";
import DataTable from "../parts/DataTable";
import RefreshButton from "../parts/RefreshButton";
import LineChart, { CHART_COLORS } from "../parts/LineChart";
import ReportKpis, { InfoTip } from "../reports/ReportKpis";
import ReportBars from "../reports/ReportBars";
import ReportSections from "../reports/ReportSections";
import ReportStoreTaps from "../reports/ReportStoreTaps";
import { toCsv } from "../reports/reportCsv";
import {
  clock,
  deviceLabel,
  flagOf,
  fraction,
  kstDay,
  kstToday,
  languageName,
  num,
  pct,
  regionName,
  sourceLabel,
  validDay,
} from "../reports/reportFormat";

/**
 * Website and member numbers for one day, week or month (KST), compared with
 * the period before. Everything on the page — and the CSV, and the emails —
 * comes from one `GET /admin/reports` object, so they can't disagree.
 *
 * `period` and `date` live in the URL: the report emails link straight here
 * (`/admin/reports?period=week&date=2026-10-12`), and a copied URL reopens the
 * same report. A 404 means the backend flag is off, which is a state of the
 * product rather than a failure, so it gets its own explanation.
 */

const PERIODS: { value: ReportPeriod; key: string; label: string }[] = [
  { value: "day", key: "admin.reports.periodDay", label: "Day" },
  { value: "week", key: "admin.reports.periodWeek", label: "Week" },
  { value: "month", key: "admin.reports.periodMonth", label: "Month" },
];

const isPeriod = (value: any): value is ReportPeriod => PERIODS.some((p) => p.value === value);

const EMAILS: { key: keyof AdminReportSettings; tKey: string; label: string }[] = [
  { key: "daily", tKey: "admin.reports.emailDaily", label: "Daily" },
  { key: "weekly", tKey: "admin.reports.emailWeekly", label: "Weekly" },
  { key: "monthly", tKey: "admin.reports.emailMonthly", label: "Monthly" },
];

const downloadCsv = (report: Report) => {
  if (typeof URL === "undefined" || typeof URL.createObjectURL !== "function") return;
  // The BOM makes Excel read the file as UTF-8 (labels like "Oct 12 – 18").
  const blob = new Blob(["﻿", toCsv(report)], { type: "text/csv;charset=utf-8" });
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = `bananatalk-report-${report.periodKey}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 0);
};

const AdminReports: React.FC = () => {
  const { t, i18n } = useTranslation();
  const locale = (i18n && (i18n as any).language) || "en";
  const [searchParams, setSearchParams] = useSearchParams();
  const rawPeriod = searchParams.get("period");
  const period: ReportPeriod = isPeriod(rawPeriod) ? rawPeriod : "week";
  const date = validDay(searchParams.get("date"));

  const report = useGetAdminReportQuery({ period, date });
  const settings = useGetAdminReportSettingsQuery(undefined as any);
  const [updateSettings] = useUpdateAdminReportSettingsMutation();
  // A toggle shows its new state at once (the mutation patches the cached
  // settings) and falls back to the server's value if the save fails.
  const [saveError, setSaveError] = React.useState(false);

  const setQuery = (next: { period?: ReportPeriod; date?: string }) => {
    const params = new URLSearchParams(searchParams);
    params.set("period", next.period || period);
    const d = next.date !== undefined ? next.date : date;
    if (d) params.set("date", d);
    else params.delete("date");
    setSearchParams(params);
  };

  const emptyText = t("admin.common.empty") || "Nothing to show yet.";
  // `currentData`, not `data`: after a period or date change RTK keeps the
  // previous report in `data` while the new one loads, which would label one
  // period's numbers with another's heading. The loading state shows instead.
  const data: Report | undefined = report.currentData;
  const notEnabled = report.isError && (report as any).error && (report as any).error.status === 404;

  const onToggle = (key: keyof AdminReportSettings, value: boolean) => {
    setSaveError(false);
    const body = { [key]: value } as Partial<AdminReportSettings>;
    const result: any = updateSettings(body);
    if (result && typeof result.unwrap === "function") {
      result.unwrap().then(
        () => undefined,
        () => setSaveError(true)
      );
    }
  };

  const card = (testId: string, title: React.ReactNode, body: React.ReactNode, className = "") => (
    <SurfaceCard padding="lg" className={className}>
      <div data-testid={testId}>
        <h2 className="pb-3 text-xs font-semibold uppercase tracking-wide text-ink-600 dark:text-ink-300">
          {title}
        </h2>
        {body}
      </div>
    </SurfaceCard>
  );

  const titleWithTip = (key: string, fallback: string, tipKey: string, tipFallback: string) => (
    <>
      {t(key) || fallback}
      <InfoTip text={t(tipKey) || tipFallback} />
    </>
  );

  const vsPrevious =
    period === "day"
      ? t("admin.reports.vsPreviousDay") || "vs previous day"
      : period === "month"
      ? t("admin.reports.vsPreviousMonth") || "vs previous month"
      : t("admin.reports.vsPreviousWeek") || "vs previous week";

  const segClass = (on: boolean) =>
    [
      "px-4 py-1.5 text-sm font-semibold transition-colors",
      on ? "bg-brand-deep text-white" : "text-ink-700 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-800",
    ].join(" ");

  const renderEmails = () => {
    if (!settings.data) return null;
    const current: any = settings.data;
    return (
      <SurfaceCard padding="md">
        <div data-testid="report-emails" className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <span className="font-semibold text-ink-800 dark:text-ink-100">
            {t("admin.reports.emails") || "My report emails"}
          </span>
          {EMAILS.map((e) => (
            <label key={e.key} className="inline-flex cursor-pointer items-center gap-2 text-ink-700 dark:text-ink-200">
              <input
                type="checkbox"
                className="h-4 w-4 accent-brand-deep"
                checked={current[e.key] !== false}
                onChange={(ev) => onToggle(e.key, ev.target.checked)}
              />
              {t(e.tKey) || e.label}
            </label>
          ))}
          <span className="text-xs text-ink-500 dark:text-ink-400">
            {t("admin.reports.emailsNote") ||
              "Sent at 09:00 KST: daily, on Mondays for the week, on the 1st for the month."}
          </span>
          {saveError ? (
            <span role="alert" className="text-xs text-orange-700 dark:text-orange-300">
              {t("admin.reports.saveError") || "Couldn't save. Try again."}
            </span>
          ) : null}
        </div>
      </SurfaceCard>
    );
  };

  const renderBody = (r: Report) => {
    const web = r.web;
    // Shares are of the true totals, not of the rows shown: the backend sends
    // only the top 10, and dividing by their sum would inflate every share
    // when there is a long tail. Sources are counted per visit; devices and
    // languages per distinct visitor. `pct` caps at 100% and shows — for a
    // zero total.
    const sourcesTotal = web.visits;
    const devicesTotal = web.visitors;
    const languagesTotal = web.visitors;
    const hourly = r.period === "day";
    const b = r.members.breakdowns || ({} as any);

    const keyCounts = (title: string, rows: { key: string; count: number }[] | undefined) => (
      <div>
        <h3 className="pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400">
          {title}
        </h3>
        {(rows || []).length === 0 ? (
          <p className="text-sm text-ink-500 dark:text-ink-400">{emptyText}</p>
        ) : (
          <ul className="text-sm">
            {(rows || []).map((row) => (
              <li key={row.key} className="flex justify-between py-0.5">
                <span className="truncate text-ink-800 dark:text-ink-100">{row.key}</span>
                <span className="tabular-nums text-ink-600 dark:text-ink-300">{num(row.count)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );

    const figures = (rows: [string, React.ReactNode][]) => (
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {rows.map(([label, value]) => (
          <React.Fragment key={label}>
            <dt className="text-ink-600 dark:text-ink-300">{label}</dt>
            <dd className="text-right font-semibold tabular-nums text-ink-900 dark:text-ink-50">{value}</dd>
          </React.Fragment>
        ))}
      </dl>
    );

    return (
      <>
        <ReportKpis report={r} />

        {card(
          "report-traffic",
          hourly
            ? t("admin.reports.chartTitleHours") || "Visitors & page views per hour"
            : t("admin.reports.chartTitleDays") || "Visitors & page views per day",
          <LineChart
            height={220}
            emptyText={emptyText}
            series={[
              {
                name: t("admin.reports.visitors") || "Visitors",
                color: CHART_COLORS.pageViews,
                points: (web.series || []).map((p) => ({ x: String(p.x), y: Number(p.visitors) || 0 })),
              },
              {
                name: t("admin.reports.pageViews") || "Page views",
                color: CHART_COLORS.storeTaps,
                points: (web.series || []).map((p) => ({ x: String(p.x), y: Number(p.pageViews) || 0 })),
              },
            ]}
          />
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          {card(
            "report-countries",
            t("admin.reports.countries") || "Countries",
            <>
              <ReportBars
                emptyText={emptyText}
                rows={(web.countries || []).map((c) => ({
                  key: c.code,
                  label: `${flagOf(c.code)} ${regionName(c.code, locale)}`.trim(),
                  value: c.count,
                }))}
              />
              <p className="pt-2 text-xs text-ink-500 dark:text-ink-400">
                {t("admin.reports.countriesNote") || "Country only — no IP addresses are kept."}
              </p>
            </>
          )}
          {card(
            "report-sources",
            titleWithTip(
              "admin.reports.sources",
              "Where visitors come from",
              "admin.reports.defSources",
              "Visits by where their first page came from: a search engine, a social network, another site, a campaign link (utm_ tags), or direct."
            ),
            <ReportBars
              emptyText={emptyText}
              rows={(web.sources || []).map((s, i) => ({
                key: `${s.type}-${s.name}-${i}`,
                label: sourceLabel(s, t),
                value: s.count,
                display: pct(s.count, sourcesTotal),
              }))}
            />
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {card(
            "report-top-pages",
            titleWithTip(
              "admin.reports.topPages",
              "Top pages",
              "admin.reports.defTopPages",
              "Views per page. Avg time is how long the page was on screen per view."
            ),
            <DataTable
              rows={web.topPages || []}
              rowKey="path"
              emptyText={emptyText}
              columns={[
                { key: "path", header: t("admin.reports.page") || "Page", className: "max-w-xs truncate" },
                {
                  key: "views",
                  header: t("admin.reports.views") || "Views",
                  className: "text-right tabular-nums",
                  render: (row: any) => num(row && row.views),
                },
                {
                  key: "avgMs",
                  header: t("admin.reports.avgTime") || "Avg time",
                  className: "text-right tabular-nums",
                  render: (row: any) => clock(row && row.avgMs),
                },
              ]}
            />
          )}
          {card(
            "report-funnel",
            titleWithTip(
              "admin.reports.funnel",
              "Visitor → member funnel",
              "admin.reports.defFunnel",
              "Visitors; visits that opened the sign-up page; members who finished signing up on the website; app store button taps."
            ),
            <ReportBars
              emptyText={emptyText}
              barClassName="bg-brand-deep"
              max={web.funnel.visited}
              rows={[
                { key: "visited", label: t("admin.reports.funnelVisited") || "Visited", value: web.funnel.visited },
                {
                  key: "started",
                  label: t("admin.reports.funnelSignupStarted") || "Opened sign-up",
                  value: web.funnel.signupStarted,
                },
                { key: "signed", label: t("admin.reports.funnelSignedUp") || "Signed up", value: web.funnel.signedUp },
                {
                  key: "taps",
                  label: t("admin.reports.funnelStoreTaps") || "Tapped app store",
                  value: web.funnel.storeTaps,
                },
              ]}
            />
          )}
        </div>

        {card(
          "report-store-taps",
          titleWithTip(
            "admin.reports.storeTaps",
            "App store clicks",
            "admin.reports.defStoreTaps",
            "Taps on the App Store and Google Play buttons. By source is the source of the visit the tap happened in."
          ),
          <ReportStoreTaps report={r} emptyText={emptyText} />
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          {card(
            "report-devices",
            t("admin.reports.devices") || "Devices & languages",
            <>
              <ReportBars
                emptyText={emptyText}
                rows={(web.devices || []).map((d) => ({
                  key: d.device,
                  label: deviceLabel(d.device, t),
                  value: d.count,
                  display: pct(d.count, devicesTotal),
                }))}
              />
              {(web.languages || []).length > 0 ? (
                <p className="pt-3 text-xs text-ink-600 dark:text-ink-300">
                  {`${t("admin.reports.siteLanguages") || "Site language"}: `}
                  {(web.languages || [])
                    .map((l) => `${languageName(l.language, locale)} ${pct(l.count, languagesTotal)}`)
                    .join(" · ")}
                </p>
              ) : null}
            </>
          )}
          {card(
            "report-sections",
            titleWithTip(
              "admin.reports.sections",
              "How members use the website",
              "admin.reports.defSections",
              "Signed-in members who opened each section, and their average time there per member. Click a row for the section's top pages."
            ),
            <>
              <ReportSections sections={web.sections || []} emptyText={emptyText} />
              <p className="pt-2 text-xs text-ink-500 dark:text-ink-400">
                {t("admin.reports.sectionsNote") ||
                  "Signed-in members per section; click a row for that section's top pages."}
              </p>
            </>
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {card(
            "report-members",
            t("admin.reports.membersTitle") || "Members",
            <>
              {figures([
                [t("admin.reports.signups") || "Sign-ups (all platforms)", num(r.members.signups)],
                [t("admin.reports.signupsStarted") || "Started, not finished", num(r.members.signupsStarted)],
                [t("admin.reports.totalUsers") || "Total users", num(r.members.totalUsers)],
                [t("admin.reports.completedUsers") || "Completed registrations", num(r.members.completedUsers)],
                [
                  t("admin.reports.retention") || "Retention",
                  <>
                    {fraction(r.members.retention)}
                    <InfoTip
                      text={
                        t("admin.reports.defRetention") ||
                        "Of the members who signed up in the period before last, the share active in this period. Shows — until there is enough history."
                      }
                    />
                  </>,
                ],
              ])}
              {keyCounts(t("admin.reports.appPlatforms") || "App platforms", r.members.appPlatforms)}
              {keyCounts(t("admin.reports.breakdownNative") || "Sign-ups by native language", b.native)}
              {keyCounts(t("admin.reports.breakdownLearning") || "Sign-ups by learning language", b.learning)}
              {keyCounts(t("admin.reports.breakdownCountry") || "Sign-ups by country", b.country)}
              {keyCounts(t("admin.reports.breakdownPlatform") || "Sign-ups by platform", b.platform)}
              {keyCounts(t("admin.reports.breakdownGender") || "Sign-ups by gender", b.gender)}
            </>
          )}
          {card(
            "report-app",
            t("admin.reports.appActivity") || "App activity",
            figures([
              [t("admin.reports.messages") || "Messages", num(r.app.messages)],
              [t("admin.reports.conversations") || "Conversations", num(r.app.conversations)],
              [t("admin.reports.moments") || "Moments", num(r.app.moments)],
              [t("admin.reports.stories") || "Stories", num(r.app.stories)],
              [t("admin.reports.calls") || "Calls", num(r.app.calls)],
            ])
          )}
          {card(
            "report-vip",
            t("admin.reports.vip") || "VIP",
            <>
              {figures([
                [t("admin.reports.newVip") || "New VIP", num(r.vip.newVip)],
                [t("admin.reports.expiringSoon") || "Expiring in 7 days", num(r.vip.expiringSoon)],
              ])}
              {keyCounts(
                t("admin.reports.activeByPlan") || "Active VIP by plan",
                (r.vip.activeByPlan || []).map((p) => ({ key: p.plan, count: p.count }))
              )}
            </>
          )}
        </div>
      </>
    );
  };

  const pickerValue = date || (data ? kstDay(data.start) : "");

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-display-sm text-ink-900 dark:text-ink-50">
          {t("admin.reports.title") || "Reports"}
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={!data}
            onClick={() => data && downloadCsv(data)}
            className="rounded-chip border border-line px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-ink-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-line-dark dark:text-ink-200 dark:hover:bg-ink-800"
          >
            {`⬇ ${t("admin.reports.exportCsv") || "Export CSV"}`}
          </button>
          <RefreshButton
            label={t("admin.common.refresh") || "Refresh"}
            isFetching={!!report.isFetching}
            onRefresh={() => {
              report.refetch();
            }}
          />
        </div>
      </header>

      {notEnabled ? null : renderEmails()}

      <div className="flex flex-wrap items-center gap-3">
        <div
          role="group"
          aria-label={t("admin.reports.periodGroup") || "Report period"}
          className="inline-flex overflow-hidden rounded-full border border-line dark:border-line-dark"
        >
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              aria-pressed={period === p.value}
              onClick={() => setQuery({ period: p.value })}
              className={segClass(period === p.value)}
            >
              {t(p.key) || p.label}
            </button>
          ))}
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-ink-700 dark:text-ink-200">
          <span className="sr-only">{t("admin.reports.date") || "Date"}</span>
          <input
            type="date"
            value={pickerValue}
            max={kstToday()}
            onChange={(e) => setQuery({ date: validDay(e.target.value) || "" })}
            className="rounded-chip border border-line bg-surface px-3 py-1.5 text-sm text-ink-800 dark:border-line-dark dark:bg-cardbg-dark dark:text-ink-100"
          />
        </label>
        {data ? (
          <span className="text-xs text-ink-500 dark:text-ink-400">
            {`${data.label} · ${vsPrevious} · ${t("admin.reports.timesKst") || "times in KST"}`}
            {data.complete ? null : (
              <span className="ml-2 rounded-full bg-banana-light px-2 py-0.5 font-semibold text-ink-800">
                {t("admin.reports.inProgress") || "in progress"}
              </span>
            )}
          </span>
        ) : null}
      </div>

      {notEnabled ? (
        <SurfaceCard padding="lg">
          <div data-testid="reports-off" role="status">
            <h2 className="font-display text-base text-ink-900 dark:text-ink-50">
              {t("admin.reports.notEnabledTitle") || "Reports are not switched on yet"}
            </h2>
            <p className="pt-1 text-sm text-ink-600 dark:text-ink-300">
              {t("admin.reports.notEnabledBody") ||
                "They start once the server's ANALYTICS_REPORTS_ENABLED setting is on. Until then, website numbers are on the Reach page."}
            </p>
          </div>
        </SurfaceCard>
      ) : report.isError ? (
        <div
          data-testid="section-error"
          role="status"
          className="rounded-card border border-line bg-surface px-4 py-3 text-sm text-ink-600 dark:border-line-dark dark:bg-cardbg-dark dark:text-ink-300"
        >
          {t("admin.common.loadError") || "Couldn't load this section."}
        </div>
      ) : report.isLoading || !data ? (
        <div
          data-testid="section-loading"
          className="animate-pulse rounded-card border border-line bg-surface px-4 py-3 text-sm text-ink-400 dark:border-line-dark dark:bg-cardbg-dark"
        >
          {t("admin.common.loading") || "Loading…"}
        </div>
      ) : (
        renderBody(data)
      )}
    </div>
  );
};

export default AdminReports;
