import { useTranslation } from "react-i18next";
import { useGetAppConfigQuery } from "../store/slices/appConfigSlice";

/**
 * App config as the web reads it everywhere: same args as useWebAnnouncements
 * and the flags, so one cache entry and one request (community pages used to
 * read it with no args -- a second request, and a waterfall before the list).
 * Re-read on window focus so a flag the owner flips shows up without a reload.
 */
export function useWebAppConfig() {
  const { i18n } = useTranslation();
  // Some suites mock react-i18next without `i18n`; fall back to "en" so the
  // hook never crashes a screen that merely shows a flagged button.
  const lang = (i18n && i18n.language) || "en";
  return useGetAppConfigQuery({ platform: "web", lang }, { refetchOnFocus: true });
}
