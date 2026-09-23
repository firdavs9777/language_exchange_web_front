import React from "react";
import { useTranslation } from "react-i18next";
import {
  useGetAdminClubsQuery,
  useGetAdminGatheringsQuery,
  useArchiveAdminClubMutation,
  useCancelAdminGatheringMutation,
} from "../../../store/slices/adminSlice";
import { Badge } from "../../../design";
import DataTable from "../parts/DataTable";
import RefreshButton from "../parts/RefreshButton";
import ConfirmDialog from "../parts/ConfirmDialog";

/**
 * Clubs and gatherings moderation. Two lists behind one tab strip: the
 * backend's `reported=true` filter is the only narrowing it exposes, and
 * archive/cancel are the only actions it exposes, so that is all this page
 * offers.
 *
 * The backend has no `hasMore` for these two lists (unlike every other
 * paginated admin route) — only flat `count`/`total` — so pagination here is
 * derived, never read off a flag the response doesn't carry.
 */

type Tab = "clubs" | "gatherings";

const LIMIT = 20;

const num = (value: any): string =>
  typeof value === "number" && isFinite(value) ? value.toLocaleString() : "—";

const formatWhen = (value: any): string => {
  if (!value) return "—";
  const date = new Date(value);
  return isNaN(date.getTime()) ? String(value) : date.toLocaleString();
};

type Pending =
  | { kind: "archive" | "restore"; row: any }
  | { kind: "cancel"; row: any }
  | null;

