import React from "react";
import { useTranslation } from "react-i18next";
import { Report } from "../../../store/slices/adminSlice";
import DataTable from "../parts/DataTable";
import LineChart, { CHART_COLORS } from "../parts/LineChart";
import { Change } from "./ReportKpis";
import { num, placementLabel, sourceLabel } from "./reportFormat";

/**
 * App store clicks: the promotion results. iOS and Android totals with their
 * comparison, a line per platform over the period, then the same taps split by
 * the button that was tapped and by the source or campaign that brought the
 * visit. Replaces the Reach page's store-tap tables.
 */
const ReportStoreTaps: React.FC<{ report: Report; emptyText: string }> = ({ report, emptyText }) => {
  const { t } = useTranslation();
  const taps = report.web.storeTaps;
  const prev: any = report.previous || {};
  const ios = t("admin.reports.ios") || "iOS";
  const android = t("admin.reports.android") || "Android";
  const total = (row: { ios: number; android: number }) => (Number(row.ios) || 0) + (Number(row.android) || 0);

  const tile = (testId: string, label: string, value: number, previous: any) => (
    <div data-testid={testId} className="rounded-card bg-ink-50 px-4 py-3 dark:bg-ink-900">
      <div className="text-xs font-medium uppercase tracking-wide text-ink-500 dark:text-ink-400">{label}</div>
      <div className="font-display text-2xl tabular-nums text-ink-900 dark:text-ink-50">{num(value)}</div>
      <div className="text-xs">
        <Change current={value} previous={previous} />
      </div>
    </div>
  );

  const platformColumns = [
    {
      key: "ios",
      header: ios,
      className: "text-right tabular-nums",
      render: (row: any) => num(row && row.ios),
    },
    {
      key: "android",
      header: android,
      className: "text-right tabular-nums",
      render: (row: any) => num(row && row.android),
    },
    {
      key: "total",
      header: t("admin.reports.total") || "Total",
      className: "text-right tabular-nums",
      render: (row: any) => num(total(row || {})),
    },
  ];

  const subTitle = (text: string) => (
    <h3 className="pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400">
      {text}
    </h3>
  );

  return (
    <div>
      <div className="grid grid-cols-3 gap-3">
        {tile("taps-total", t("admin.reports.total") || "Total", taps.total, prev.storeTaps)}
        {tile("taps-ios", ios, taps.ios, prev.iosTaps)}
        {tile("taps-android", android, taps.android, prev.androidTaps)}
      </div>

      <div className="pt-4">
        <LineChart
          height={180}
          emptyText={emptyText}
          series={[
            {
              name: ios,
              color: CHART_COLORS.pageViews,
              points: (taps.series || []).map((p) => ({ x: String(p.x), y: Number(p.ios) || 0 })),
            },
            {
              name: android,
              color: CHART_COLORS.storeTaps,
              points: (taps.series || []).map((p) => ({ x: String(p.x), y: Number(p.android) || 0 })),
            },
          ]}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div data-testid="taps-by-button">
          {subTitle(t("admin.reports.byButton") || "By button")}
          <DataTable
            rows={taps.byPlacement || []}
            rowKey="placement"
            emptyText={emptyText}
            columns={[
              {
                key: "placement",
                header: t("admin.reports.button") || "Button",
                render: (row: any) => placementLabel(String((row && row.placement) || "unknown"), t),
              },
              ...platformColumns,
            ]}
          />
        </div>
        <div data-testid="taps-by-source">
          {subTitle(t("admin.reports.bySource") || "By source or campaign")}
          <DataTable
            rows={taps.bySource || []}
            rowKey={(row: any, i: number) => `${row && row.type}-${row && row.name}-${i}`}
            emptyText={emptyText}
            columns={[
              {
                key: "source",
                header: t("admin.reports.source") || "Source",
                className: "max-w-xs truncate",
                render: (row: any) => sourceLabel(row, t),
              },
              ...platformColumns,
            ]}
          />
        </div>
      </div>
    </div>
  );
};

export default ReportStoreTaps;
