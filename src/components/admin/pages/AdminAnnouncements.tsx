import React from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useListAnnouncementsQuery } from "../../../store/slices/adminSlice";
import { Badge } from "../../../design";
import DataTable from "../parts/DataTable";
import RefreshButton from "../parts/RefreshButton";
import { targetingSummary, defaultTitle } from "../parts/announcementForm";

/**
 * Every announcement, newest first, with what it targets and what its send
 * did. The status filter lives in `?status=` (like AdminContent's `?tab=`)
 * so a refresh or a pasted link lands on the same view.
 */

const FILTERS = ["all", "draft", "scheduled", "live", "ended"];

const num = (value: any): string =>
  typeof value === "number" && isFinite(value) ? value.toLocaleString("en-US") : "—";

const formatWhen = (value: any): string => {
  if (!value) return "—";
  const date = new Date(value);
  return isNaN(date.getTime()) ? String(value) : date.toLocaleString();
};

const AdminAnnouncements: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("status") || "all";
  const status = FILTERS.indexOf(requested) >= 0 ? requested : "all";

  const list = useListAnnouncementsQuery(status === "all" ? {} : { status });
  const rows: any[] = Array.isArray(list.data) ? list.data : [];

  const filterLabel = (value: string): string => {
    if (value === "all") return t("admin.announcements.all") || "All";
    if (value === "draft") return t("admin.announcements.draft") || "Draft";
    if (value === "scheduled") return t("admin.announcements.scheduled") || "Scheduled";
    if (value === "live") return t("admin.announcements.live") || "Live";
    return t("admin.announcements.ended") || "Ended";
  };

  const selectFilter = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value === "all") params.delete("status");
    else params.set("status", value);
    setSearchParams(params, { replace: true });
  };

  const columns = [
    {
      key: "title",
      header: t("admin.announcements.title") || "Title",
      render: (row: any) => (
        <span className="font-medium text-ink-900 dark:text-ink-50">
          {row.emoji ? `${row.emoji} ` : ""}
          {defaultTitle(row) || "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: t("admin.announcements.status") || "Status",
      render: (row: any) => (
        <span data-testid="announcement-status">
          <Badge tone={row.status === "live" || row.status === "scheduled" ? "brand" : "banana"}>{row.status}</Badge>
        </span>
      ),
    },
    {
      key: "targeting",
      header: t("admin.announcements.audience") || "Audience",
      render: (row: any) => targetingSummary(row),
    },
    {
      key: "window",
      header: t("admin.announcements.window") || "Start → end",
      className: "whitespace-nowrap",
      render: (row: any) =>
        `${formatWhen(row.startsAt)} → ${row.endsAt ? formatWhen(row.endsAt) : t("admin.announcements.noEnd") || "no end"}`,
    },
    {
      key: "delivery",
      header: t("admin.announcements.deliveryHeader") || "Targeted / pushed / listed / failed",
      className: "text-right tabular-nums",
      render: (row: any) => {
        const d = row.delivery || {};
        return row.notify ? `${num(d.targeted)} / ${num(d.pushed)} / ${num(d.listed)} / ${num(d.failed)}` : "—";
      },
    },
  ];

  const chipClass = (selected: boolean) =>
    [
      "rounded-chip px-3 py-1.5 text-sm font-medium transition-colors",
      selected
        ? "bg-brand-deep text-white"
        : "border border-line text-ink-700 hover:bg-ink-100 dark:border-line-dark dark:text-ink-200 dark:hover:bg-ink-800",
    ].join(" ");

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-display-sm text-ink-900 dark:text-ink-50">
          {t("admin.nav.announcements") || "Announcements"}
        </h1>
        <div className="flex items-center gap-2">
          <RefreshButton
            label={t("admin.common.refresh") || "Refresh"}
            isFetching={list.isFetching}
            onRefresh={() => list.refetch()}
          />
          <Link
            to="/admin/announcements/new"
            className="rounded-chip bg-brand-deep px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
          >
            {t("admin.announcements.new") || "New announcement"}
          </Link>
        </div>
      </header>

      <div className="flex flex-wrap gap-2" aria-label={t("admin.announcements.filter") || "Filter by status"}>
        {FILTERS.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={status === value}
            className={chipClass(status === value)}
            onClick={() => selectFilter(value)}
          >
            {filterLabel(value)}
          </button>
        ))}
      </div>

      {list.isError ? (
        <p role="alert" className="rounded-card border border-line p-4 text-sm text-red-600 dark:border-line-dark">
          {t("admin.announcements.loadError") || "Couldn't load announcements."}
        </p>
      ) : list.isLoading ? (
        <p className="text-sm text-ink-500">{t("admin.common.loading") || "Loading…"}</p>
      ) : (
        <DataTable
          columns={columns}
          rows={rows}
          rowKey="id"
          onRowClick={(row: any) => navigate(`/admin/announcements/${row.id}`)}
          emptyText={t("admin.announcements.empty") || "No announcements yet."}
        />
      )}
    </div>
  );
};

export default AdminAnnouncements;
