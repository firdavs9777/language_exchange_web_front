import React, { useEffect, useRef, useState } from "react";
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
  Flame,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { CommunityFilters } from "../lib/buildCommunityQuery";

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
  | "today"
  | "foryou"
  | "all"
  | "serious"
  | "online"
  | "new"
  | "nearby"
  | "topics"
  | "gatherings"
  | "rooms";

/**
 * The app's top row: Matches · Partners · Gatherings · Rooms. Matches is the
 * `today` tab; Partners is the member list, whose four views (All, For you,
 * Online, New) keep their own `?tab=` keys and show as a second row of chips.
 */
const PARTNER_VIEWS: CommunityNavTab[] = ["all", "foryou", "serious", "online", "new"];

const TOP_TABS: { id: CommunityNavTab; copyKey: string; fallback: string }[] = [
  { id: "today", copyKey: "communityMain.tabs.matches", fallback: "Matches" },
  { id: "all", copyKey: "communityMain.tabs.partners", fallback: "Partners" },
  { id: "gatherings", copyKey: "communityMain.tabs.gatherings", fallback: "Gatherings" },
  { id: "rooms", copyKey: "communityMain.tabs.rooms", fallback: "Rooms" },
];

/** The tabs rendered in place, in the order the app shows them. */
const IN_PAGE_TABS: {
  id: CommunityNavTab;
  copyKey: string;
  fallback: string;
  Icon?: React.ComponentType<{ size?: number }>;
}[] = [
  { id: "all", copyKey: "communityMain.tabs.all", fallback: "All" },
  {
    id: "foryou",
    copyKey: "communityMain.tabs.forYou",
    fallback: "For you",
    Icon: Sparkles,
  },
  {
    // The app's "Serious learners" segment (partner_segment_chips.dart):
    // the All list, active this week.
    id: "serious",
    copyKey: "communityMain.tabs.serious",
    fallback: "Serious learners",
    Icon: Flame,
  },
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
  /** How many people visited the viewer's profile. Absent or 0 renders nothing. */
  visitorsCount?: number;
  /** Unread waves; the waves inbox link shows it as a badge. */
  wavesUnread?: number;
  /** Applied filters, for the Same city / Women / Men / Topic chips. */
  filters?: CommunityFilters;
  /** A chip changed some filters; absent = no chips. */
  onFiltersPatch?: (patch: Partial<CommunityFilters>) => void;
  /** Topics the Topic chip offers. */
  topicOptions?: { id: string; name: string }[];
  /**
   * Today's matches. Off for a signed-out visitor and when the server answers
   * /matching/daily with 404 (DAILY_MATCHES_ENABLED off) -- a tab for a
   * feature that is not there would lead nowhere.
   */
  showToday?: boolean;
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
  visitorsCount,
  wavesUnread = 0,
  filters = {},
  onFiltersPatch,
  topicOptions = [],
  showToday = false,
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

  const visibleTopTabs = TOP_TABS.filter(({ id }) => showToday || id !== "today");
  const domIdOf = (id: CommunityNavTab) =>
    `community-tab-${id === "all" ? "partners" : id === "today" ? "matches" : id}`;
  /** Roving tabs: inactive tabs are tabIndex -1, so arrows are how a keyboard reaches them. */
  const moveTab = (e: React.KeyboardEvent, from: CommunityNavTab) => {
    const step =
      e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    const ids = visibleTopTabs.map((tab) => tab.id);
    let target: CommunityNavTab | undefined;
    if (step) target = ids[(ids.indexOf(from) + step + ids.length) % ids.length];
    else if (e.key === "Home") target = ids[0];
    else if (e.key === "End") target = ids[ids.length - 1];
    if (!target) return;
    e.preventDefault();
    const partnersAlready = target === "all" && PARTNER_VIEWS.indexOf(activeTab) >= 0;
    if (!partnersAlready) onTabChange(target);
    document.getElementById(domIdOf(target))?.focus();
  };

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
            {visibleTopTabs.map(({ id, copyKey, fallback }) => {
              const active =
                id === "all" ? PARTNER_VIEWS.indexOf(activeTab) >= 0 : activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  id={domIdOf(id)}
                  aria-selected={active}
                  tabIndex={active ? 0 : -1}
                  ref={active ? activeRef : undefined}
                  className={`community-subnav__btn shrink-0 ${active ? "community-subnav__btn--active" : ""}`}
                  onKeyDown={(e) => moveTab(e, id)}
                  onClick={() => {
                    // Partners keeps whichever view the member was already on.
                    if (id === "all" && PARTNER_VIEWS.indexOf(activeTab) >= 0) return;
                    onTabChange(id);
                  }}
                >
                  <span>{t(copyKey) || fallback}</span>
                </button>
              );
            })}
          </div>

        </div>

        {PARTNER_VIEWS.indexOf(activeTab) >= 0 && (
          <div
            role="tablist"
            aria-label={t("communityMain.tabs.partnersViews") || "Partner views"}
            className="order-last flex w-full items-center gap-2 overflow-x-auto flex-nowrap [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                  onClick={() => onTabChange(id)}
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                    active
                      ? "border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-200"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
                  }`}
                >
                  {Icon && <Icon size={13} />}
                  <span>{t(copyKey) || fallback}</span>
                </button>
              );
            })}
            {/* Chips (2026-10-31): Nearby is its own page; the rest write the
                same filter fields as the sheet, so the two never disagree. */}
            <Link
              to="/community/nearby"
              data-testid="chip-nearby"
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-gray-200 px-3 py-1 text-sm font-medium text-gray-600 no-underline hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
            >
              <MapPin size={13} />
              <span>{t("communityMain.subnav.nearby") || "Nearby"}</span>
            </Link>
            {onFiltersPatch &&
              ([
                ["sameCity", t("communityMain.tabs.sameCity") || "Same city", Boolean(filters.sameCity), { sameCity: !filters.sameCity || undefined }],
                ["women", t("communityMain.tabs.women") || "Women", filters.gender === "female", { gender: filters.gender === "female" ? undefined : "female" }],
                ["men", t("communityMain.tabs.men") || "Men", filters.gender === "male", { gender: filters.gender === "male" ? undefined : "male" }],
              ] as [string, string, boolean, Partial<CommunityFilters>][]).map(([id, label, on, patch]) => (
                <button
                  key={id}
                  type="button"
                  data-testid={`chip-${id}`}
                  aria-pressed={on}
                  onClick={() => onFiltersPatch(patch)}
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
                    on
                      ? "border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-200"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
                  }`}
                >
                  <span>{label}</span>
                </button>
              ))}
            {onFiltersPatch && (
              <TopicChip
                topics={topicOptions}
                selected={filters.topics && filters.topics.length === 1 ? filters.topics[0] : undefined}
                label={t("communityMain.tabs.topic") || "Topic"}
                onPick={(id) => onFiltersPatch({ topics: id ? [id] : undefined })}
              />
            )}
          </div>
        )}

        <div className="community-subnav__actions">
          {/* Governed only by its own guard -- it must not vanish just
              because the search box or filter button is hidden on a tab
              like "For you". */}
          {/* Waves inbox (it was a page nothing linked to), with the unread count. */}
          <Link
            to="/waves"
            data-testid="community-waves-link"
            className="community-subnav__btn community-subnav__btn--icon shrink-0 no-underline relative"
            aria-label={t("waves.title") || "Waves"}
            title={t("waves.title") || "Waves"}
          >
            <span aria-hidden>👋</span>
            {wavesUnread > 0 && (
              <span className="ml-1 rounded-full bg-red-500 text-white text-[11px] leading-none px-1.5 py-0.5">
                {wavesUnread > 99 ? "99+" : wavesUnread}
              </span>
            )}
          </Link>
          {typeof visitorsCount === "number" && visitorsCount > 0 && (
            <Link
              to="/visitors"
              data-testid="subnav-visitors"
              className="community-subnav__visitors"
              aria-label={
                t("communityMain.visitors.pill", { count: visitorsCount }) ||
                (visitorsCount === 1
                  ? "1 person visited your profile"
                  : `${visitorsCount} people visited your profile`)
              }
            >
              <span aria-hidden>👋</span>
              <span>{visitorsCount > 99 ? "99+" : visitorsCount}</span>
            </Link>
          )}
          {(showSearch || showFilterButton) && (
            <>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommunitySubNav;

/** "Topic ▾": a small menu of topics; picking the selected one clears it. */
const TopicChip: React.FC<{
  topics: { id: string; name: string }[];
  selected?: string;
  label: string;
  onPick: (id: string | undefined) => void;
}> = ({ topics, selected, label, onPick }) => {
  const [open, setOpen] = useState(false);
  const name = topics.find((topic) => topic.id === selected)?.name;
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        data-testid="chip-topic"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-pressed={Boolean(selected)}
        onClick={() => setOpen((was) => !was)}
        className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-medium transition-colors ${
          selected
            ? "border-teal-500 bg-teal-50 text-teal-700 dark:bg-teal-500/15 dark:text-teal-200"
            : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
        }`}
      >
        <Hash size={13} />
        <span>{name || label}</span>
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label={label}
          className="absolute z-20 mt-1 max-h-64 w-48 overflow-auto rounded-xl border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-900"
        >
          {topics.map((topic) => (
            <li key={topic.id}>
              <button
                type="button"
                role="option"
                aria-selected={topic.id === selected}
                onClick={() => {
                  setOpen(false);
                  onPick(topic.id === selected ? undefined : topic.id);
                }}
                className="w-full rounded-lg px-3 py-1.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-white/5"
              >
                {topic.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
