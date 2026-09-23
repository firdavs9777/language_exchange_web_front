import { ADMIN_URL } from "../../constants";
import { apiSlice } from "./apiSlice";

/**
 * The admin console's data layer: one endpoint per route in the backend's
 * `routes/admin.js`, and nothing the backend doesn't serve. Every route below
 * sits behind `protect` + `authorize('admin')`, so a non-admin reaching one of
 * these gets a 403 regardless of what the client believes about its user.
 *
 * Two conventions the six pages rely on:
 *
 *  - `transformResponse` unwraps the `{ success, data, ... }` envelope. A
 *    paginated read returns `{ data, pagination }`; everything else returns
 *    `data` itself, so a page never writes `?.data?.data`.
 *  - Tags: `AdminUserList` is carried by both user lists (search and banned) so
 *    a ban, unban, role change or delete refetches whichever table the
 *    moderator is looking at; `AdminUser` is per-id for the detail drawer;
 *    `AdminContent` covers clubs and gatherings.
 */

/** Drop undefined/null/empty values so we never send `?q=` or `?feature=`. */
const params = (arg: Record<string, any> = {}): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(arg || {})) {
    if (value !== undefined && value !== null && value !== "") {
      out[key] = String(value);
    }
  }
  return out;
};

/** `data` out of the envelope; `null` rather than `undefined` when absent. */
const unwrap = (response: any) => (response && "data" in response ? response.data : response);

/**
 * A paginated list, normalized to `{ data, pagination }`.
 *
 * `/users`, `/banned-users`, `/audit-log` and `/ai-usage/logs` return a real
 * `pagination` object. The content routes (`/content/clubs`, `/content/
 * gatherings`) return flat `count`/`total` instead — mapped here to the same
 * shape so the tables don't need two code paths. `hasMore` is only ever what
 * the backend said: it is never inferred.
 */
const unwrapList = (response: any) => ({
  data: Array.isArray(response?.data) ? response.data : [],
  pagination:
    response?.pagination ||
    { total: response?.total ?? 0, count: response?.count ?? 0 },
});

