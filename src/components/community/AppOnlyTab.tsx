import React from "react";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";
import { useWebFlag } from "../../utils/webFlags";
import { CalendarDays, MessagesSquare } from "lucide-react";
import StoreLink from "../growth/StoreLink";

/**
 * Gatherings and Rooms: tabs in the app's Community row. While the website's
 * own pages are switched off (webGatheringsEnabled / webLanguageRoomsEnabled)
 * the tab says plainly where the feature lives instead of a dead page.
 */
const AppOnlyTab: React.FC<{ kind: "gatherings" | "rooms" }> = ({ kind }) => {
  const { t } = useTranslation();
  // When the website's own page is switched on, the tab opens it.
  const gatheringsOn = useWebFlag("webGatheringsEnabled");
  const roomsOn = useWebFlag("webLanguageRoomsEnabled");
  const Icon = kind === "rooms" ? MessagesSquare : CalendarDays;
  const title =
    kind === "rooms"
      ? t("communityMain.appOnly.roomsTitle") || "Rooms are in the app"
      : t("communityMain.appOnly.gatheringsTitle") || "Gatherings are in the app";
  const body =
    kind === "rooms"
      ? t("communityMain.appOnly.roomsBody") ||
        "Join group chats by language and topic, or start your own room, in the BananaTalk app."
      : t("communityMain.appOnly.gatheringsBody") ||
        "Find clubs and meetups with people learning your language, in the BananaTalk app.";

  if (kind === "gatherings" && gatheringsOn) return <Navigate to="/gatherings" />;
  if (kind === "rooms" && roomsOn) return <Navigate to="/rooms" />;

  return (
    <div className="community-empty" data-testid={`community-app-only-${kind}`}>
      <Icon className="community-empty__icon" aria-hidden />
      <h3>{title}</h3>
      <p>{body}</p>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        <StoreLink
          store="ios"
          placement="communities"
          className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-bold text-white"
        />
        <StoreLink
          store="android"
          placement="communities"
          className="rounded-xl border border-gray-300 px-5 py-2.5 text-sm font-bold text-gray-900 dark:border-gray-600 dark:text-gray-50"
        />
      </div>
    </div>
  );
};

export default AppOnlyTab;
