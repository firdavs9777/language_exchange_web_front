import React from "react";
import { useTranslation } from "react-i18next";
import SurfaceCard from "../../design/SurfaceCard";
import Badge from "../../design/Badge";
import { displayCode } from "../../utils/languages";
import StoreLink from "../growth/StoreLink";
import {
  useGetPublicCommunitiesQuery,
  PublicCommunity,
} from "../../store/slices/publicCommunitiesSlice";
import { formatCount } from "../../store/slices/publicStatsSlice";

// What a logged-out visitor -- and every crawler -- gets at /communities.
//
// The page is prerendered, so nothing here may read window/document/navigator
// during render: the store link is a plain href (no platform sniffing, which
// would bake one store into the static HTML) and the list comes from the
// preloaded store state the prerender transferred.
//
// Joining is an app action, so the page never pretends otherwise: every card's
// action is a store link, not a button that would bounce the visitor to /login.

const CommunityCard: React.FC<{ community: PublicCommunity }> = ({ community }) => {
  const { t } = useTranslation();
  const languages = Array.isArray(community.languages) ? community.languages : [];
  const members = Number(community.memberCount) || 0;

  return (
    <li data-testid="public-community-card" className="list-none">
      <SurfaceCard padding="lg" className="flex h-full flex-col gap-3">
        <h2 className="text-base font-extrabold text-gray-900 dark:text-gray-50">
          {community.name}
        </h2>

        {community.description ? (
          <p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
            {community.description}
          </p>
        ) : null}

        {languages.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {/* One chip per language the club practices. A plain Badge, not the
                exchange pill: a club names one language, and an arrow between
                two copies of it would read as a glitch. */}
            {languages.map((language, i) => (
              <Badge key={`${language}-${i}`}>
                <span data-testid="language-chip">{displayCode(language)}</span>
              </Badge>
            ))}
          </div>
        )}

        <p
          data-testid="public-community-members"
          className="text-xs font-semibold uppercase tracking-wide text-gray-400"
        >
          {formatCount(members)} {t("communities.public.members") || "members"}
        </p>

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
            {t("communities.public.join") || "Join in the app"}
          </span>
          {/* Both stores, always: the page is static, so it cannot know which
              one this visitor needs. */}
          <StoreLink
            store="ios"
            placement="communities"
            variant="button"
            className="rounded-lg bg-brand px-3 py-1.5 text-xs font-extrabold text-white"
          />
          <StoreLink
            store="android"
            placement="communities"
            variant="button"
            className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-extrabold text-white dark:bg-gray-700"
          />
        </div>
      </SurfaceCard>
    </li>
  );
};

const PublicCommunities: React.FC = () => {
  const { t } = useTranslation();
  const { data, isError } = useGetPublicCommunitiesQuery();

  const communities: PublicCommunity[] = Array.isArray(data) ? data : [];
  // A dead endpoint is not an error page. The visitor came for a reason, so a
  // failed fetch and an empty list get the same answer: the app has the rest.
  const showEmpty = isError || communities.length === 0;

  return (
    <div
      data-testid="public-communities"
      className="bg-surface px-4 py-12 dark:bg-canvas-dark"
    >
      <div className="mx-auto max-w-5xl">
        <header className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50">
            {t("communities.public.title") || "Language exchange communities"}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-gray-600 dark:text-gray-300">
            {t("communities.public.intro") ||
              "Real groups inside BananaTalk, where people practice one language together every day. Find yours here, then open it in the app and start talking."}
          </p>
        </header>

        {showEmpty ? (
          <div
            data-testid="public-communities-empty"
            className="mx-auto mt-10 max-w-xl text-center"
          >
            <h2 className="text-lg font-extrabold text-gray-900 dark:text-gray-50">
              {t("communities.public.empty.title") || "New communities open every week"}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              {t("communities.public.empty.body") ||
                "There is nothing to show here just yet. Get the app and every community shows up the moment it opens."}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <StoreLink
                store="ios"
                placement="communities"
                variant="badge"
                className="rounded-xl bg-gray-900 px-5 py-2.5 text-left text-white"
              />
              <StoreLink
                store="android"
                placement="communities"
                variant="badge"
                className="rounded-xl bg-gray-900 px-5 py-2.5 text-left text-white"
              />
            </div>
          </div>
        ) : (
          <ul className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {communities.map((community) => (
              <CommunityCard key={community.id} community={community} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default PublicCommunities;
