import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useGetAppConfigQuery, PublicAnnouncement } from "../../store/slices/appConfigSlice";
import { dismiss as remember, isDismissed } from "./dismissals";

export interface WebAnnouncements {
  popup: PublicAnnouncement | null;
  banner: PublicAnnouncement | null;
  dismiss: (id: string) => void;
}

export function useWebAnnouncements(): WebAnnouncements {
  const { i18n } = useTranslation();
  const { data } = useGetAppConfigQuery({ platform: "web", lang: i18n.language });
  const [tick, setTick] = useState(0);

  const dismiss = useCallback((id: string) => {
    remember(id);
    setTick((n) => n + 1);
  }, []);

  return useMemo(() => {
    const list: PublicAnnouncement[] = (data && Array.isArray(data.announcements) ? data.announcements : [])
      .filter((a: PublicAnnouncement) => a && a.id && !isDismissed(a.id));
    const banner = list.find((a) => a.displayStyle === "banner") || null;
    const popup = list.find((a) => a.displayStyle !== "banner") || null;
    return { popup, banner, dismiss };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, tick, dismiss]);
}
