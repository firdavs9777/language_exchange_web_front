import { Fragment, Suspense, lazy, useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Loader2, RefreshCw, Search, Sparkles } from "lucide-react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";

import {
  useGetCommunityMembersQuery,
  useGetRecommendationsQuery,
  useGetDailyMatchesQuery,
  useGetTopicsQuery,
  useGetWavesQuery,
} from "../../store/slices/communitySlice";
import { useGetProfileVisitorsQuery, useGetUserProfileQuery } from "../../store/slices/usersSlice";
import { RootState } from "../../store";
import { useDebounce } from "./utils";

import CommunitySubNav, { CommunityNavTab } from "./tandem/CommunitySubNav";
import AppOnlyTab from "./AppOnlyTab";
import TodayTab from "./today/TodayTab";
import { DailyMatch } from "./today/types";
import { photoUrl } from "./today/dailyMatchView";
import HighlightedProfilesCarousel from "./tandem/HighlightedProfilesCarousel";
import MemberCard, { CommunityMemberCard } from "./MemberCard";
import ActiveFilterChips from "./ActiveFilterChips";
import QuickFilterChips from "./QuickFilterChips";
import RequireSignIn from "../gatherings/RequireSignIn";
import BoostEntryRow from "../boost/BoostEntryRow";
import AdUnit from "../ads/AdUnit";
import { AD_SLOTS } from "../ads/adsenseConfig";
import {
  CommunityFilters,
  buildCommunityQuery,
  withoutVipOnlyFilters,
} from "./lib/buildCommunityQuery";
import { usePagedList, listCacheKey } from "./lib/usePagedList";
import { useIsVip } from "../vip/useIsVip";
import { useWebAppConfig } from "../../utils/useWebAppConfig";
import { isMutualExchange } from "./lib/presence";
import { VIP_PATH } from "../vip/vipStatus";
import * as filterStorage from "./lib/filterStorage";
import { DEFAULT_FILTERS } from "./lib/filterStorage";
import { showsAdAfter } from "./lib/gridInterleave";
import { reasonChips, MatchReasonCode } from "./lib/matchReasonChips";
import {
  CommunityUrlState,
  decodeCommunityState,
  encodeCommunityState,
  mergeCommunityParams,
} from "./lib/communityUrlState";
import notify from "../../design/notify";
import "./tandem/tandem-community.scss";

// Both sheets are closed on first paint: load their code (the filter sheet
// carries the country and language tables) only when one opens.
const CommunityFilterSheet = lazy(() => import("./CommunityFilterSheet"));
const WaveSheet = lazy(() => import("./WaveSheet"));

const PAGE_LIMIT = 20;

/**
 * How long the search box waits before it rewrites the URL.
 *
 * The box itself is never delayed -- it echoes locally on the keystroke. What
 * waits is `setSearchParams`, because that is a router update that re-derives
 * the whole list state and, before the cards were memoized, re-rendered every
 * visible row once per character.
 */
const SEARCH_URL_DEBOUNCE_MS = 250;

/**
 * Rows the browser is allowed to skip.
 *
 * `content-visibility: auto` lets it leave everything outside the viewport
 * unstyled, unlaid-out and unpainted; `contain-intrinsic-size` is the height
 * it should assume for a row it has not measured yet, so the scrollbar is
 * honest from the first paint. The class also carries the padding/negative
 * margin pair that gives the card's shadow and its 2px hover lift room inside
 * the containment box -- paint containment clips to the slot.
 */
const CARD_SLOT = "community-card-slot";

/** Nothing appended yet. A module-level constant so the memos below see a
 *  stable identity rather than a fresh `[]` on every render. */

/** How many skeleton cells stand in for the first page while it loads. */
const SKELETON_ROWS = 6;

/** A card-shaped placeholder: same silhouette as a card, so nothing jumps. */
const CardSkeleton: React.FC = () => (
  <div className="community-card-skeleton" aria-hidden>
    <div className="community-card-skeleton__photo" />
    <div className="community-card-skeleton__lines">
      <span className="community-card-skeleton__line community-card-skeleton__line--name" />
      <span className="community-card-skeleton__line community-card-skeleton__line--meta" />
      <span className="community-card-skeleton__line community-card-skeleton__line--bio" />
    </div>
    <div className="community-card-skeleton__foot" />
  </div>
);

