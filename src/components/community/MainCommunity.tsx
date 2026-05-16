import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Loader2, X, Search } from "lucide-react";
import { useGetCommunityMembersQuery } from "../../store/slices/communitySlice";
import { useGetProfileVisitorsQuery } from "../../store/slices/usersSlice";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import { COMMON_LANGUAGES, LANGUAGE_FLAGS, LanguageFlagProps } from "./type";
import { useDebounce } from "./utils";
import { Navigate } from "react-router-dom";

import CommunitySubNav, { CommunityNavTab } from "./tandem/CommunitySubNav";
import HighlightedProfilesCarousel from "./tandem/HighlightedProfilesCarousel";
import VisitorsBanner from "./tandem/VisitorsBanner";
import TandemMemberCard, { TandemMember } from "./tandem/TandemMemberCard";
import "./tandem/tandem-community.scss";

// Re-exported so other files (legacy MemberCard, etc.) can keep importing it.
export const LanguageFlag: React.FC<LanguageFlagProps> = ({ code }) => (
  <span style={{ fontSize: "1rem" }}>{LANGUAGE_FLAGS[code] || code}</span>
);

const getLanguageCode = (language: string): string => {
  const codes: Record<string, string> = {
    English: "en",
    Spanish: "es",
    French: "fr",
    German: "de",
    Italian: "it",
    Portuguese: "pt",
    Russian: "ru",
    Japanese: "ja",
    Korean: "ko",
    Chinese: "zh",
    Uzbek: "uz",
    Turkish: "tr",
    Arabic: "ar",
  };
  return codes[language] || language.substring(0, 2).toLowerCase();
};

