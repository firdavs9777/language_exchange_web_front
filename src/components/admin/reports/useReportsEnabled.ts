import { useGetAdminReportSettingsQuery } from "../../../store/slices/adminSlice";

/**
 * Whether the backend has reports switched on (`ANALYTICS_REPORTS_ENABLED`).
 *
 * Probed with `GET /admin/reports/settings` rather than the report itself:
 * both are behind the same flag (404 while it is off), but the settings read
 * is one user lookup, while a report can take seconds to build — and this runs
 * on every console page, for the nav. Anything but a success (loading, 404,
 * any other error) counts as off, so Reach stays exactly as it is today.
 */
export const useReportsEnabled = (): { enabled: boolean; settled: boolean } => {
  const settings = useGetAdminReportSettingsQuery(undefined as any);
  return { enabled: !!settings.isSuccess, settled: !!settings.isSuccess || !!settings.isError };
};
