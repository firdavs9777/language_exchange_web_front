import React from "react";
import { useTranslation } from "react-i18next";

/** Placeholder. Task 5 fills this with the usage summary and the filtered log table. */
const AdminAiUsage: React.FC = () => {
  const { t } = useTranslation();
  return (
    <h1 className="font-display text-display-sm text-ink-900 dark:text-ink-50">
      {t("admin.nav.aiUsage") || "AI usage"}
    </h1>
  );
};

export default AdminAiUsage;