const ModernCommunity: React.FC = () => {
  const { t } = useTranslation();
  const [filter, setFilter] = useState("");
  const [languageFilter, setLanguageFilter] = useState("");
  const [activeTab, setActiveTab] = useState<CommunityNavTab>("all");
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [page, setPage] = useState(1);
  // Pages beyond the first are accumulated here so "Load more" keeps prior
  // results visible. Page 1 itself is derived directly from the RTK Query
  // cache below — that way, returning from /community/:id shows the cached
  // member list on the FIRST render instead of flashing the empty state
  // while a useEffect copy fires after paint.
  const [extraPages, setExtraPages] = useState<TandemMember[]>([]);

  // Restore scroll when returning to /communities (e.g. back from
  // /community/:id). Save on unmount, restore on mount. We wait for the
  // first paint so the page-1 grid (derived from RTK cache) is on screen
  // before we try to scroll into it.
  useEffect(() => {
    const saved = sessionStorage.getItem("communityScroll");
    if (saved) {
      const y = parseInt(saved, 10);
      if (!Number.isNaN(y)) {
        requestAnimationFrame(() => window.scrollTo(0, y));
      }
    }
    return () => {
      sessionStorage.setItem("communityScroll", String(window.scrollY));
    };
  }, []);

  const debouncedFilter = useDebounce(filter, 300);
  const userInfo = useSelector((state: RootState) => state.auth.userInfo);
  const currentUser = useMemo(
    () => ({
      _id: userInfo?.user?._id,
      name: userInfo?.user?.name,
      imageUrls: userInfo?.user?.imageUrls,
    }),
    [userInfo]
  );

  const {
    data: communityData,
    isLoading,
    isFetching,
    error: errorInfo,
    refetch,
  } = useGetCommunityMembersQuery({
    page,
    limit: 20,
    language: languageFilter || undefined,
  });

  const {
    data: visitorsData,
  } = useGetProfileVisitorsQuery(
    { userId: currentUser._id || "", page: 1, limit: 8 },
    { skip: !currentUser._id }
  );

  // When a "Load more" page arrives, append it to extraPages. Page 1 itself
  // is read directly off the query cache via the useMemo below — no effect
  // round-trip means no first-render flash of the empty state.
  useEffect(() => {
    if (!communityData?.data || page === 1) return;
    setExtraPages((prev) => {
      const existingIds = new Set(prev.map((m) => m._id));
      const newOnes = communityData.data.filter(
        (m: TandemMember) => !existingIds.has(m._id)
      );
      return [...prev, ...newOnes];
    });
  }, [communityData, page]);

  // Reset pagination when filters change. Skip the first run so a fresh
  // mount (back-nav from /community/:id) doesn't clobber state.
  const skipFilterReset = useRef(true);
  useEffect(() => {
    if (skipFilterReset.current) {
      skipFilterReset.current = false;
      return;
    }
    setPage(1);
    setExtraPages([]);
  }, [debouncedFilter, languageFilter]);

  // Derived union of the first page (from RTK Query cache, available on the
  // very first render after remount) + any accumulated extra pages.
  const allMembers = useMemo<TandemMember[]>(() => {
    const firstPage: TandemMember[] = communityData?.data || [];
    if (!extraPages.length) return firstPage;
    const seen = new Set(firstPage.map((m) => m._id));
    const merged: TandemMember[] = [...firstPage];
    for (const m of extraPages) {
      if (!seen.has(m._id)) {
        seen.add(m._id);
        merged.push(m);
      }
    }
    return merged;
  }, [communityData, extraPages]);

  const filteredMembers = useMemo(() => {
    let list: TandemMember[] = allMembers.filter((m) =>
      currentUser._id ? m._id !== currentUser._id : true
    );
    if (debouncedFilter?.trim()) {
      const term = debouncedFilter.toLowerCase();
      list = list.filter((m) =>
        [m.name, m.native_language, m.language_to_learn, m.bio]
          .some((field) => field?.toLowerCase().includes(term))
      );
    }
    if (languageFilter) {
      list = list.filter(
        (m) =>
          m.native_language === languageFilter ||
          m.language_to_learn === languageFilter
      );
    }
    return list;
  }, [allMembers, currentUser._id, debouncedFilter, languageFilter]);

  const highlightedProfiles = useMemo(() => {
    const pool = filteredMembers.length ? filteredMembers : allMembers;
    const pros = pool.filter((m) => m.isVIP || m.isVip);
    const fillers = pool.filter((m) => !m.isVIP && !m.isVip);
    return [...pros, ...fillers].slice(0, 12);
  }, [filteredMembers, allMembers]);

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

  const hasMore = communityData?.data?.length === 20;

  const handleLoadMore = useCallback(() => {
    if (!isFetching && hasMore) setPage((p) => p + 1);
  }, [isFetching, hasMore]);

  const handleResetFilters = useCallback(() => {
    setFilter("");
    setLanguageFilter("");
    setActiveTab("all");
  }, []);

  if (!userInfo) {
    return <Navigate to="/login?redirect=/communities" replace />;
  }

  if (errorInfo) {
    return (
      <div className="community-page">
        <div className="community-page__container">
          <div className="community-empty">
            <h3>{t("communityMain.errors.generic") || "Something went wrong"}</h3>
            <p>{t("communityMain.errors.loadError") || "We couldn't load the community."}</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="community-loadmore"
              style={{ background: "#1f2937", color: "#fff", padding: "10px 24px", borderRadius: 999, border: "none", cursor: "pointer" }}
            >
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
        onTabChange={setActiveTab}
        searchValue={filter}
        onSearchChange={setFilter}
        onOpenFilters={() => setShowFilterDropdown((v) => !v)}
        hasActiveFilters={Boolean(languageFilter)}
      />

      <div className="community-page__container">
        {showFilterDropdown && (
          <div
            className="community-filter-popover"
            style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 16,
              padding: 16,
              margin: "16px 0",
              boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <strong>Filter by language</strong>
              <button
                type="button"
                onClick={() => setShowFilterDropdown(false)}
                style={{ border: "none", background: "transparent", cursor: "pointer" }}
                aria-label="Close filters"
              >
                <X size={16} />
              </button>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => { setLanguageFilter(""); setShowFilterDropdown(false); }}
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  border: "1px solid #e5e7eb",
                  background: !languageFilter ? "#1f2937" : "#fff",
                  color: !languageFilter ? "#fff" : "#1f2937",
                  fontSize: "0.8125rem",
                  cursor: "pointer",
                }}
              >
                All languages
              </button>
              {COMMON_LANGUAGES.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => { setLanguageFilter(lang); setShowFilterDropdown(false); }}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 999,
                    border: "1px solid #e5e7eb",
                    background: languageFilter === lang ? "#1f2937" : "#fff",
                    color: languageFilter === lang ? "#fff" : "#1f2937",
                    fontSize: "0.8125rem",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <span>{LANGUAGE_FLAGS[getLanguageCode(lang)] || "🌐"}</span>
                  {lang}
                </button>
              ))}
            </div>
          </div>
        )}

        {highlightedProfiles.length > 0 && (
          <HighlightedProfilesCarousel
            profiles={highlightedProfiles}
            currentUser={currentUser}
          />
        )}

        {visitorsTotal > 0 && (
          <VisitorsBanner visitors={visitorsList} totalCount={visitorsTotal} />
        )}

        {isLoading ? (
          <div className="community-empty">
            <Loader2 className="animate-spin" />
            <p>{t("communityMain.search.loading") || "Loading members..."}</p>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="community-empty">
            <Search style={{ width: 40, height: 40, color: "#d1d5db", margin: "0 auto 12px", display: "block" }} />
            <h3>{t("communityMain.results.noneFound.title") || "No members found"}</h3>
            <p>{t("communityMain.results.noneFound.message") || "Try widening your search or clearing filters."}</p>
            <button
              type="button"
              onClick={handleResetFilters}
              style={{
                padding: "10px 24px",
                borderRadius: 999,
                background: "#1f2937",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              {t("communityMain.results.noneFound.resetFilters") || "Reset filters"}
            </button>
          </div>
        ) : (
          <>
            <div className="community-grid">
              {filteredMembers.map((member) => (
                <TandemMemberCard key={member._id} member={member} />
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

export default ModernCommunity;