/**
 * A member as the recommendation feed returns them: the card's own fields plus
 * the two the matching engine adds. `matchReasons` is a short list of English
 * reason strings ("Native Korean speaker", "Online now") computed server-side.
 */
interface RecommendedMember extends CommunityMemberCard {
  matchScore?: number;
  matchReasons?: string[];
  /** Same reasons as codes, for the reader's language (absent on older/cached responses). */
  matchReasonCodes?: MatchReasonCode[];
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
  if (f.reciprocal) n += 1;
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
      <div className="community-grid">
        {members.map((member) => (
          <div key={member._id} className={CARD_SLOT}>
            <MemberCard
              user={member}
              reasons={reasonChips(member.matchReasonCodes, member.matchReasons, t)}
              onOpen={onOpen}
              onWave={onWave}
            />
          </div>
        ))}
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
  // Kept in step with every save below: the URL falls back to this whenever
  // it names no filters, so a stale copy would put back a filter the member
  // had just cleared.
  const [storedFilters, setStoredFilters] = useState<CommunityFilters>(() =>
    typeof window === "undefined" ? { ...DEFAULT_FILTERS } : filterStorage.load()
  );

  // THE state of the list, derived from the query string on every render
  // rather than mirrored into React state. That is what makes Back, Forward
  // and a pasted link work without a single extra line: the browser changes
  // the URL and this recomputes.
  const listState = useMemo<CommunityUrlState>(() => {
    const decoded = decodeCommunityState(searchParams);
    // Today is the default landing, so it is the tab a bare URL means -- but
    // only a BARE one. Every filtered or searched All link shared before
    // Today existed has no `tab` (`all` used to be left out), and reading it
    // as Today would open a tab that ignores filters and then strip them from
    // the address bar.
    const carriesList =
      decoded.filters !== undefined ||
      decoded.search !== undefined ||
      decoded.sort !== undefined;
    const tab: CommunityNavTab = decoded.tab || (carriesList ? "all" : "today");
    // "For you" and "Today" deliberately write no filter params (they describe
    // nothing those tabs use), so there an absent set of filters means
    // "unknown", not "none" -- the stored ones stand in so that walking to All
    // gets the member's own list back rather than a cleared one.
    const serverPickedWithoutFilters =
      (tab === "foryou" || tab === "today") && decoded.filters === undefined;
    return {
      filters:
        // The member's saved filters stand in whenever the URL says nothing
        // about the list. A tab alone is not an opinion about filters: with
        // Today as the default, All is reached as ?tab=all, and treating that
        // as "a shared link with state" would drop the member's own filters.
        carriesList && !serverPickedWithoutFilters
          ? { ...DEFAULT_FILTERS, ...(decoded.filters || {}) }
          : { ...storedFilters },
      search: decoded.search || "",
      sort: decoded.sort,
      tab,
    };
  }, [searchParams, storedFilters]);

