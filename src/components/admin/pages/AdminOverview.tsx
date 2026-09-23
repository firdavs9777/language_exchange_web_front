import React from "react";
import { useTranslation } from "react-i18next";

/** Placeholder. Task 3 fills this with stat cards from getAdminStats, getAdminActivity and getAnalyticsVisits. */
const AdminOverview: React.FC = () => {
  const { t } = useTranslation();
  return (
    <h1 className="font-display text-display-sm text-ink-900 dark:text-ink-50">
      {t("admin.nav.overview") || "Overview"}
    </h1>
  );
};

export default AdminOverview;
