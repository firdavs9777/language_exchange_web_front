import React from "react";
import { useTranslation } from "react-i18next";

/** Placeholder. Task 5 fills this with the clubs and gatherings moderation tabs. */
const AdminContent: React.FC = () => {
  const { t } = useTranslation();
  return (
    <h1 className="font-display text-display-sm text-ink-900 dark:text-ink-50">
      {t("admin.nav.content") || "Content"}
    </h1>
  );
};

export default AdminContent;
