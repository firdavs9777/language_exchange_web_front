import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useSearchAdminUsersQuery,
  useGetBannedUsersQuery,
} from "../../../store/slices/adminSlice";
import { SurfaceCard, Avatar, Badge } from "../../../design";
import DataTable from "../parts/DataTable";
import RefreshButton from "../parts/RefreshButton";
import UserDetailDrawer from "../parts/UserDetailDrawer";

/**
 * Find a user, then act on them.
 *
 * Two tabs over two endpoints: `/admin/users` (free-text `q`, optional
 * `adminsOnly`) and `/admin/banned-users` (`search`). Both are paginated by
 * the backend's `hasMore` — never by counting rows, which would page past the
 * end of a short last page.
 *
 * The search box is debounced by 300ms: a moderator typing an email would
 * otherwise fire a query per keystroke against a collection scan.
 */

const PAGE_SIZE = 20;
const DEBOUNCE_MS = 300;

const formatDate = (value: any): string => {
  if (!value) return "—";
  const date = new Date(value);
  return isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
};

const AdminUsers: React.FC = () => {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"all" | "banned">("all");
  const [text, setText] = useState("");
  const [query, setQuery] = useState("");
  const [adminsOnly, setAdminsOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Debounce the box into `query`; the queries below read only `query`.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(text.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text]);

  // A new filter is a new result set: staying on page 4 of the old one would
  // show an empty table and look like "no results".
  useEffect(() => {
    setPage(1);
  }, [query, adminsOnly, tab]);

  const all = useSearchAdminUsersQuery(
    {
      q: query || undefined,
      adminsOnly: adminsOnly || undefined,
      page,
      limit: PAGE_SIZE,
    },
    { skip: tab !== "all" }
  );
  const banned = useGetBannedUsersQuery(
    { search: query || undefined, page, limit: PAGE_SIZE },
    { skip: tab !== "banned" }
  );

  const active: any = tab === "banned" ? banned : all;
  const rows: any[] = (active.data && active.data.data) || [];
  const pagination: any = (active.data && active.data.pagination) || {};

  const tabButton = (value: "all" | "banned", label: string, testId: string) => (
    <button
      type="button"
      data-testid={testId}
      role="tab"
      aria-selected={tab === value}
      onClick={() => setTab(value)}
      className={[
        "rounded-chip px-3 py-1.5 text-sm font-medium transition-colors",
        tab === value
          ? "bg-brand-deep text-white"
          : "border border-line text-ink-700 hover:bg-ink-100 dark:border-line-dark dark:text-ink-200 dark:hover:bg-ink-800",
      ].join(" ")}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-display-sm text-ink-900 dark:text-ink-50">
          {t("admin.nav.users") || "Users"}
        </h1>
        <RefreshButton
          label={t("admin.common.refresh") || "Refresh"}
          isFetching={!!active.isFetching}
          onRefresh={() => active.refetch()}
        />
      </header>

      <SurfaceCard padding="lg">
        <div className="flex flex-wrap items-center gap-3">
          <div role="tablist" className="flex gap-2">
            {tabButton("all", t("admin.users.tabAll") || "All users", "admin-users-tab-all")}
            {tabButton("banned", t("admin.users.tabBanned") || "Banned", "admin-users-tab-banned")}
          </div>

          <input
            data-testid="admin-users-search"
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("admin.users.searchPlaceholder") || "Search name, email or username"}
            aria-label={t("admin.users.searchLabel") || "Search users"}
            className={[
              "min-w-[14rem] flex-1 rounded-chip border border-line bg-surface px-3 py-1.5 text-sm",
              "text-ink-900 placeholder:text-ink-400",
              "dark:border-line-dark dark:bg-cardbg-dark dark:text-ink-50",
            ].join(" ")}
          />

          {tab === "all" ? (
            <label className="flex items-center gap-2 text-sm text-ink-700 dark:text-ink-200">
              <input
                data-testid="admin-users-admins-only"
                type="checkbox"
                checked={adminsOnly}
                onChange={(e) => setAdminsOnly(e.target.checked)}
              />
              {t("admin.users.adminsOnly") || "Admins only"}
            </label>
          ) : null}
        </div>

        {active.isError ? (
          <div
            data-testid="admin-users-error"
            role="status"
            className="mt-4 rounded-card border border-line px-4 py-3 text-sm text-ink-600 dark:border-line-dark dark:text-ink-300"
          >
            {t("admin.common.loadError") || "Couldn't load this section."}
          </div>
        ) : null}

        {active.isLoading ? (
          <div
            data-testid="admin-users-loading"
            className="mt-4 animate-pulse rounded-card border border-line px-4 py-3 text-sm text-ink-400 dark:border-line-dark"
          >
            {t("admin.common.loading") || "Loading…"}
          </div>
        ) : null}

        <DataTable
          className="pt-4"
          caption={t("admin.nav.users") || "Users"}
          rowKey="_id"
          rows={rows}
          page={page}
          hasMore={!!pagination.hasMore}
          onPageChange={(next) => setPage(Math.max(1, next))}
          onRowClick={(row: any) => setSelectedId(String(row?._id || ""))}
          emptyText={t("admin.users.empty") || "No users match this search."}
          columns={[
            {
              key: "name",
              header: t("admin.users.name") || "Name",
              render: (row: any) => (
                <div className="flex items-center gap-2">
                  <Avatar
                    name={row?.name || "?"}
                    src={Array.isArray(row?.imageUrls) ? row.imageUrls[0] : undefined}
                    size={40}
                  />
                  <div>
                    <div className="font-medium text-ink-900 dark:text-ink-50">
                      {row?.name || "—"}
                    </div>
                    <div className="text-xs text-ink-500 dark:text-ink-400">
                      {row?.username ? `@${row.username}` : ""}
                    </div>
                  </div>
                </div>
              ),
            },
            {
              key: "email",
              header: t("admin.users.email") || "Email",
              render: (row: any) => row?.email || "—",
            },
            {
              key: "role",
              header: t("admin.users.role") || "Role",
              render: (row: any) => (
                <Badge tone={row?.role === "admin" ? "brand" : "banana"}>
                  {row?.role || "user"}
                </Badge>
              ),
            },
            {
              key: "isBanned",
              header: t("admin.users.status") || "Status",
              render: (row: any) =>
                row?.isBanned ? (
                  <span className="text-red-700 dark:text-red-300">
                    {t("admin.users.banned") || "Banned"}
                  </span>
                ) : (
                  <span className="text-ink-500 dark:text-ink-400">
                    {t("admin.users.active") || "Active"}
                  </span>
                ),
            },
            {
              key: "createdAt",
              header: t("admin.users.joined") || "Joined",
              className: "whitespace-nowrap tabular-nums",
              render: (row: any) => formatDate(row?.createdAt),
            },
          ]}
        />
      </SurfaceCard>

      {selectedId ? (
        <UserDetailDrawer userId={selectedId} onClose={() => setSelectedId(null)} />
      ) : null}
    </div>
  );
};

export default AdminUsers;