export const adminApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder: any) => ({
    // --- Dashboard reads -------------------------------------------------
    getAdminStats: builder.query({
      query: () => ({ url: `${ADMIN_URL}/stats` }),
      transformResponse: unwrap,
      providesTags: ["AdminStats"],
    }),
    getAdminActivity: builder.query({
      query: (arg: { limit?: number } = {}) => ({
        url: `${ADMIN_URL}/activity`,
        params: params(arg),
      }),
      transformResponse: unwrap,
      providesTags: ["AdminStats"],
    }),

    // --- Users -----------------------------------------------------------
    searchAdminUsers: builder.query({
      query: (arg: { q?: string; adminsOnly?: boolean; page?: number; limit?: number } = {}) => ({
        url: `${ADMIN_URL}/users`,
        params: params(arg),
      }),
      transformResponse: unwrapList,
      providesTags: ["AdminUserList"],
    }),
    getAdminUser: builder.query({
      query: (id: string) => ({ url: `${ADMIN_URL}/users/${id}` }),
      transformResponse: unwrap,
      providesTags: (_result: any, _error: any, id: string) => [{ type: "AdminUser", id }],
    }),
    getBannedUsers: builder.query({
      query: (arg: { page?: number; limit?: number; search?: string } = {}) => ({
        url: `${ADMIN_URL}/banned-users`,
        params: params(arg),
      }),
      transformResponse: unwrapList,
      providesTags: ["AdminUserList"],
    }),

    // --- User moderation --------------------------------------------------
    // `reason` is required by the backend on ban; the dialogs enforce it before
    // these ever fire. None of the four is retried: a moderation action that
    // silently repeats is worse than one that visibly failed.
    banAdminUser: builder.mutation({
      query: ({ id, reason }: { id: string; reason: string }) => ({
        url: `${ADMIN_URL}/users/${id}/ban`,
        method: "POST",
        body: { reason },
      }),
      transformResponse: unwrap,
      extraOptions: { maxRetries: 0 },
      invalidatesTags: (_r: any, _e: any, arg: { id: string }) => [
        { type: "AdminUser", id: arg.id },
        "AdminUserList",
      ],
    }),
    unbanAdminUser: builder.mutation({
      query: ({ id, reason }: { id: string; reason?: string }) => ({
        url: `${ADMIN_URL}/users/${id}/unban`,
        method: "POST",
        body: { reason },
      }),
      transformResponse: unwrap,
      extraOptions: { maxRetries: 0 },
      invalidatesTags: (_r: any, _e: any, arg: { id: string }) => [
        { type: "AdminUser", id: arg.id },
        "AdminUserList",
      ],
    }),
    changeAdminUserRole: builder.mutation({
      query: ({ id, role, reason }: { id: string; role: "admin" | "user"; reason?: string }) => ({
        url: `${ADMIN_URL}/users/${id}/role`,
        method: "PUT",
        body: { role, reason },
      }),
      transformResponse: unwrap,
      extraOptions: { maxRetries: 0 },
      invalidatesTags: (_r: any, _e: any, arg: { id: string }) => [
        { type: "AdminUser", id: arg.id },
        "AdminUserList",
      ],
    }),
    hardDeleteAdminUser: builder.mutation({
      query: ({ id, reason }: { id: string; reason?: string }) => ({
        url: `${ADMIN_URL}/users/${id}`,
        method: "DELETE",
        body: { reason },
      }),
      transformResponse: unwrap,
      extraOptions: { maxRetries: 0 },
      invalidatesTags: (_r: any, _e: any, arg: { id: string }) => [
        { type: "AdminUser", id: arg.id },
        "AdminUserList",
      ],
    }),

    // --- Audit log ---------------------------------------------------------
    getAuditLog: builder.query({
      query: (
        arg: {
          moderatorId?: string;
          targetId?: string;
          action?: string;
          page?: number;
          limit?: number;
        } = {}
      ) => ({ url: `${ADMIN_URL}/audit-log`, params: params(arg) }),
      transformResponse: unwrapList,
    }),

    // --- AI usage ----------------------------------------------------------
    getAiUsage: builder.query({
      query: (arg: { feature?: string; from?: string; to?: string } = {}) => ({
        url: `${ADMIN_URL}/ai-usage`,
        params: params(arg),
      }),
      transformResponse: unwrap,
    }),
    getAiUsageLogs: builder.query({
      query: (
        arg: { feature?: string; from?: string; to?: string; page?: number; limit?: number } = {}
      ) => ({ url: `${ADMIN_URL}/ai-usage/logs`, params: params(arg) }),
      transformResponse: unwrapList,
    }),

    // --- Content moderation -------------------------------------------------
    getAdminClubs: builder.query({
      query: (arg: { page?: number; limit?: number; reported?: boolean } = {}) => ({
        url: `${ADMIN_URL}/content/clubs`,
        params: params(arg),
      }),
      transformResponse: unwrapList,
      providesTags: ["AdminContent"],
    }),
    getAdminGatherings: builder.query({
      query: (arg: { page?: number; limit?: number; reported?: boolean } = {}) => ({
        url: `${ADMIN_URL}/content/gatherings`,
        params: params(arg),
      }),
      transformResponse: unwrapList,
      providesTags: ["AdminContent"],
    }),
    archiveAdminClub: builder.mutation({
      // `archived` defaults to true: the button says "Archive". Passing false
      // is how the same endpoint un-archives.
      query: ({
        id,
        archived = true,
        reason,
      }: {
        id: string;
        archived?: boolean;
        reason?: string;
      }) => ({
        url: `${ADMIN_URL}/content/clubs/${id}/archive`,
        method: "POST",
        body: { archived, reason },
      }),
      transformResponse: unwrap,
      extraOptions: { maxRetries: 0 },
      invalidatesTags: ["AdminContent"],
    }),
    cancelAdminGathering: builder.mutation({
      query: ({ id, reason }: { id: string; reason?: string }) => ({
        url: `${ADMIN_URL}/content/gatherings/${id}/cancel`,
        method: "POST",
        body: { reason },
      }),
      transformResponse: unwrap,
      extraOptions: { maxRetries: 0 },
      invalidatesTags: ["AdminContent"],
    }),

    // --- Reach analytics -----------------------------------------------------
    getAnalyticsEvents: builder.query({
      query: (arg: { days?: number } = {}) => ({
        url: `${ADMIN_URL}/analytics/events`,
        params: params(arg),
      }),
      transformResponse: unwrap,
    }),
    getAnalyticsVisits: builder.query({
      query: () => ({ url: `${ADMIN_URL}/analytics/visits` }),
      transformResponse: unwrap,
    }),
  }),
});

export const {
  useGetAdminStatsQuery,
  useGetAdminActivityQuery,
  useSearchAdminUsersQuery,
  useGetAdminUserQuery,
  useGetBannedUsersQuery,
  useBanAdminUserMutation,
  useUnbanAdminUserMutation,
  useChangeAdminUserRoleMutation,
  useHardDeleteAdminUserMutation,
  useGetAuditLogQuery,
  useGetAiUsageQuery,
  useGetAiUsageLogsQuery,
  useGetAdminClubsQuery,
  useGetAdminGatheringsQuery,
  useArchiveAdminClubMutation,
  useCancelAdminGatheringMutation,
  useGetAnalyticsEventsQuery,
  useGetAnalyticsVisitsQuery,
} = adminApiSlice;
