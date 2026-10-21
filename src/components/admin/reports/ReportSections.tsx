import React from "react";
import { useTranslation } from "react-i18next";
import { Report } from "../../../store/slices/adminSlice";
import DataTable from "../parts/DataTable";
import { num, sectionLabel, shortDuration } from "./reportFormat";

type Section = Report["web"]["sections"][number];

/**
 * How signed-in members use each section of the site. A row click opens that
 * section's top pages underneath (the mockup's drill-down); clicking the open
 * row again closes it.
 */
const ReportSections: React.FC<{ sections: Section[]; emptyText: string }> = ({ sections, emptyText }) => {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState<string | null>(null);
  const rows = Array.isArray(sections) ? sections : [];
  const selected = rows.find((s) => s.section === open) || null;

  return (
    <div>
      <DataTable
        caption={t("admin.reports.sections") || "How members use the website"}
        rows={rows}
        rowKey="section"
        emptyText={emptyText}
        onRowClick={(row: Section) => setOpen(open === row.section ? null : row.section)}
        columns={[
          {
            key: "section",
            header: t("admin.reports.section") || "Section",
            render: (row: Section) => (
              <span className={row.section === open ? "font-semibold text-brand-deep dark:text-brand-light" : ""}>
                {sectionLabel(row.section, t)}
              </span>
            ),
          },
          {
            key: "members",
            header: t("admin.reports.members") || "Members",
            className: "text-right tabular-nums",
            render: (row: Section) => num(row.members),
          },
          {
            key: "avgMs",
            header: t("admin.reports.avgTime") || "Avg time",
            className: "text-right tabular-nums",
            render: (row: Section) => shortDuration(row.avgMs),
          },
        ]}
      />
      {selected ? (
        <div data-testid="section-pages" className="mt-3 rounded-card bg-ink-50 p-3 dark:bg-ink-900">
          <h3 className="pb-1 text-xs font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400">
            {t("admin.reports.sectionPages", { section: sectionLabel(selected.section, t) }) ||
              `Top pages in ${sectionLabel(selected.section, t)}`}
          </h3>
          <DataTable
            rows={selected.topPages || []}
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
            ]}
          />
        </div>
      ) : null}
    </div>
  );
};

export default ReportSections;
