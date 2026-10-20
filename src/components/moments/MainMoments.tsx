import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  FaExclamationTriangle,
  FaFilter,
  FaPlus,
  FaRedo,
  FaTimes,
} from "react-icons/fa";
import { Crown, PenLine, Search, SlidersHorizontal, Sparkles, TrendingUp, Users, X } from "lucide-react";
import { useWebFlag } from "../../utils/webFlags";
import { useSelector } from "react-redux";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Pagination from "../../composables/Pagination";
import {
  useGetMomentsQuery,
  useGetPromptOfDayQuery,
  useGetTrendingMomentsQuery,
} from "../../store/slices/momentsSlice";
import EmptyState from "./EmptyState";
import MomentFiltersBar from "./MomentFiltersBar";
import { isPrerendered } from "../../seo/prerender/hydrationFlag";
import { useHasHydrated } from "../../seo/prerender/useHasHydrated";
import {
  MomentFilters,
  decodeMomentFilters,
  encodeMomentFilters,
  hasMomentFilters,
  mergeMomentParams,
} from "./lib/momentFilterState";
import SingleMoment from "./SingleMoment";
import { MomentType } from "./types";
import StoriesFeed from "../stories/StoriesFeed";
import { isVipUser } from "../ads/adsGate";
import AdUnit from "../ads/AdUnit";
import { AD_SLOTS } from "../ads/adsenseConfig";

interface User {
  _id: string;
  name: string;
  images?: string[];
  imageUrls?: string[];
  language_to_learn?: string;
  userMode?: string;
  vipSubscription?: { isActive?: boolean } | null;
}

// Same order as the app: For You, Reels, Following, Trending. Reels is the
// /reels page (behind webReelsEnabled), so it is a link in the tab row.
type FeedTab = "forYou" | "following" | "trending";

interface PromptOfDay {
  text?: string;
  emoji?: string;
  promptId?: string;
  language?: string;
}

interface UserInfo {
  user: User;
}

interface AuthState {
  userInfo?: UserInfo;
}

interface RootState {
  auth: AuthState;
}

interface MomentsResponse {
  moments: MomentType[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalMoments: number;
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    nextPage: number | null;
    prevPage: number | null;
  };
}

interface LoadingStateProps {
  t: (key: string) => string;
}

interface ErrorStateProps {
  t: (key: string) => string;
  refetch: () => void;
}

interface FloatingActionButtonProps {
  onClick: () => void;
}

// Mobile-optimized loading state
const LoadingState: React.FC<LoadingStateProps> = ({ t }) => (
  <div className="flex flex-col items-center justify-center py-8 sm:py-16">
    <div className="relative">
      <div className="h-12 w-12 sm:h-16 sm:w-16 animate-spin rounded-full border-4 border-gray-200"></div>
      <div className="absolute top-0 left-0 h-12 w-12 sm:h-16 sm:w-16 animate-spin rounded-full border-4 border-transparent border-t-blue-500 border-r-purple-500"></div>
      <div className="absolute top-1/2 left-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-r from-blue-500 to-purple-600"></div>
    </div>
    <div className="mt-4 sm:mt-6 text-center px-4">
      <h3 className="text-base sm:text-lg font-semibold text-gray-800">
        {t("moments_section.loading_moments")}
      </h3>
      <p className="mt-1 text-xs sm:text-sm text-gray-500">
        Fetching latest updates...
      </p>
    </div>
  </div>
);

// Mobile-optimized error state
const ErrorState: React.FC<ErrorStateProps> = ({ t, refetch }) => (
  <div className="mx-2 sm:mx-4 my-4 sm:my-6 overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-red-50/80 to-pink-50/50 backdrop-blur-xl border border-red-200/30 shadow-lg">
    <div className="flex items-center gap-3 sm:gap-4 p-4 sm:p-6">
      <div className="flex h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-red-400 to-pink-500 shadow-lg">
        <FaExclamationTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm sm:text-base font-semibold text-gray-800">
          {t("moments_section.error_loading") || "Something went wrong"}
        </h3>
        <p className="mt-1 text-xs sm:text-sm text-gray-600 truncate">
          {t("moments_section.error_info")}
        </p>
      </div>
      <button
        onClick={refetch}
        className="group flex items-center gap-2 rounded-full bg-white/60 backdrop-blur-sm border border-white/30 px-3 py-2 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 shadow-lg transition-all duration-300 hover:bg-white/80 hover:shadow-xl hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-red-400/50"
      >
        <FaRedo className="h-3 w-3 transition-transform group-hover:rotate-180" />
        <span className="hidden xs:inline">
          {t("moments_section.retry_btn")}
        </span>
      </button>
    </div>
  </div>
);