const AdminContent: React.FC = () => {
  const { t } = useTranslation();
  const [tab, setTab] = React.useState<Tab>("clubs");
  const [reportedOnly, setReportedOnly] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [pending, setPending] = React.useState<Pending>(null);
  const [actionError, setActionError] = React.useState("");

  const resetPaging = () => {
    setPage(1);
  };

  const clubs = useGetAdminClubsQuery(
    { page, limit: LIMIT, reported: reportedOnly ? true : undefined },
    { skip: tab !== "clubs" }
  );
  const gatherings = useGetAdminGatheringsQuery(
    { page, limit: LIMIT, reported: reportedOnly ? true : undefined },
    { skip: tab !== "gatherings" }
  );

  const [archiveClub, archiveState] = useArchiveAdminClubMutation();
  const [cancelGathering, cancelState] = useCancelAdminGatheringMutation();
  const busy = archiveState.isLoading || cancelState.isLoading;

  const active = tab === "clubs" ? clubs : gatherings;
  const rows = (active.data && active.data.data) || [];
  const total = (active.data && active.data.pagination && active.data.pagination.total) || 0;
  // The backend's `total` is computed before the `reported` filter is applied
  // (it counts the unfiltered match, then filters the current page in
  // memory), so `page * LIMIT < total` alone overclaims a next page once a
  // filtered view runs dry. A short page — fewer rows than we asked for — is
  // itself proof there is nothing more to fetch, filtered or not.
  const hasMore = rows.length === LIMIT && page * LIMIT < total;

  const loadError = t("admin.common.loadError") || "Couldn't load this section.";
  const loadingText = t("admin.common.loading") || "Loading…";
  const emptyText = t("admin.common.empty") || "Nothing to show yet.";

  const statusTone = (status: string) =>
    status === "active" || status === "scheduled" ? "brand" : "banana";

  const actionLabel = (kind: "archive" | "restore" | "cancel"): string => {
    if (kind === "archive") return t("admin.content.archive") || "Archive";
    if (kind === "restore") return t("admin.content.restore") || "Restore";
    return t("admin.content.cancel") || "Cancel";
  };

  const dialogTitle = (kind: "archive" | "restore" | "cancel"): string => {
    if (kind === "archive") return t("admin.content.archiveTitle") || "Archive club";
    if (kind === "restore") return t("admin.content.restoreTitle") || "Restore club";
    return t("admin.content.cancelTitle") || "Cancel gathering";
  };

  const handleConfirm = async (reason: string) => {
    if (!pending) return;
    setActionError("");
    try {
      if (pending.kind === "cancel") {
        await cancelGathering({ id: pending.row._id, reason }).unwrap();
      } else {
        await archiveClub({
          id: pending.row._id,
          archived: pending.kind === "archive",
          reason,
        }).unwrap();
      }
      setPending(null);
    } catch (err: any) {
      setActionError(
        (err && err.data && err.data.message) ||
          (err && err.message) ||
          t("admin.common.actionError") ||
          "Something went wrong."
      );
    }
  };

  const clubColumns = [
    { key: "name", header: t("admin.content.name") || "Name" },
    {
      key: "language",
      header: t("admin.content.language") || "Language",
      render: (row: any) => row.languageLabel || row.language || "—",
    },
    {
      key: "memberCount",
      header: t("admin.content.members") || "Members",
      className: "text-right tabular-nums",
      render: (row: any) => num(row.memberCount),
    },
    {
      key: "status",
      header: t("admin.content.status") || "Status",
      render: (row: any) => <Badge tone={statusTone(row.status)}>{row.status}</Badge>,
    },
    {
      key: "openReports",
      header: t("admin.content.openReports") || "Open reports",
      className: "text-right tabular-nums",
      render: (row: any) => num(row.openReports),
    },
    {
      key: "createdAt",
      header: t("admin.content.created") || "Created",
      className: "whitespace-nowrap",
      render: (row: any) => formatWhen(row.createdAt),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (row: any) => {
        const kind: "archive" | "restore" = row.status === "archived" ? "restore" : "archive";
        return (
          <button
            type="button"
            onClick={() => setPending({ kind, row })}
            className="rounded-chip border border-line px-2.5 py-1 text-xs font-medium text-ink-700 hover:bg-ink-100 dark:border-line-dark dark:text-ink-200 dark:hover:bg-ink-800"
          >
            {actionLabel(kind)}
          </button>
        );
      },
    },
  ];

  const gatheringColumns = [
    { key: "title", header: t("admin.content.title") || "Title" },
    {
      key: "language",
      header: t("admin.content.language") || "Language",
      render: (row: any) => row.languageLabel || row.language || "—",
    },
    {
      key: "startsAt",
      header: t("admin.content.startsAt") || "Starts at",
      className: "whitespace-nowrap",
      render: (row: any) => formatWhen(row.startsAt),
    },
    {
      key: "going",
      header: t("admin.content.going") || "Going",
      className: "text-right tabular-nums",
      render: (row: any) => `${num(row.goingCount)}/${num(row.capacity)}`,
    },
    {
      key: "status",
      header: t("admin.content.status") || "Status",
      render: (row: any) => <Badge tone={statusTone(row.status)}>{row.status}</Badge>,
    },
    {
      key: "openReports",
      header: t("admin.content.openReports") || "Open reports",
      className: "text-right tabular-nums",
      render: (row: any) => num(row.openReports),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (row: any) =>
        row.status === "cancelled" ? null : (
          <button
            type="button"
            onClick={() => setPending({ kind: "cancel", row })}
            className="rounded-chip border border-line px-2.5 py-1 text-xs font-medium text-ink-700 hover:bg-ink-100 dark:border-line-dark dark:text-ink-200 dark:hover:bg-ink-800"
          >
            {actionLabel("cancel")}
          </button>
        ),
    },
  ];

  const tabButtonClass = (selected: boolean) =>
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
          {t("admin.nav.content") || "Content"}
        </h1>
        <RefreshButton
          label={t("admin.common.refresh") || "Refresh"}
          isFetching={active.isFetching}
          onRefresh={() => active.refetch()}
        />
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label={t("admin.content.tabs") || "Content type"} className="flex gap-2">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "clubs"}
            className={tabButtonClass(tab === "clubs")}
            onClick={() => {
              setTab("clubs");
              resetPaging();
            }}
          >
            {t("admin.content.clubs") || "Clubs"}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "gatherings"}
            className={tabButtonClass(tab === "gatherings")}
            onClick={() => {
              setTab("gatherings");
              resetPaging();
            }}
          >
            {t("admin.content.gatherings") || "Gatherings"}
          </button>
        </div>

        <label className="flex items-center gap-2 text-sm text-ink-700 dark:text-ink-200">
          <input
            type="checkbox"
            checked={reportedOnly}
            onChange={(e) => {
              setReportedOnly(e.target.checked);
              resetPaging();
            }}
          />
          {t("admin.content.reportedOnly") || "Reported only"}
        </label>
      </div>

      {active.isError ? (
        <div
          data-testid="section-error"
          role="status"
          className="rounded-card border border-line bg-surface px-4 py-3 text-sm text-ink-600 dark:border-line-dark dark:bg-cardbg-dark dark:text-ink-300"
        >
          {loadError}
        </div>
      ) : active.isLoading ? (
        <div
          data-testid="section-loading"
          className="animate-pulse rounded-card border border-line bg-surface px-4 py-3 text-sm text-ink-400 dark:border-line-dark dark:bg-cardbg-dark"
        >
          {loadingText}
        </div>
      ) : (
        <DataTable
          rows={rows}
          rowKey="_id"
          emptyText={emptyText}
          columns={tab === "clubs" ? clubColumns : gatheringColumns}
          page={page}
          hasMore={hasMore}
          onPageChange={(next) => setPage(Math.max(1, next))}
        />
      )}

      <ConfirmDialog
        open={pending !== null}
        title={pending ? dialogTitle(pending.kind) : ""}
        confirmLabel={pending ? actionLabel(pending.kind) : ""}
        cancelLabel={t("admin.common.cancel") || "Cancel"}
        requireReason
        busy={busy}
        error={actionError}
        onConfirm={handleConfirm}
        onCancel={() => {
          setActionError("");
          setPending(null);
        }}
      />
    </div>
  );
};

export default AdminContent;
