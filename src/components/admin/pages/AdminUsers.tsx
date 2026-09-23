import React from "react";
import { useTranslation } from "react-i18next";

/** Placeholder. Task 4 fills this with search, the paginated table and the user detail drawer. */
const AdminUsers: React.FC = () => {
  const { t } = useTranslation();
  return (
    <h1 className="font-display text-display-sm text-ink-900 dark:text-ink-50">
      {t("admin.nav.users") || "Users"}
    </h1>
  );
};

export default AdminUsers;