  const filters = listState.filters;
  const isVip = useIsVip();
  // Country is VIP-only (GET /users ignores it for free callers): for a free
  // member it is not sent, not shown as a chip and not counted. The URL and
  // the stored filters keep it, so it applies again after an upgrade.
  const visibleFilters = useMemo(
    () => withoutVipOnlyFilters(filters, isVip),
    [filters, isVip]
  );
  const sort = listState.sort;
  const search = listState.search;
  const userInfo = useSelector((state: RootState) => state.auth.userInfo);
  const signedIn = Boolean(userInfo && (userInfo as any).user && (userInfo as any).user._id);
  // What the URL says. The canonical-URL effect writes THIS, so a fallback
  // below never rewrites the address bar.
  const urlTab: CommunityNavTab = listState.tab;
  const {
    data: dailyData,
    isLoading: dailyLoading,
    error: dailyError,
    refetch: refetchDaily,
  } = useGetDailyMatchesQuery(undefined, { skip: !signedIn });
  // 404 = DAILY_MATCHES_ENABLED is off: the feature is not here, not an error.
  const todayOff = !signedIn || (dailyError as any)?.status === 404;
  // Display-only fallback: the URL keeps saying today; the page shows All.
  const activeTab: CommunityNavTab = urlTab === "today" && todayOff ? "all" : urlTab;
  const isForYou = activeTab === "foryou";
  const isToday = activeTab === "today";
  // Gatherings and Rooms live in the app for now; the tabs say so.
  const isAppOnly = activeTab === "gatherings" || activeTab === "rooms";

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
    if (activeTab === "online") return { ...visibleFilters, onlineOnly: true };
    if (activeTab === "new") return { ...visibleFilters, newUsersOnly: true };
    if (activeTab === "serious") return { ...visibleFilters, activeWithin: "7d" };
    return visibleFilters;
  }, [visibleFilters, activeTab]);

  const [draftFilters, setDraftFilters] = useState<CommunityFilters>(filters);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [waveTarget, setWaveTarget] = useState<CommunityMemberCard | null>(null);
  // People the viewer has waved at during this visit. Today's batch is cached
  // server-side for the whole day and does not drop them, so the card itself
  // has to stop offering a second wave (which would only hit ALREADY_WAVED).
  const [wavedIds, setWavedIds] = useState<string[]>([]);
  const handleWaved = useCallback((targetUserId: string) => {
    setWavedIds((prev) => (prev.indexOf(targetUserId) > -1 ? prev : prev.concat([targetUserId])));
  }, []);
  /**
   * What the search box shows, right now.
   *
   * The URL is still the source of truth -- this is its echo, so that typing
   * is never one router update per character. It follows `search` whenever the
   * URL changes from somewhere else (Back, a dismissed chip, "Reset filters"),
   * and leads it for the few hundred milliseconds between a keystroke and the
   * debounced write.
   */
  const [searchDraft, setSearchDraft] = useState<string>(search);
  const pendingSearch = useRef<string | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Only adopt the URL's value when we are not mid-word ourselves.
    if (pendingSearch.current !== null) return;
    setSearchDraft(search);
  }, [search]);

  useEffect(
    () => () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    },
    []
  );

  // The query is keyed on the box, not on the URL, so the request still fires
  // one debounce after the typing stops rather than after two of them.
  const debouncedSearch = useDebounce(searchDraft, 300);

  /**
   * Write a list state into the query string, keeping any param this page does
   * not own (campaign tags, a stray `ref`). `replace` because a filter toggle
   * is a correction of where you are, not a place you went: Back should leave
   * the list, not walk you through twelve half-built filter combinations.
   */
  const writeUrl = useCallback(
    (next: CommunityUrlState) => {
      // "For you" is the server's answer, not a query: it ignores every
      // filter, so writing them into the link would hand the recipient a set
      // of params that describe nothing they are looking at. The member's own
      // filters are still in localStorage and come back the moment they
      // return to a tab that uses them.
      const forUrl: CommunityUrlState =
        next.tab === "foryou" || next.tab === "today" ? { ...next, filters: {} } : next;
      const merged = mergeCommunityParams(searchParams, encodeCommunityState(forUrl));
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
      if (patch.filters) {
        filterStorage.save(patch.filters);
        setStoredFilters(patch.filters);
      }
      // Somebody other than the search box just decided what `search` is (a
      // dismissed chip, "Reset filters"). Drop the pending keystroke write so
      // it cannot land afterwards and undo them.
      if (patch.search !== undefined) {
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = null;
        pendingSearch.current = null;
      }
      writeUrl(next);
    },
    [filters, search, sort, activeTab, writeUrl]
  );

  // The debounced URL write fires long after the render that scheduled it, so
  // it must not close over that render's `applyState` -- a filter change in
  // between would be overwritten with the state as it was when the member
  // last pressed a key.
  // A Partners chip (Same city / Women / Men / Topic) changes the applied
  // filters directly -- the same fields the sheet writes.
  const handleFiltersPatch = useCallback(
    (patch: Partial<CommunityFilters>) => {
      const next: CommunityFilters = { ...filters, ...patch };
      (Object.keys(patch) as (keyof CommunityFilters)[]).forEach((k) => {
        if (patch[k] === undefined) delete next[k];
      });
      applyState({ filters: next });
    },
    [filters, applyState]
  );

  const applyStateRef = useRef(applyState);
  useEffect(() => {
    applyStateRef.current = applyState;
  }, [applyState]);

  // Two jobs, both idempotent: put the stored filters into the URL on a bare
  // /communities (so "Copy link" always has something to copy), and normalise
  // a hand-edited query into its canonical spelling. `writeUrl` compares the
  // encoded string first, so a URL that already says this does nothing.
  useEffect(() => {
    writeUrl({ filters, search, sort, tab: urlTab });
  }, [filters, search, sort, urlTab, writeUrl]);


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
  // The account as it is NOW (/auth/me), falling back to the login snapshot
  // until that arrives. The snapshot is written once at login and kept in
  // localStorage, so languages changed in the app since then were invisible
  // here and the list kept matching the old ones. The member query is keyed
  // on the built params, so a /auth/me that agrees with the snapshot costs no
  // second request.
  const { data: meData } = useGetUserProfileQuery({}, { skip: !userInfo?.user });
  const current: any = (meData as any)?.data || (meData as any)?.user;
  const me = useMemo(
    () => ({
      native_language: current?.native_language || userInfo?.user?.native_language,
      language_to_learn: current?.language_to_learn || userInfo?.user?.language_to_learn,
    }),
    [current?.native_language, current?.language_to_learn, userInfo]
  );

  // One shared signal on the All list (app parity): each speaks what the
  // other is learning. Built once so memoized cards see an equal entry.
  const mutualChip = useMemo(
    () => ({
      text: t("communityMain.mutualExchange") || "You're learning each other's language",
      primary: true,
    }),
    [t]
  );

  // Identifies the question the list is currently asking. Paging is tagged
  // with it, so changing filters, search, sort or tab puts the list back to
  // page 1 during render rather than one effect later.
  const filterKey = useMemo(
    () => JSON.stringify({ effectiveFilters, debouncedSearch, sort, activeTab }),
    [effectiveFilters, debouncedSearch, sort, activeTab]
  );


  // Single source of truth for the server query — ALL filters map to real
  // params here (inverted-language semantics handled inside the mapper).
  // Smart ranking is the DEFAULT only, and only while the server offers it
  // (the app's _sortFor): a sort the member chose always wins. The list waits
  // for the config so the first request is already the right one -- not a
  // VIP-first list that reshuffles a moment later.
  const { data: appConfig, isLoading: appConfigLoading } = useWebAppConfig();
  const smartSort = Boolean(appConfig && (appConfig as any).smartSortEnabled);
  const listSort: CommunityFilters["sort"] = sort || (smartSort ? "smart" : undefined);

  // The Partners list: one paging hook (lib/usePagedList) -- no mixed
  // pages, the server's hasMore, inline errors, Back restores pages.
  const argFor = useCallback(
    (page: number) =>
      buildCommunityQuery(
        { ...effectiveFilters, search: debouncedSearch || undefined, sort: listSort },
        me,
        page,
        PAGE_LIMIT
      ),
    [effectiveFilters, debouncedSearch, listSort, me]
  );
  // Keyed on the question as sent (languages, sort, viewer included): the
  // filters alone resumed another question's pages after a language change.
  const listKey = useMemo(
    () => `${activeTab}|${listCacheKey(currentUser._id || "", argFor(1))}`,
    [activeTab, currentUser._id, argFor]
  );
  const paged = usePagedList<CommunityMemberCard, Record<string, string>>({
    key: listKey,
    argFor,
    useQuery: useGetCommunityMembersQuery as any,
    items: (d: any) => (Array.isArray(d?.data) ? d.data : []),
    hasMore: (d: any, page) =>
      typeof d?.hasMore === "boolean"
        ? d.hasMore
        : typeof d?.pages === "number"
          ? page < d.pages
          : Array.isArray(d?.data) && d.data.length === PAGE_LIMIT,
    skip: isForYou || isToday || isAppOnly || appConfigLoading,
    refetchOnFocus: true,
  });

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
  const topicOptions = useMemo(() => {
    const raw = topicsResult?.data;
    if (!Array.isArray(raw)) return [];
    return raw
      .map((topic: any) => ({ id: String(topic._id || topic.id || topic.name || ""), name: String(topic.name || "") }))
      .filter((topic) => topic.id && topic.name);
  }, [topicsResult]);

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

  // The waves badge in the sub-nav (the inbox is a header link now).
  const { data: unreadWaves } = useGetWavesQuery(
    { unreadOnly: true, limit: 1 },
    { skip: !currentUser._id }
  );
  const wavesUnread = Number((unreadWaves as any)?.data?.unreadCount) || 0;

  // The visitors pill only shows on All; the other views never asked for it.
  const { data: visitorsData } = useGetProfileVisitorsQuery(
    { userId: currentUser._id || "", page: 1, limit: 8 },
    { skip: !currentUser._id || activeTab !== "all" }
  );

  // Persist scroll position continuously (throttled with rAF).
  // Server order stands: the client re-sort (VIP, then online) overrode the
  // chosen sort and made cards jump as pages arrived.
  const allMembers = useMemo<CommunityMemberCard[]>(
    () => paged.items.filter((m) => (currentUser._id ? m._id !== currentUser._id : true)),
    [paged.items, currentUser._id]
  );

  // VIP members only: non-VIP "fillers" repeated the grid under a Pro heading.
  const highlightedProfiles = useMemo(
    () => allMembers.filter((m) => m.isVIP).slice(0, 12),
    [allMembers]
  );

  // What goes BETWEEN the members: the periodic ad (lib/gridInterleave).
  const interleave = { total: allMembers.length };
  // The highlighted carousel is the All tab's showcase, so it leads the page
  // rather than sitting halfway down the grid.
  const showHighlights = activeTab === "all" && highlightedProfiles.length > 0;


  const visitorsCount = useMemo(() => {
    const raw = (visitorsData?.data ?? visitorsData?.visitors ?? []) as any[];
    return raw.length;
  }, [visitorsData]);

  const visitorsTotal = useMemo(() => {
    return (
      visitorsData?.totalCount ??
      visitorsData?.total ??
      visitorsCount ??
      0
    );
  }, [visitorsData, visitorsCount]);

  const hasMore = paged.hasMore;
  const listShown = allMembers.length > 0;
  const loadingMore = paged.loadingMore;
  // The observer callback lives outside React's render: read the latest
  // loadMore through a ref.
  const loadMoreRef = useRef(paged.loadMore);
  loadMoreRef.current = paged.loadMore;
  const requestNextPage = useCallback(() => loadMoreRef.current(), []);

  /**
   * Paging without a button press.
   *
   * A sentinel below the last card asks for the next page as it comes within
   * 400px of the viewport. The button stays: it is the fallback wherever
   * IntersectionObserver does not exist (older Safari, jsdom) and it is the
   * only way to page with the keyboard, so it is not hidden behind the
   * observer's existence either.
   */
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) requestNextPage();
      },
      { rootMargin: "400px 0px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
    // Re-run when the sentinel is mounted or unmounted (`hasMore`, and the
    // list appearing at all -- hasMore starts true before page 1 lands), and
    // `filterKey` when the list underneath it became a different list.
  }, [hasMore, listShown, filterKey, requestNextPage]);

  const openFilterSheet = useCallback(() => {
    // The sheet opens on what is actually applied -- the tab's lock included,
    // so the Online tab does not show an "Online now" switch sitting off while
    // the list beneath it is online-only.
    setDraftFilters(effectiveFilters);
    setIsFilterSheetOpen(true);
  }, [effectiveFilters]);

  const applyFilters = useCallback(
    (next: CommunityFilters) => {
      // As in the app: filtering from a tab that has no list shows Partners.
      applyState(isToday || isAppOnly ? { filters: next, tab: "all" } : { filters: next });
      setIsFilterSheetOpen(false);
    },
    [applyState, isToday, isAppOnly]
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

  /**
   * Type now, navigate later.
   *
   * The box gets the character immediately (local echo, zero lag); the URL --
   * and with it the re-derivation of every piece of list state -- gets one
   * write once the typing settles. The clear "x" and a pasted term go through
   * the same path, so `?q=` always catches up within one debounce.
   */
  const handleSearchChange = useCallback((value: string) => {
    setSearchDraft(value);
    pendingSearch.current = value;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      searchTimer.current = null;
      pendingSearch.current = null;
      applyStateRef.current({ search: value });
    }, SEARCH_URL_DEBOUNCE_MS);
  }, []);

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

  // WaveSheet reads its avatar from imageUrls[0]; daily users carry raw images.
  const handleWaveDaily = useCallback((match: DailyMatch) => {
    const photo = photoUrl(match.user.images);
    setWaveTarget({ ...(match.user as any), imageUrls: photo ? [photo] : [] });
  }, []);

  const handleResetAll = useCallback(() => {
    const next = { ...DEFAULT_FILTERS };
    setDraftFilters(next);
    applyState({ filters: next, search: "", sort: undefined, tab: "all" });
  }, [applyState]);

  const activeFilterCount = useMemo(
    () => countActiveFilters(visibleFilters),
    [visibleFilters]
  );

  return (
    <div className="community-page">
      <CommunitySubNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        searchValue={searchDraft}
        onSearchChange={handleSearchChange}
        onOpenFilters={openFilterSheet}
        hasActiveFilters={activeFilterCount > 0}
        activeFilterCount={activeFilterCount}
        showFilterButton={!isForYou}
        showSearch={!isForYou && !isToday && !isAppOnly}
        showToday={signedIn && !todayOff}
        wavesUnread={wavesUnread}
        filters={filters}
        onFiltersPatch={handleFiltersPatch}
        topicOptions={topicOptions}
        visitorsCount={activeTab === "all" ? visitorsTotal : 0}
      />

      {isFilterSheetOpen && (
        <Suspense fallback={null}>
          <CommunityFilterSheet
            open={isFilterSheetOpen}
            value={draftFilters}
            onChange={setDraftFilters}
            onApply={applyFilters}
            onClear={clearAllFilters}
            onCopyLink={handleCopyLink}
            canCopyLink={draftMatchesApplied}
            lockedTab={
              activeTab === "online" || activeTab === "new" || activeTab === "serious"
                ? activeTab
                : undefined
            }
            onClose={() => setIsFilterSheetOpen(false)}
            me={me}
            isVip={isVip}
            onUpgrade={() => {
              setIsFilterSheetOpen(false);
              navigate(VIP_PATH);
            }}
          />
        </Suspense>
      )}

      {waveTarget && (
        <Suspense fallback={null}>
          <WaveSheet
            open={!!waveTarget}
            targetUser={waveTarget}
            onClose={() => setWaveTarget(null)}
            onWaved={handleWaved}
          />
        </Suspense>
      )}

      <div className="community-page__container">
        {signedIn && <BoostEntryRow className="mb-3" />}
        {activeTab === "serious" && (
          // The app's explainer line under the active segment.
          <p data-testid="segment-hint" className="px-1 pb-2 text-xs text-ink-500 dark:text-ink-400">
            {t("communityMain.tabs.seriousHint") || "Active this week"}
          </p>
        )}
        {/* No filter or sort control on "For you": the tab is the server's
            answer to who you should meet, and a control that cannot change the
            answer is worse than no control. */}
        {!isForYou && !isToday && !isAppOnly && (
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
              value={visibleFilters}
              onRemove={removeFilter}
              onClear={clearAllFilters}
              topicLabels={topicLabels}
            />
          </>
        )}

        {isAppOnly ? (
          <AppOnlyTab kind={activeTab as "gatherings" | "rooms"} />
        ) : isToday ? (
          <TodayTab
            response={dailyData as any}
            isLoading={dailyLoading}
            isError={Boolean(dailyError)}
            onRetry={refetchDaily}
            onWave={handleWaveDaily}
            onBrowse={() => applyState({ tab: "all" })}
            wavedIds={wavedIds}
          />
        ) : isForYou ? (
          <ForYouTab
            members={recommendations}
            isFetching={isRecommendationsFetching}
            onRefresh={refetchRecommendations}
            onOpen={handleOpenMember}
            onWave={handleWaveMember}
            t={t}
          />
        ) : paged.firstPageError ? (
          // Inline, under the sub-nav: the member can still switch tab or
          // clear the filter that failed (it used to replace the page).
          <div className="community-empty" role="alert">
            <h3>{t("communityMain.errors.generic") || "Something went wrong"}</h3>
            <p>{t("communityMain.errors.loadError") || "We couldn't load the community."}</p>
            <button type="button" onClick={paged.retry} className="community-empty__action">
              {t("communityMain.errors.tryAgain") || "Try again"}
            </button>
          </div>
        ) : paged.initialLoading || appConfigLoading ? (
          // Cell-shaped placeholders rather than a centred spinner: the page
          // reaches its final height before the first member arrives, so
          // nothing under the grid jumps when it does.
          <div
            className="community-grid"
            data-testid="community-skeletons"
            aria-busy="true"
          >
            <span className="sr-only">
              {t("communityMain.search.loading") || "Loading members..."}
            </span>
            {Array.from({ length: SKELETON_ROWS }, (_, i) => (
              <div key={i} className={CARD_SLOT}>
                <CardSkeleton />
              </div>
            ))}
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
            {showHighlights && (
              <div className="community-highlights">
                <HighlightedProfilesCarousel
                  profiles={highlightedProfiles as any}
                  currentUser={currentUser}
                  onTryPro={() => navigate("/settings/vip")}
                />
              </div>
            )}
            <div className="community-grid">
              {allMembers.map((member, index) => (
                <Fragment key={member._id}>
                  <div className={CARD_SLOT}>
                    <MemberCard
                      user={member}
                      waved={wavedIds.indexOf(member._id) > -1}
                      reasons={isMutualExchange(member, me) ? [mutualChip] : undefined}
                      onOpen={handleOpenMember}
                      onWave={handleWaveMember}
                    />
                  </div>
                  {/* What goes BETWEEN the members -- a periodic ad -- is
                      decided by lib/gridInterleave. */}
                  {showsAdAfter(index, interleave) && (
                    <AdUnit slot={AD_SLOTS.community} className="my-3 community-grid__ad" />
                  )}
                </Fragment>
              ))}
            </div>
            {paged.pageError ? (
              <div className="community-loadmore" role="alert">
                <span>{t("communityMain.errors.loadMoreFailed") || "Couldn't load more."}</span>{" "}
                <button type="button" onClick={paged.retry}>
                  {t("communityMain.errors.tryAgain") || "Try again"}
                </button>
              </div>
            ) : hasMore && (
              <>
                {/* Reaching this means the member is at the end of the list;
                    the next page is already on its way by the time they get
                    to the button. */}
                <div
                  ref={sentinelRef}
                  data-testid="community-sentinel"
                  className="community-sentinel"
                  aria-hidden
                />
                <div className="community-loadmore">
                  <button
                    type="button"
                    onClick={requestNextPage}
                    disabled={loadingMore}
                  >
                    {loadingMore
                      ? t("communityMain.loadMore.loading") || "Loading..."
                      : t("communityMain.loadMore.button") || "Load more"}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

/**
 * /communities is members-only. A signed-out visitor goes to
 * /login?redirect=/communities (with any query string kept) and comes back
 * after signing in; nothing of the page renders for them, and none of its
 * authenticated queries or localStorage reads run.
 *
 * This is safe on first paint because the route is not prerendered any more
 * (it left src/seo/pages.ts): nginx serves the empty SPA shell, so authSlice's
 * getInitialUserInfo reads the stored session synchronously and a signed-in
 * member is already in the store when the guard decides. On a prerendered page
 * auth only arrives after hydration (hydrationAuth.ts) and this guard would
 * bounce members to /login.
 */
const MainCommunity: React.FC = () => (
  <RequireSignIn>
    <ModernCommunity />
  </RequireSignIn>
);

export default MainCommunity;