// Enhanced mobile floating action button
const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onClick,
}) => {
  const { t } = useTranslation();
  return (
  <div className="bt-lift-above-tabs fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
    <button
      onClick={onClick}
      className="group flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-500 shadow-2xl transition-all duration-300 hover:scale-105 hover:bg-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-400/50 active:scale-95"
      aria-label={t("moments_section.create.header") || "Create moment"}
    >
      <FaPlus className="h-4 w-4 sm:h-5 sm:w-5 text-white transition-transform group-hover:rotate-90" />
    </button>
  </div>
  );
};

const MainMoments: React.FC = () => {
  const [limit] = useState(10);

  // Filters live in the URL (?cat=&lang=&mood=&tag=&q=) and run on the server.
  const [searchParams, setSearchParams] = useSearchParams();
  // A shared filtered link is served the unfiltered prerendered page, so a
  // prerendered document hydrates unfiltered first (matching its markup) and
  // applies the URL's filters on the render after.
  const [hydratingPrerender] = useState(() => isPrerendered());
  const hasHydrated = useHasHydrated();
  const filtersLive = !hydratingPrerender || hasHydrated;
  const filterKey = filtersLive
    ? encodeMomentFilters(decodeMomentFilters(searchParams)).toString()
    : "";
  const filters = useMemo<MomentFilters>(
    () => decodeMomentFilters(new URLSearchParams(filterKey)),
    [filterKey]
  );
  const queryFilters = hasMomentFilters(filters) ? filters : undefined;

  // The page belongs to one set of filters: any change of filters, including
  // Back/Forward, starts at page 1 without first asking for the old page.
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 });
  const currentPage = pageState.key === filterKey ? pageState.page : 1;
  const setCurrentPage = useCallback(
    (page: number) => setPageState({ key: filterKey, page }),
    [filterKey]
  );

  const applyFilters = useCallback(
    (next: MomentFilters) => {
      setSearchParams(
        (current) => mergeMomentParams(current, encodeMomentFilters(next)),
        { replace: true }
      );
    },
    [setSearchParams]
  );

  // Feed tab state (For You / Trending / Explore)
  const [activeTab, setActiveTab] = useState<FeedTab>("forYou");
  const [promptDismissed, setPromptDismissed] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(() => !!filters.q);
  const [searchDraft, setSearchDraft] = useState(filters.q || "");
  useEffect(() => {
    setSearchDraft(filters.q || "");
  }, [filters.q]);

  // Fetch only the active tab's feed; other tabs are skipped (lazy).
  const forYouFeed = useGetMomentsQuery(
    { page: currentPage, limit, filters: queryFilters },
    { skip: activeTab !== "forYou" }
  );
  const trendingFeed = useGetTrendingMomentsQuery(
    { page: currentPage, limit, filters: queryFilters },
    { skip: activeTab !== "trending" }
  );
  const followingFeed = useGetMomentsQuery(
    { page: currentPage, limit, feed: "following", filters: queryFilters },
    { skip: activeTab !== "following" }
  );

  // Select the active tab's query result to drive the feed pipeline.
  const activeFeed =
    activeTab === "trending"
      ? trendingFeed
      : activeTab === "following"
      ? followingFeed
      : forYouFeed;
  const { data, isLoading, error, refetch } = activeFeed;

  const userId = useSelector(
    (state: RootState) => state.auth.userInfo?.user?._id
  );
  const userInfo = useSelector((state: RootState) => state.auth.userInfo);
  const { t } = useTranslation();
  const reelsOn = useWebFlag("webReelsEnabled");
  const navigate = useNavigate();

  // Feed tabs: labels are localized with English fallbacks; Following only
  // shows for signed-in users (the backend serves it only for them anyway).
  const feedTabs = useMemo(() => {
    const tabs: { key: FeedTab; label: string; Icon: typeof Sparkles }[] = [
      {
        key: "forYou",
        label: t("moments_section.tabs.forYou") || "For You",
        Icon: Sparkles,
      },
    ];
    if (userInfo?.user) {
      tabs.push({
        key: "following",
        label: t("moments_section.tabs.following") || "Following",
        Icon: Users,
      });
    }
    tabs.push({
      key: "trending",
      label: t("moments_section.tabs.trending") || "Trending",
      Icon: TrendingUp,
    });
    return tabs;
  }, [t, userInfo]);

  // If the user logs out while viewing Following (or the tab otherwise
  // becomes unavailable), fall back to For You rather than querying a feed
  // the backend won't serve to an anonymous request.
  useEffect(() => {
    if (activeTab === "following" && !userInfo?.user) {
      setActiveTab("forYou");
      setCurrentPage(1);
    }
  }, [activeTab, userInfo, setCurrentPage]);

  // Prompt of the day (For You tab only). Degrades gracefully on 404/error.
  const promptLanguage = userInfo?.user?.language_to_learn || undefined;
  const { data: promptRaw, error: promptError } = useGetPromptOfDayQuery(
    { language: promptLanguage },
    { skip: activeTab !== "forYou" }
  );
  const promptOfDay = useMemo<PromptOfDay | null>(() => {
    if (!promptRaw) return null;
    // Tolerate both {..} and {data: {..}} shapes.
    const p = (promptRaw.data ?? promptRaw) as PromptOfDay;
    if (!p || !p.text) return null;
    return p;
  }, [promptRaw]);

  const showPrompt =
    activeTab === "forYou" && !promptDismissed && !promptError && !!promptOfDay;

  // Switch feed tabs, resetting pagination.
  const handleTabChange = useCallback((tab: FeedTab) => {
    setActiveTab(tab);
    setCurrentPage(1);
  }, [setCurrentPage]);

  // Navigate to create-moment prefilled from the prompt of the day.
  const handleAnswerPrompt = useCallback(() => {
    navigate("/add-moment", {
      state: {
        promptText: promptOfDay?.text,
        promptId: promptOfDay?.promptId,
        promptLanguage: promptOfDay?.language,
        promptEmoji: promptOfDay?.emoji,
      },
    });
  }, [navigate, promptOfDay]);

  // The page as served: the server has already filtered and paged it.
  const { moments, pagination } = useMemo(() => {
    if (!data) return { moments: [] as MomentType[], pagination: null };
    if (Array.isArray(data)) return { moments: data as MomentType[], pagination: null };
    const response = data as MomentsResponse;
    return { moments: response.moments || [], pagination: response.pagination || null };
  }, [data]);

  const totalPages = pagination ? pagination.totalPages || 1 : 1;
  const filtersActive = hasMomentFilters(filters);

  const isVip = isVipUser(userInfo?.user);

  // Header search writes the same `q` filter the filter panel does.
  const submitSearch = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      const q = searchDraft.trim();
      const next: MomentFilters = { ...filters, q: q || undefined };
      if (!q) delete next.q;
      applyFilters(next);
    },
    [searchDraft, filters, applyFilters]
  );

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    if (filters.q) {
      const next: MomentFilters = { ...filters };
      delete next.q;
      applyFilters(next);
    }
  }, [filters, applyFilters]);

  // Callback for adding a new moment
  const handleAddMoment = useCallback(() => {
    navigate("/add-moment");
  }, [navigate]);

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [setCurrentPage]);

  // Reset to page 1 when refetching
  const handleRefetch = useCallback(() => {
    setCurrentPage(1);
    refetch();
  }, [refetch, setCurrentPage]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
      <div className="mx-auto max-w-2xl px-2 sm:px-4 py-3 sm:py-6 lg:px-6">
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white/60 backdrop-blur-xl border border-white/30 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>

          <div className="relative">
            {/* Header: title, VIP badge, search (the app's Moments app bar) */}
            <div className="flex items-center gap-3 px-3 sm:px-4 lg:px-6 pt-3 sm:pt-4 pb-2">
              {searchOpen ? (
                <form role="search" onSubmit={submitSearch} className="flex-1">
                  <input
                    type="search"
                    autoFocus
                    value={searchDraft}
                    maxLength={100}
                    onChange={(e) => setSearchDraft(e.target.value)}
                    placeholder={t("moments_section.filters.searchPlaceholder") || "Search moments"}
                    aria-label={t("moments_section.filters.searchPlaceholder") || "Search moments"}
                    className="w-full rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-800 focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-400/30"
                  />
                </form>
              ) : (
                <div className="flex flex-1 items-center gap-2 min-w-0">
                  <h1 className="text-2xl font-bold text-gray-900 truncate">
                    {t("moments") || "Moments"}
                  </h1>
                  {userInfo?.user &&
                    (isVip ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-amber-400 to-yellow-400 px-2 py-0.5 text-xs font-bold text-white shadow-sm">
                        <Crown className="h-3.5 w-3.5" aria-hidden="true" />
                        VIP
                      </span>
                    ) : (
                      <Link
                        to="/settings/vip"
                        className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                      >
                        <Crown className="h-3.5 w-3.5" aria-hidden="true" />
                        {t("moments_section.goVip") || "Go VIP"}
                      </Link>
                    ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => (searchOpen ? closeSearch() : setSearchOpen(true))}
                aria-label={searchOpen ? t("close") || "Close" : t("moments_section.filters.searchPlaceholder") || "Search moments"}
                className="flex h-10 w-10 items-center justify-center rounded-full text-gray-800 hover:bg-gray-100"
              >
                {searchOpen ? <X className="h-5 w-5" /> : <Search className="h-6 w-6" />}
              </button>
            </div>

            {/* Stories ring strip */}
            <div className="bg-gray-50/80 px-3 sm:px-4 lg:px-6 py-3">
              <StoriesFeed />
            </div>

            {/* Feed tabs: For You / Reels / Following / Trending + filter */}
            <div className="flex items-center border-b border-gray-200 px-1 sm:px-3 lg:px-5">
              <div role="tablist" aria-label="Feed" className="flex flex-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                {feedTabs.map(({ key, label }, index) => {
                  const isActive = activeTab === key;
                  return (
                    <React.Fragment key={key}>
                      <button
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => handleTabChange(key)}
                        className={`relative whitespace-nowrap px-3 sm:px-4 py-3 text-base transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/50 ${
                          isActive ? "font-bold text-gray-900" : "font-medium text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        {label}
                        {isActive && <span className="absolute inset-x-1 bottom-0 h-[3px] rounded-full bg-teal-500" />}
                      </button>
                      {/* Reels sits second, as in the app; it is its own page. */}
                      {index === 0 && reelsOn && userInfo?.user && (
                        <Link
                          to="/reels"
                          data-testid="moments-reels-link"
                          className="whitespace-nowrap px-3 sm:px-4 py-3 text-base font-medium text-gray-600 hover:text-gray-900"
                        >
                          {t("moments_section.tabs.reels") || "Reels"}
                        </Link>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setFiltersOpen((v) => !v)}
                aria-expanded={filtersOpen}
                aria-label={t("moments_section.filters.button") || "Filters"}
                className={`relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full hover:bg-gray-100 ${
                  filtersActive ? "text-teal-600" : "text-gray-800"
                }`}
              >
                <SlidersHorizontal className="h-5 w-5" />
                {filtersActive && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-teal-500" />}
              </button>
            </div>

            <div className="px-3 sm:px-4 lg:px-6 pt-3">
              {/* Prompt of the Day (For You tab only) */}
              {showPrompt && promptOfDay && (
                <div className="mb-4 relative overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-teal-50/80 to-indigo-50/60 dark:from-teal-900/30 dark:to-indigo-900/20 backdrop-blur-xl border border-teal-200/40 dark:border-teal-700/40 shadow-lg">
                  <div className="relative p-4 sm:p-5">
                    <button
                      onClick={() => setPromptDismissed(true)}
                      aria-label={t("moments_section.prompt.dismissCard") || "Dismiss prompt of the day"}
                      className="absolute top-2 right-2 p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-white/60 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <div className="flex items-start gap-3 pr-6">
                      <div className="text-2xl sm:text-3xl leading-none">
                        {promptOfDay.emoji || "✨"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-600 dark:text-teal-400">
                          {t("moments_section.prompt.cardTitle") || "Prompt of the day"}
                        </p>
                        <p className="mt-0.5 text-sm sm:text-base font-medium text-gray-800 dark:text-gray-100">
                          {promptOfDay.text}
                        </p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {t("moments_section.prompt.cardSubtitle") || "Practice writing"}
                        </p>
                        <button
                          onClick={handleAnswerPrompt}
                          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-teal-500 to-indigo-500 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:from-teal-600 hover:to-indigo-600 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-teal-400/50"
                        >
                          <PenLine className="h-4 w-4" />
                          <span>{t("moments_section.prompt.answer") || "Answer"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Filter panel, opened from the tab row's sliders icon */}
              <MomentFiltersBar filters={filters} onChange={applyFilters} open={filtersOpen} hideToggle />
            </div>

            {/* Content states */}
            {isLoading ? (
              <LoadingState t={t} />
            ) : error ? (
              <ErrorState t={t} refetch={handleRefetch} />
            ) : moments.length > 0 ? (
              <>
                <div className="space-y-3 sm:space-y-4 px-2 sm:px-4 pb-4 sm:pb-6 lg:px-6">
                  {moments.map((moment, index) => (
                    <React.Fragment key={moment._id}>
                      <div
                        className="group transform transition-all duration-500 hover:-translate-y-1 hover:shadow-xl"
                        style={{
                          animationDelay: `${index * 0.1}s`,
                        }}
                      >
                        <div className="overflow-hidden rounded-xl sm:rounded-2xl bg-white/80 backdrop-blur-sm border border-white/30 shadow-lg transition-all duration-300 group-hover:bg-white/90 group-hover:shadow-2xl">
                          <SingleMoment
                            _id={moment._id}
                            title={moment.title}
                            description={moment.description}
                            likeCount={moment.likeCount}
                            commentCount={
                              moment.commentCount || moment.comments || []
                            }
                            user={moment.user}
                            likedUsers={moment.likedUsers}
                            imageUrls={moment.imageUrls}
                            createdAt={moment.createdAt}
                            refetch={refetch}
                            reactions={moment.reactions}
                            reactionCount={moment.reactionCount}
                            shareCount={moment.shareCount}
                            isSaved={moment.isSaved}
                            saveCount={moment.saveCount}
                            mediaType={moment.mediaType}
                            video={moment.video}
                            audio={moment.audio}
                            prompt={moment.prompt}
                            mood={moment.mood}
                            tags={moment.tags}
                            location={moment.location}
                            backgroundColor={moment.backgroundColor}
                            scheduledFor={moment.scheduledFor}
                            boosted={moment.boosted === true}
                          />
                        </div>
                      </div>
                      {/* Interleave a feed ad every 4 moments (parity with
                          Flutter _adEveryNPosts = 4), but never after the last
                          item. No-op until AdSense is configured. */}
                      {(index + 1) % 4 === 0 &&
                        index !== moments.length - 1 && (
                          <AdUnit slot={AD_SLOTS.feed} className="my-3" />
                        )}
                    </React.Fragment>
                  ))}
                </div>

                {/* Pagination component */}
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={handlePageChange}
                  hasNextPage={pagination ? Boolean(pagination.hasNextPage) : false}
                  hasPrevPage={currentPage > 1}
                  totalMoments={pagination ? pagination.totalMoments || 0 : moments.length}
                  isLoading={isLoading}
                />
              </>
            ) : filtersActive ? (
              <div className="text-center py-12 sm:py-16 px-4">
                <div className="max-w-md mx-auto">
                  <div className="w-16 h-16 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                    <FaFilter className="w-8 h-8 text-blue-500" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3">
                    {t("moments_section.filters.emptyTitle") ||
                      "No moments match these filters"}
                  </h3>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    {t("moments_section.filters.emptyBody") ||
                      "Try removing a filter or searching for something else."}
                  </p>
                  <button
                    onClick={() => applyFilters({})}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-400/50"
                  >
                    <FaTimes className="w-4 h-4" />
                    <span className="font-medium">
                      {t("moments_section.filters.clear") || "Clear filters"}
                    </span>
                  </button>
                </div>
              </div>
            ) : activeTab === "following" ? (
              <div
                className="text-center py-12 sm:py-16 px-4"
                data-testid="following-empty-state"
              >
                <div className="max-w-md mx-auto">
                  <div className="mx-auto mb-6 sm:mb-8 flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-gradient-to-r from-teal-500 to-indigo-500 shadow-lg">
                    <Users className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-3">
                    {t("moments_section.following.empty") ||
                      "Follow people to see their moments here"}
                  </h3>
                  <Link
                    to="/communities"
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-teal-500 to-indigo-500 px-6 py-3 text-sm sm:text-base font-semibold text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-105 focus:outline-none focus:ring-2 focus:ring-teal-400/50"
                  >
                    {t("moments_section.following.findPeople") ||
                      "Find people"}
                  </Link>
                </div>
              </div>
            ) : (
              <EmptyState t={t} handleAddMoment={handleAddMoment} />
            )}
          </div>
        </div>

        {/* Mobile floating action button */}
        {userId && <FloatingActionButton onClick={handleAddMoment} />}
      </div>
    </div>
  );
};

export default React.memo(MainMoments);
