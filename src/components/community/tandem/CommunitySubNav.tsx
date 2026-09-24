import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Hash,
  MapPin,
  Radio,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Six destinations, two kinds.
 *
 * `foryou`, `all`, `online` and `new` are the same list with a different
 * question asked of it, so they are tabs: they stay on /communities and say
 * which one they are in `?tab=`. `nearby` and `topics` are separate pages, so
 * they are links — a tab that navigates away is a lie to anyone reading the
 * tablist with a screen reader, and it costs the member the ability to
 * middle-click or open them in a new tab.
 */
export type CommunityNavTab =
  | "foryou"
  | "all"
  | "online"
  | "new"
  | "nearby"
  | "topics";

/** The tabs rendered in place, in the order the app shows them. */
const IN_PAGE_TABS: {
  id: CommunityNavTab;
  copyKey: string;
  fallback: string;
  Icon?: React.ComponentType<{ size?: number }>;
}[] = [
  {
    id: "foryou",
    copyKey: "communityMain.tabs.forYou",
    fallback: "For you",
    Icon: Sparkles,
  },
  { id: "all", copyKey: "communityMain.tabs.all", fallback: "All" },
  {
    id: "online",
    copyKey: "communityMain.tabs.online",
    fallback: "Online",
    Icon: Radio,
  },
  {
    id: "new",
    copyKey: "communityMain.tabs.new",
    fallback: "New",
    Icon: Star,
  },
];

interface CommunitySubNavProps {
  activeTab: CommunityNavTab;
  onTabChange: (tab: CommunityNavTab) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onOpenFilters: () => void;
  hasActiveFilters?: boolean;
  activeFilterCount?: number;
  /**
   * "For you" is the server's answer, not the member's query, so the tab that
   * shows it hides the filter button rather than offering a control that
   * cannot change anything.
   */
  showFilterButton?: boolean;
  /**
   * False on "For you": the feed is scored server-side and ignores a search
   * term entirely, so a box that looks like it filters the list is a lie.
   */
  showSearch?: boolean;
}

const CommunitySubNav: React.FC<CommunitySubNavProps> = ({
  activeTab,
  onTabChange,
  searchValue,
  onSearchChange,
  onOpenFilters,
  hasActiveFilters = false,
  activeFilterCount = 0,
  showFilterButton = true,
  showSearch = true,
}) => {
  const { t } = useTranslation();
  const activeRef = useRef<HTMLButtonElement | null>(null);

  // On a phone the six destinations do not fit, so the row scrolls. Whatever
  // the URL says is selected is pulled back into view after the fact (never
  // during render, and `block: "nearest"` so the page itself does not jump to
  // the sub-nav on load). jsdom has no scrollIntoView, hence the guard.
  useEffect(() => {
    const node = activeRef.current;
    if (!node || typeof node.scrollIntoView !== "function") return;
    node.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeTab]);

  return (
    <div className="community-subnav">
      <div className="community-subnav__container">
        {/* Tailwind rather than the stylesheet's wrapping row: the tabs must
            stay on one scrollable line, and `shrink-0` keeps each pill its
            full width instead of squeezing six of them into 390px. */}
        <div className="flex items-center gap-2 overflow-x-auto flex-nowrap max-w-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div
            role="tablist"
            aria-label={t("communityMain.tabs.label") || "Community tabs"}
            className="flex items-center gap-2 flex-nowrap"
          >
            {IN_PAGE_TABS.map(({ id, copyKey, fallback, Icon }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  id={`community-tab-${id}`}
                  aria-selected={active}
                  tabIndex={active ? 0 : -1}
                  ref={active ? activeRef : undefined}
                  className={`community-subnav__btn shrink-0 ${
                    Icon ? "community-subnav__btn--icon" : ""
                  } ${active ? "community-subnav__btn--active" : ""}`}
                  onClick={() => onTabChange(id)}
                >
                  {Icon && (
                    <span className="community-subnav__icon">
                      <Icon size={14} />
                    </span>
                  )}
                  <span>{t(copyKey) || fallback}</span>
                </button>
              );
            })}
          </div>

          <Link
            to="/community/nearby"
            className="community-subnav__btn community-subnav__btn--icon shrink-0 no-underline"
          >
            <span className="community-subnav__icon">
              <MapPin size={14} />
            </span>
            <span>{t("communityMain.subnav.nearby") || "Nearby"}</span>
          </Link>
          <Link
            to="/topics"
            className="community-subnav__btn community-subnav__btn--icon shrink-0 no-underline"
          >
            <span className="community-subnav__icon">
              <Hash size={14} />
            </span>
            <span>{t("communityMain.subnav.topics") || "Topics"}</span>
          </Link>
        </div>

        {(showSearch || showFilterButton) && (
          <div className="community-subnav__actions">
            {showSearch && (
              <div className="community-subnav__search">
                <Search size={16} className="community-subnav__search-icon" />
                <input
                  type="text"
                  placeholder={
                    t("communityMain.subnav.searchPlaceholder") ||
                    "Find members or topics"
                  }
                  value={searchValue}
                  onChange={(e) => onSearchChange(e.target.value)}
                />
                {searchValue && (
                  <button
                    type="button"
                    className="community-subnav__search-clear"
                    onClick={() => onSearchChange("")}
                    aria-label={
                      t("communityMain.filters.clear") || "Clear search"
                    }
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            )}
            {showFilterButton && (
              <button
                type="button"
                className={`community-subnav__filter-btn ${
                  hasActiveFilters ? "community-subnav__filter-btn--active" : ""
                }`}
                onClick={onOpenFilters}
                aria-label={
                  activeFilterCount > 0
                    ? t("communityMain.subnav.filtersWithCount", {
                        count: activeFilterCount,
                      }) || `Filters (${activeFilterCount} active)`
                    : t("communityMain.subnav.filtersLabel") || "Filters"
                }
                title={t("communityMain.subnav.filtersLabel") || "Filters"}
              >
                <SlidersHorizontal size={18} />
                {activeFilterCount > 0 && (
                  <span className="community-subnav__filter-badge">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunitySubNav;
