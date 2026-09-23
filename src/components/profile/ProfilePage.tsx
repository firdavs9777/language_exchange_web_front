import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { RefreshCw, UserX } from "lucide-react";
import PageMeta from "../../seo/PageMeta";
import SurfaceCard from "../../design/SurfaceCard";
import AdUnit from "../ads/AdUnit";
import { AD_SLOTS } from "../ads/adsenseConfig";
import useProfileData from "./useProfileData";
import ProfileHeader from "./parts/ProfileHeader";
import ProfileStats from "./parts/ProfileStats";
import ProfileActions from "./parts/ProfileActions";
import ProfileLanguages from "./parts/ProfileLanguages";
import ProfileAbout from "./parts/ProfileAbout";
import ProfileLearning from "./parts/ProfileLearning";
import ProfileMoments from "./parts/ProfileMoments";

/**
 * How many moment tiles the profile shows before "See all" takes over. Three
 * rows of the widest grid, so the section never pushes the rest of the page
 * off the screen on a heavy account (`GET /moments/user/:id` is unpaginated).
 */
const MOMENTS_ON_PROFILE = 9;

/** Where a blocked person's profile sends the viewer. */
const AFTER_BLOCK = "/communities";

const PAGE = "min-h-screen bg-canvas dark:bg-canvas-dark";
const COLUMN = "mx-auto w-full max-w-5xl px-3 pb-16 pt-4 sm:px-4 sm:pt-6";

/** RTK Query surfaces the HTTP status as `status`, or `originalStatus` for a non-JSON body. */
function statusOf(error: any): number {
  if (!error) return 0;
  if (typeof error.status === "number") return error.status;
  if (typeof error.originalStatus === "number") return error.originalStatus;
  return 0;
}

/** Grey blocks in the shape of the loaded page, so nothing jumps when it arrives. */
const ProfileSkeleton: React.FC = () => (
  <div data-testid="profile-skeleton" aria-busy="true" className="animate-pulse space-y-4">
    <div className="overflow-hidden rounded-card bg-surface shadow-card dark:bg-cardbg-dark dark:shadow-none">
      <div className="h-28 bg-ink-100 dark:bg-ink-800 sm:h-32" />
      <div className="px-4 pb-5 sm:px-6">
        <div className="-mt-10 h-20 w-20 rounded-full border-4 border-surface bg-ink-100 dark:border-cardbg-dark dark:bg-ink-800" />
        <div className="mt-3 h-5 w-40 rounded-chip bg-ink-100 dark:bg-ink-800" />
        <div className="mt-2 h-4 w-24 rounded-chip bg-ink-100 dark:bg-ink-800" />
        <div className="mt-3 h-6 w-56 rounded-chip bg-ink-100 dark:bg-ink-800" />
      </div>
    </div>

    <div className="grid grid-cols-3 gap-2">
      {[0, 1, 2].map((tile) => (
        <div
          key={tile}
          className="h-20 rounded-card bg-surface shadow-card dark:bg-cardbg-dark dark:shadow-none"
        />
      ))}
    </div>

    <div className="h-10 rounded-chip bg-ink-100 dark:bg-ink-800" />

    <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
      <div className="space-y-4">
        <div className="h-36 rounded-card bg-surface shadow-card dark:bg-cardbg-dark dark:shadow-none" />
        <div className="h-48 rounded-card bg-surface shadow-card dark:bg-cardbg-dark dark:shadow-none" />
      </div>
      <div className="h-72 rounded-card bg-surface shadow-card dark:bg-cardbg-dark dark:shadow-none" />
    </div>
  </div>
);

/**
 * One profile page for both routes.
 *
 * `/profile` and `/profile/:userId` render this same component; whose profile
 * it is comes from `useProfileData`, which compares the route param with the
 * signed-in user in the store — so the two routes cannot drift apart the way
 * `Profile.tsx` and `CommunityDetail.tsx` did (inventory §2).
 *
 * The layout is one column on a phone and two from 1024px up, with the
 * personal facts on the left and the moments grid on the right; the header,
 * the stat tiles and the action row always span the full width.
 */
const ProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { isOwn, user, stats, isFollowing, loading, error, refetch } = useProfileData(userId);

  const name = (user && (user.name || user.username)) || "";
  const displayName = name || t("profile.page.title") || "Profile";
  // The moments section and the hook must ask for the same id, or RTK Query
  // keys them separately and the one request becomes two.
  const profileId = userId || (user && user._id) || "";

  const images = (user && user.imageUrls) || [];
  const notFound = !loading && (statusOf(error) === 404 || (!error && !user));
  const failed = !loading && !notFound && Boolean(error);

  const meta = <PageMeta noindex title={`${displayName} · BananaTalk`} />;

  if (loading) {
    return (
      <div className={PAGE}>
        {meta}
        <div className={COLUMN}>
          <ProfileSkeleton />
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className={PAGE}>
        {meta}
        <div className={COLUMN}>
          <SurfaceCard padding="lg">
            <div data-testid="profile-not-found" className="py-6 text-center">
              <UserX className="mx-auto h-8 w-8 text-ink-400" aria-hidden />
              <h1 className="pt-3 font-display text-lg text-ink-900 dark:text-ink-50">
                {t("profile.page.not_found_title") || "Profile not found"}
              </h1>
              <p className="pt-1 text-sm text-ink-500 dark:text-ink-400">
                {t("profile.page.not_found_body") ||
                  "This profile doesn't exist any more, or it was never here."}
              </p>
              <Link
                to={AFTER_BLOCK}
                data-testid="profile-back-to-community"
                className="mt-4 inline-flex items-center justify-center rounded-chip bg-brand-deep px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
              >
                {t("profile.page.back_to_community") || "Browse the community"}
              </Link>
            </div>
          </SurfaceCard>
        </div>
      </div>
    );
  }

  if (failed) {
    return (
      <div className={PAGE}>
        {meta}
        <div className={COLUMN}>
          <SurfaceCard padding="lg">
            <div data-testid="profile-error" role="alert" className="py-6 text-center">
              <h1 className="font-display text-lg text-ink-900 dark:text-ink-50">
                {t("profile.page.error_title") || "We couldn't load this profile"}
              </h1>
              <p className="pt-1 text-sm text-ink-500 dark:text-ink-400">
                {t("profile.page.error_body") || "Check your connection and try again."}
              </p>
              <button
                type="button"
                data-testid="profile-retry"
                onClick={refetch}
                className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-chip bg-brand-deep px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
              >
                <RefreshCw className="h-4 w-4" aria-hidden />
                {t("profile.page.retry") || "Try again"}
              </button>
            </div>
          </SurfaceCard>
        </div>
      </div>
    );
  }

  return (
    <div className={PAGE}>
      {meta}
      <div className={COLUMN}>
        <div data-testid="profile-body" className="space-y-4">
          <ProfileHeader
            name={displayName}
            username={user.username}
            avatarUrl={images[0]}
            isOnline={user.isOnline}
            birthYear={user.birth_year}
            birthMonth={user.birth_month}
            birthDay={user.birth_day}
            location={user.location}
            userMode={user.userMode}
            isEmailVerified={user.isEmailVerified}
            createdAt={user.createdAt}
            lastActive={user.lastActive}
          />

          <ProfileStats
            userId={profileId}
            isOwn={isOwn}
            followers={stats.followers}
            following={stats.following}
            moments={stats.moments}
          />

          <ProfileActions
            userId={profileId}
            isOwn={isOwn}
            name={name}
            isFollowing={isFollowing}
            onBlocked={() => navigate(AFTER_BLOCK)}
          />

          <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
            <div className="space-y-4">
              <ProfileLanguages user={user} />
              <ProfileAbout user={user} />
              <ProfileLearning user={user} />
              {isOwn && <AdUnit slot={AD_SLOTS.profile} className="pt-1" />}
            </div>

            <div className="space-y-4">
              <ProfileMoments userId={profileId} isOwn={isOwn} limit={MOMENTS_ON_PROFILE} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
