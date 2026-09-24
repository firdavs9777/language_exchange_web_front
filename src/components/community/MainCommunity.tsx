import { Fragment, useState, useMemo, useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { Loader2, RefreshCw, Search, Sparkles } from "lucide-react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";

import {
  useGetCommunityMembersQuery,
  useGetRecommendationsQuery,
  useGetTopicsQuery,
} from "../../store/slices/communitySlice";
import { useGetProfileVisitorsQuery } from "../../store/slices/usersSlice";
import { RootState } from "../../store";
import { useDebounce } from "./utils";

import CommunitySubNav, { CommunityNavTab } from "./tandem/CommunitySubNav";
import HighlightedProfilesCarousel from "./tandem/HighlightedProfilesCarousel";
import VisitorsBanner from "./tandem/VisitorsBanner";
import MemberCard, { CommunityMemberCard } from "./MemberCard";
import CommunityFilterSheet from "./CommunityFilterSheet";
import ActiveFilterChips from "./ActiveFilterChips";
import QuickFilterChips from "./QuickFilterChips";
import WaveSheet from "./WaveSheet";
import PublicCommunities from "./PublicCommunities";
import AdUnit from "../ads/AdUnit";
import { AD_SLOTS } from "../ads/adsenseConfig";
import { CommunityFilters, buildCommunityQuery } from "./lib/buildCommunityQuery";
import * as filterStorage from "./lib/filterStorage";
import { DEFAULT_FILTERS } from "./lib/filterStorage";
import {
  CommunityUrlState,
  decodeCommunityState,
  encodeCommunityState,
  hasCommunityUrlState,
  mergeCommunityParams,
} from "./lib/communityUrlState";
import notify from "../../design/notify";
import "./tandem/tandem-community.scss";

const PAGE_LIMIT = 20;

/**
 * A member as the recommendation feed returns them: the card's own fields plus
 * the two the matching engine adds. `matchReasons` is a short list of English
 * reason strings ("Native Korean speaker", "Online now") computed server-side.
 */
interface RecommendedMember extends CommunityMemberCard {
  matchScore?: number;
  matchReasons?: string[];
}

/** Count how many discovery filters are active (drives the SubNav badge). */
const countActiveFilters = (f: CommunityFilters): number => {
  let n = 0;
  if (f.minAge !== undefined && f.minAge > (DEFAULT_FILTERS.minAge ?? 18)) n += 1;
  if (f.maxAge !== undefined && f.maxAge < (DEFAULT_FILTERS.maxAge ?? 100)) n += 1;
  if (f.gender) n += 1;
  if (f.nativeLanguage) n += 1;
  if (f.learningLanguage) n += 1;
  if (f.country) n += 1;
  if (f.languageLevel) n += 1;
  if (f.topics && f.topics.length) n += f.topics.length;
  if (f.topicsAtLeast) n += 1;
  if (f.onlineOnly) n += 1;
  if (f.newUsersOnly) n += 1;
  return n;
};

/**
 * The "For you" tab.
 *
 * One request, no filters, no paging: the matching engine already decided,
 * and every reason it had is printed under the card it belongs to, because a
 * recommendation nobody can see the reasoning for is indistinguishable from a
 * random list. When it comes back empty the answer is never "no one is here"
 * -- it is that we do not know enough about the member yet, so the empty state
 * sends them to their profile rather than to a dead end.
 */
const ForYouTab: React.FC<{
  members: RecommendedMember[];
  isFetching: boolean;
  onRefresh: () => void;
  onOpen: (user: CommunityMemberCard) => void;
  onWave: (user: CommunityMemberCard) => void;
  t: (key: string, options?: any) => string;
}> = ({ members, isFetching, onRefresh, onOpen, onWave, t }) => (
  <>
    <div className="flex items-center justify-between gap-3 py-2">
      <p className="text-sm text-gray-500 m-0">
        {t("communityMain.forYou.subtitle") ||
          "Partners picked for you from your languages, level and interests."}
      </p>
      <button
        type="button"
        data-testid="for-you-refresh"
        onClick={onRefresh}
        disabled={isFetching}
        className="inline-flex shrink-0 items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors disabled:opacity-60"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
        {t("communityMain.forYou.refresh") || "Refresh"}
      </button>
    </div>

    {isFetching && members.length === 0 ? (
      <div className="community-empty">
        <Loader2 className="animate-spin" />
        <p>{t("communityMain.search.loading") || "Loading members..."}</p>
      </div>
    ) : members.length === 0 ? (
      <div className="community-empty" data-testid="for-you-empty">
        <Sparkles className="community-empty__icon" aria-hidden />
        <h3>{t("communityMain.forYou.empty.title") || "No recommendations yet"}</h3>
        <p>
          {t("communityMain.forYou.empty.message") ||
            "Add the languages you speak and want to learn, your level and a few interests, and we'll find partners who match."}
        </p>
        <Link to="/profile/edit" className="community-empty__action">
          {t("communityMain.forYou.empty.action") || "Complete your profile"}
        </Link>
      </div>
    ) : (
      <div className="flex flex-col gap-3">
        {members.map((member) => {
          const reasons = (member.matchReasons || []).filter(Boolean);
          return (
            <div key={member._id} className="flex flex-col gap-1">
              <MemberCard user={member} onOpen={onOpen} onWave={onWave} />
              {reasons.length > 0 && (
                <p
                  data-testid="for-you-why"
                  className="text-xs text-gray-500 px-3 m-0"
                >
                  {t("communityMain.forYou.why", { reasons: reasons.join(" \u00b7 ") }) ||
                    `Why: ${reasons.join(" \u00b7 ")}`}
                </p>
              )}
            </div>
          );
        })}
      </div>
    )}
  </>
);

const ModernCommunity: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // The filters this browser remembered from last time. Read once, in a lazy
  // initializer guarded for the prerender — never during render, and never as
  // the source of truth. It is the fallback for a bare /communities; a URL
  // that carries state outranks it, so a shared link never silently picks up
  // the recipient's own saved filters.
  const [storedFilters] = useState<CommunityFilters>(() =>
    typeof window === "undefined" ? { ...DEFAULT_FILTERS } : filterStorage.load()
  );

  // THE state of the list, derived from the query string on every render
  // rather than mirrored into React state. That is what makes Back, Forward
  // and a pasted link work without a single extra line: the browser changes
  // the URL and this recomputes.
  const listState = useMemo<CommunityUrlState>(() => {
    const decoded = decodeCommunityState(searchParams);
    const fromUrl = hasCommunityUrlState(searchParams);
    return {
      filters: fromUrl
        ? { ...DEFAULT_FILTERS, ...(decoded.filters || {}) }
        : { ...storedFilters },
      search: decoded.search || "",
      sort: decoded.sort,
      tab: decoded.tab || "all",
    };
  }, [searchParams, storedFilters]);

  const filters = listState.filters;
  const sort = listState.sort;
  const search = listState.search;
  const activeTab: CommunityNavTab = listState.tab;
  const isForYou = activeTab === "foryou";

  /**
   * Online and New are the All list with one switch held down. The member
   * keeps every other filter; the tab's own condition is simply not theirs to
   * turn off while they are in it.
   *
   * The lock lives on the *query*, not on the stored filters, so leaving the
   * tab does not leave `online=1` behind in the URL or in localStorage — the
   * tab name in `?tab=` already says everything the link needs to say.
   */
  const effectiveFilters = useMemo<CommunityFilters>(() => {
    if (activeTab === "online") return { ...filters, onlineOnly: true };
    if (activeTab === "new") return { ...filters, newUsersOnly: true };
    return filters;
  }, [filters, activeTab]);

  const [draftFilters, setDraftFilters] = useState<CommunityFilters>(filters);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [waveTarget, setWaveTarget] = useState<CommunityMemberCard | null>(null);
  const [page, setPage] = useState(1);
  // Pages beyond the first are accumulated here so "Load more" keeps prior
  // results visible. Page 1 is derived directly from the RTK Query cache below
  // so returning from /community/:id shows the cached list on the first render
  // instead of flashing the empty state.
  const [extraPages, setExtraPages] = useState<CommunityMemberCard[]>([]);

  // The box updates the URL on every keystroke (so a link always matches what
  // is on screen); only the *query* waits for the typing to settle.
  const debouncedSearch = useDebounce(search, 300);

  /**
   * Write a list state into the query string, keeping any param this page does
   * not own (campaign tags, a stray `ref`). `replace` because a filter toggle
   * is a correction of where you are, not a place you went: Back should leave
   * the list, not walk you through twelve half-built filter combinations.
   */
  const writeUrl = useCallback(
    (next: CommunityUrlState) => {
      const merged = mergeCommunityParams(searchParams, encodeCommunityState(next));
      if (merged.toString() === searchParams.toString()) return;
      setSearchParams(merged, { replace: true });
    },
    [searchParams, setSearchParams]
  );

  /**
   * The single write path. Every control — the sheet, the quick chips, the
   * active-filter chips, the search box, the tabs — hands it a patch; it folds
   * that into the current state, puts the result in the URL and mirrors the
   * filters to localStorage so a later visit with no link still opens where
   * the member left off.
   */
  const applyState = useCallback(
    (patch: Partial<CommunityUrlState>) => {
      const next: CommunityUrlState = {
        filters,
        search,
        sort,
        tab: activeTab,
        ...patch,
      };
      if (patch.filters) filterStorage.save(patch.filters);
      writeUrl(next);
    },
    [filters, search, sort, activeTab, writeUrl]
  );

  // Two jobs, both idempotent: put the stored filters into the URL on a bare
  // /communities (so "Copy link" always has something to copy), and normalise
  // a hand-edited query into its canonical spelling. `writeUrl` compares the
  // encoded string first, so a URL that already says this does nothing.
  useEffect(() => {
    writeUrl({ filters, search, sort, tab: activeTab });
  }, [filters, search, sort, activeTab, writeUrl]);

  const userInfo = useSelector((state: RootState) => state.auth.userInfo);

  const currentUser = useMemo(
    () => ({
      _id: userInfo?.user?._id,
      name: userInfo?.user?.name,
      imageUrls: userInfo?.user?.imageUrls,
    }),
    [userInfo]
  );

  // `me` drives the default language-exchange match inside buildCommunityQuery
  // (and the quick chips' "Speaks / Learning" labels).
  const me = useMemo(
    () => ({
      native_language: userInfo?.user?.native_language,
      language_to_learn: userInfo?.user?.language_to_learn,
    }),
    [userInfo]
  );

  // Single source of truth for the server query — ALL filters map to real
  // params here (inverted-language semantics handled inside the mapper).
  const queryArg = useMemo(
    () =>
      buildCommunityQuery(
        { ...effectiveFilters, search: debouncedSearch || undefined, sort },
        me,
        page,
        PAGE_LIMIT
      ),
    [effectiveFilters, debouncedSearch, sort, me, page]
  );

  const {
    data: communityData,
    isLoading,
    isFetching,
    error: errorInfo,
    refetch,
  } = useGetCommunityMembersQuery(queryArg, { skip: isForYou });

  // "For you" asks a different server a different question: no filters, no
  // paging, one scored set. It is skipped entirely off the tab so the tab
  // costs nothing to anyone who never opens it.
  const {
    data: recommendationsData,
    isFetching: isRecommendationsFetching,
    refetch: refetchRecommendations,
  } = useGetRecommendationsQuery({ limit: PAGE_LIMIT }, { skip: !isForYou });

  const recommendations = useMemo<RecommendedMember[]>(() => {
    const raw = recommendationsData?.data;
    if (!Array.isArray(raw)) return [];
    return (raw as RecommendedMember[]).filter((m) =>
      currentUser._id ? m._id !== currentUser._id : true
    );
  }, [recommendationsData, currentUser._id]);

  const { data: topicsResult } = useGetTopicsQuery({});
  const topicLabels = useMemo<Record<string, string>>(() => {
    const raw = topicsResult?.data;
    if (!Array.isArray(raw)) return {};
    const map: Record<string, string> = {};
    for (const topic of raw) {
      const id = topic._id || topic.id || topic.name;
      if (id) map[id] = topic.name;
    }
    return map;
  }, [topicsResult]);

  const { data: visitorsData } = useGetProfileVisitorsQuery(
    { userId: currentUser._id || "", page: 1, limit: 8 },
    { skip: !currentUser._id }
  );

  // Persist scroll position continuously (throttled with rAF).
  useEffect(() => {
    let pending = false;
    const onScroll = () => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => {
        sessionStorage.setItem("communityScroll", String(window.scrollY));
        pending = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const hasRestoredScroll = useRef(false);

  // Append "Load more" pages. Page 1 is read off the cache in the useMemo below.
  useEffect(() => {
    if (!communityData?.data || page === 1) return;
    setExtraPages((prev) => {
      const existingIds = new Set(prev.map((m) => m._id));
      const newOnes = (communityData.data as CommunityMemberCard[]).filter(
        (m) => !existingIds.has(m._id)
      );
      return [...prev, ...newOnes];
    });
  }, [communityData, page]);

  // Reset pagination whenever the URL state that feeds the query changes
  // (filters / search / sort / tab) -- including a change that arrived via
  // Back. Skip the first run so a fresh mount (back-nav from /community/:id)
  // doesn't clobber restored state. Keyed on the *value*, not the object
  // identity, which changes on every query-string edit.
  const filterKey = useMemo(
    () => JSON.stringify({ effectiveFilters, debouncedSearch, sort, activeTab }),
    [effectiveFilters, debouncedSearch, sort, activeTab]
  );
  const skipFilterReset = useRef(true);
  useEffect(() => {
    if (skipFilterReset.current) {
      skipFilterReset.current = false;
      return;
    }
    setPage(1);
    setExtraPages([]);
  }, [filterKey]);

  // Derived union of the first page (cache) + accumulated extra pages, with a
  // stable VIP-first then online-first tiebreak. `Array.prototype.sort` is
  // stable, so equal-rank members keep server order.
  const allMembers = useMemo<CommunityMemberCard[]>(() => {
    const firstPage = (communityData?.data as CommunityMemberCard[]) || [];
    const merged: CommunityMemberCard[] = [...firstPage];
    if (extraPages.length) {
      const seen = new Set(firstPage.map((m) => m._id));
      for (const m of extraPages) {
        if (!seen.has(m._id)) {
          seen.add(m._id);
          merged.push(m);
        }
      }
    }
    const list = merged.filter((m) => (currentUser._id ? m._id !== currentUser._id : true));
    return list.sort((a, b) => {
      const av = a.isVIP ? 1 : 0;
      const bv = b.isVIP ? 1 : 0;
      if (av !== bv) return bv - av;
      const ao = a.isOnline ? 1 : 0;
      const bo = b.isOnline ? 1 : 0;
      return bo - ao;
    });
  }, [communityData, extraPages, currentUser._id]);

  // Restore scroll exactly once, the first time the grid has rows.
  useLayoutEffect(() => {
    if (hasRestoredScroll.current) return;
    if (allMembers.length === 0) return;
    const saved = sessionStorage.getItem("communityScroll");
    if (!saved) {
      hasRestoredScroll.current = true;
      return;
    }
    const y = parseInt(saved, 10);
    if (!Number.isNaN(y) && y > 0) {
      window.scrollTo({ top: y, left: 0, behavior: "instant" as ScrollBehavior });
    }
    hasRestoredScroll.current = true;
  }, [allMembers.length]);

  const highlightedProfiles = useMemo(() => {
    const pros = allMembers.filter((m) => m.isVIP);
    const fillers = allMembers.filter((m) => !m.isVIP);
    return [...pros, ...fillers].slice(0, 12);
  }, [allMembers]);

  const visitorsList = useMemo(() => {
    const raw = (visitorsData?.data ?? visitorsData?.visitors ?? []) as any[];
    return raw.map((v) => ({
      _id: v._id || v.userId || v.id,
      name: v.name || v.visitorName,
      imageUrls: v.imageUrls || (v.image ? [v.image] : undefined),
      photo: v.photo,
    }));
  }, [visitorsData]);

  const visitorsTotal = useMemo(() => {
    return (
      visitorsData?.totalCount ??
      visitorsData?.total ??
      visitorsList.length ??
      0
    );
  }, [visitorsData, visitorsList]);

  const hasMore = communityData?.data?.length === PAGE_LIMIT;

  const handleLoadMore = useCallback(() => {
    if (!isFetching && hasMore) setPage((p) => p + 1);
  }, [isFetching, hasMore]);

  const openFilterSheet = useCallback(() => {
    // The sheet opens on what is actually applied -- the tab's lock included,
    // so the Online tab does not show an "Online now" switch sitting off while
    // the list beneath it is online-only.
    setDraftFilters(effectiveFilters);
    setIsFilterSheetOpen(true);
  }, [effectiveFilters]);

  const applyFilters = useCallback(
    (next: CommunityFilters) => {
      applyState({ filters: next });
      setIsFilterSheetOpen(false);
    },
    [applyState]
  );

  // Reset ALL discovery filters back to defaults (used by the sheet's
  // "Clear all" and the ActiveFilterChips "Clear"). Persisted immediately.
  const clearAllFilters = useCallback(() => {
    const next = { ...DEFAULT_FILTERS };
    setDraftFilters(next);
    applyState({ filters: next });
  }, [applyState]);

  // Remove a single active filter chip (or one topic within `topics[]`) --
  // the same write path as everything else, so the chip disappears from the
  // URL and not only from the screen.
  const removeFilter = useCallback(
    (key: keyof CommunityFilters, topicValue?: string) => {
      const next: CommunityFilters = { ...filters };
      if (key === "topics" && topicValue) {
        const remaining = (filters.topics || []).filter((topic) => topic !== topicValue);
        if (remaining.length) next.topics = remaining;
        else delete next.topics;
      } else if (key === "minAge") {
        next.minAge = DEFAULT_FILTERS.minAge;
      } else if (key === "maxAge") {
        next.maxAge = DEFAULT_FILTERS.maxAge;
      } else {
        delete next[key];
      }
      if (key === "search") applyState({ filters: next, search: "" });
      else applyState({ filters: next });
    },
    [filters, applyState]
  );

  // Quick chips replace the filter object wholesale.
  const handleQuickChange = useCallback(
    (next: CommunityFilters) => {
      applyState({ filters: next });
    },
    [applyState]
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      applyState({ search: value });
    },
    [applyState]
  );

  const handleSortChange = useCallback(
    (next?: "recently_active") => {
      applyState({ sort: next });
    },
    [applyState]
  );

  const handleTabChange = useCallback(
    (tab: CommunityNavTab) => {
      applyState({ tab });
    },
    [applyState]
  );

  /**
   * Is the sheet's draft the list you are looking at?
   *
   * Compared as the canonical param string rather than by object identity, so
   * key order and an `undefined` written over a missing key do not read as a
   * change. Compared against the *effective* filters, because the tab's own
   * lock is part of what is applied — otherwise the Online tab would refuse to
   * offer a link to a list nobody had edited.
   */
  const draftMatchesApplied = useMemo(
    () =>
      encodeCommunityState({ filters: draftFilters, search, sort, tab: activeTab }).toString() ===
      encodeCommunityState({ filters: effectiveFilters, search, sort, tab: activeTab }).toString(),
    [draftFilters, effectiveFilters, search, sort, activeTab]
  );

  /**
   * Hand the member a link to exactly what they are looking at: the APPLIED
   * state, never the sheet's unapplied draft. A link that opens a different
   * list than the one on screen is worse than no link, and the recipient has
   * no way to know it happened -- so while the draft differs, the sheet's
   * button is disabled and says to apply first (`draftMatchesApplied`).
   *
   * Every browser global here is read inside the handler, never during render.
   */
  const handleCopyLink = useCallback(() => {
    const params = mergeCommunityParams(
      searchParams,
      encodeCommunityState({ filters, search, sort, tab: activeTab })
    );
    const query = params.toString();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}${location.pathname}${query ? `?${query}` : ""}`;
    const clipboard: any =
      typeof navigator !== "undefined" ? (navigator as any).clipboard : undefined;
    const failed = () =>
      notify.error(t("communityMain.filterSheet.linkCopyFailed") || "Couldn't copy the link");

    if (!clipboard || typeof clipboard.writeText !== "function") {
      failed();
      return;
    }
    Promise.resolve(clipboard.writeText(url)).then(
      () => notify.success(t("communityMain.filterSheet.linkCopied") || "Link copied"),
      failed
    );
  }, [searchParams, filters, search, sort, activeTab, location.pathname, t]);

  const handleOpenMember = useCallback(
    (user: CommunityMemberCard) => {
      navigate(`/community/${user._id}`);
    },
    [navigate]
  );

  // Opens the WaveSheet for the tapped member; the sheet owns the actual
  // send call (useSendWaveMutation) + mutual/already-waved handling.
  const handleWaveMember = useCallback((user: CommunityMemberCard) => {
    setWaveTarget(user);
  }, []);

  const handleResetAll = useCallback(() => {
    const next = { ...DEFAULT_FILTERS };
    setDraftFilters(next);
    applyState({ filters: next, search: "", sort: undefined, tab: "all" });
  }, [applyState]);

  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);

  if (errorInfo) {
    return (
      <div className="community-page">
        <div className="community-page__container">
          <div className="community-empty">
            <h3>{t("communityMain.errors.generic") || "Something went wrong"}</h3>
            <p>{t("communityMain.errors.loadError") || "We couldn't load the community."}</p>
            <button type="button" onClick={() => refetch()} className="community-empty__action">
              {t("communityMain.errors.tryAgain") || "Try again"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="community-page">
      <CommunitySubNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        searchValue={search}
        onSearchChange={handleSearchChange}
        onOpenFilters={openFilterSheet}
        hasActiveFilters={activeFilterCount > 0}
        activeFilterCount={activeFilterCount}
        showFilterButton={!isForYou}
      />

      <CommunityFilterSheet
        open={isFilterSheetOpen}
        value={draftFilters}
        onChange={setDraftFilters}
        onApply={applyFilters}
        onClear={clearAllFilters}
        onCopyLink={handleCopyLink}
        canCopyLink={draftMatchesApplied}
        onClose={() => setIsFilterSheetOpen(false)}
      />

      <WaveSheet
        open={!!waveTarget}
        targetUser={waveTarget}
        onClose={() => setWaveTarget(null)}
      />

      <div className="community-page__container">
        {/* No filter or sort control on "For you": the tab is the server's
            answer to who you should meet, and a control that cannot change the
            answer is worse than no control. */}
        {!isForYou && (
          <>
            <QuickFilterChips
              filters={effectiveFilters}
              sort={sort}
              me={me}
              onChange={handleQuickChange}
              onSortChange={handleSortChange}
            />

            {/* The chips show what the *member* chose, not the tab's own lock:
                a chip you cannot dismiss is a dead control. */}
            <ActiveFilterChips
              value={filters}
              onRemove={removeFilter}
              onClear={clearAllFilters}
              topicLabels={topicLabels}
            />
          </>
        )}

        {/* The carousel and the visitors banner are the front page of the
            community, not furniture that follows you into every tab: on
            Online, New and For you the list is the whole point. */}
        {activeTab === "all" && highlightedProfiles.length > 0 && (
          <HighlightedProfilesCarousel
            profiles={highlightedProfiles as any}
            currentUser={currentUser}
          />
        )}

        {activeTab === "all" && visitorsTotal > 0 && (
          <VisitorsBanner visitors={visitorsList} totalCount={visitorsTotal} />
        )}

        {isForYou ? (
          <ForYouTab
            members={recommendations}
            isFetching={isRecommendationsFetching}
            onRefresh={refetchRecommendations}
            onOpen={handleOpenMember}
            onWave={handleWaveMember}
            t={t}
          />
        ) : isLoading ? (
          <div className="community-empty">
            <Loader2 className="animate-spin" />
            <p>{t("communityMain.search.loading") || "Loading members..."}</p>
          </div>
        ) : allMembers.length === 0 ? (
          <div className="community-empty">
            <Search className="community-empty__icon" aria-hidden />
            <h3>{t("communityMain.results.noneFound.title") || "No members found"}</h3>
            <p>{t("communityMain.results.noneFound.message") || "Try widening your search or clearing filters."}</p>
            <button type="button" onClick={handleResetAll} className="community-empty__action">
              {t("communityMain.results.noneFound.resetFilters") || "Reset filters"}
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {allMembers.map((member, index) => (
                <Fragment key={member._id}>
                  <MemberCard
                    user={member}
                    onOpen={handleOpenMember}
                    onWave={handleWaveMember}
                  />
                  {/* Interleave a community ad every 6 members, but never after
                      the last item. No-op until AdSense is configured. */}
                  {(index + 1) % 6 === 0 &&
                    index !== allMembers.length - 1 && (
                      <AdUnit slot={AD_SLOTS.community} className="my-3" />
                    )}
                </Fragment>
              ))}
            </div>
            {hasMore && (
              <div className="community-loadmore">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={isFetching}
                >
                  {isFetching
                    ? t("communityMain.loadMore.loading") || "Loading..."
                    : t("communityMain.loadMore.button") || "Load more"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

/**
 * /communities has two audiences now.
 *
 * A signed-in member gets the discovery page below. A logged-out visitor --
 * and every crawler, and the prerender, which builds its store in Node with no
 * localStorage -- gets the public page instead of the redirect to /login this
 * route used to answer with: the page is indexed (src/seo/pages.ts), so the
 * logged-out branch IS the crawlable page.
 *
 * The split is a wrapper rather than an early return inside ModernCommunity so
 * that none of its authenticated queries (members, topics, visitors) and none
 * of its localStorage reads happen for someone who is not signed in.
 */
// A signed-in visitor arriving on the prerendered page sees PublicCommunities
// for exactly one commit: auth is restored after hydration (hydrationAuth.ts)
// so the first client render matches the server HTML, then this flips. The
// one public-communities request that commit starts is cheap and cached.
const MainCommunity: React.FC = () => {
  const userInfo = useSelector((state: RootState) => state.auth.userInfo);
  if (!userInfo) return <PublicCommunities />;
  return <ModernCommunity />;
};

export default MainCommunity;
