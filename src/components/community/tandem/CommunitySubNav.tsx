import React from "react";
import { useNavigate } from "react-router-dom";
import { Search, SlidersHorizontal, Zap, X } from "lucide-react";

export type CommunityNavTab = "all" | "nearby" | "topics";

interface CommunitySubNavProps {
  activeTab: CommunityNavTab;
  onTabChange: (tab: CommunityNavTab) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onOpenFilters: () => void;
  hasActiveFilters?: boolean;
  activeFilterCount?: number;
}

const CommunitySubNav: React.FC<CommunitySubNavProps> = ({
  activeTab,
  onTabChange,
  searchValue,
  onSearchChange,
  onOpenFilters,
  hasActiveFilters = false,
  activeFilterCount = 0,
}) => {
  const navigate = useNavigate();

  const handleTab = (tab: CommunityNavTab) => {
    onTabChange(tab);
    if (tab === "nearby") navigate("/community/nearby");
    if (tab === "topics") navigate("/topics");
  };

  return (
    <div className="community-subnav">
      <div className="community-subnav__container">
        <div className="community-subnav__buttons">
          <button
            type="button"
            className={`community-subnav__btn ${
              activeTab === "all" ? "community-subnav__btn--active" : ""
            }`}
            onClick={() => handleTab("all")}
          >
            All members
          </button>
          <button
            type="button"
            className={`community-subnav__btn community-subnav__btn--icon ${
              activeTab === "nearby" ? "community-subnav__btn--active" : ""
            }`}
            onClick={() => handleTab("nearby")}
          >
            <span className="community-subnav__icon">
              <Zap size={14} fill="currentColor" />
            </span>
            <span>Nearby</span>
          </button>
          <button
            type="button"
            className={`community-subnav__btn community-subnav__btn--icon ${
              activeTab === "topics" ? "community-subnav__btn--active" : ""
            }`}
            onClick={() => handleTab("topics")}
          >
            <span className="community-subnav__icon">
              <Zap size={14} fill="currentColor" />
            </span>
            <span>Topics</span>
          </button>
        </div>

        <div className="community-subnav__actions">
          <div className="community-subnav__search">
            <Search size={16} className="community-subnav__search-icon" />
            <input
              type="text"
              placeholder="Find members or topics"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            {searchValue && (
              <button
                type="button"
                className="community-subnav__search-clear"
                onClick={() => onSearchChange("")}
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <button
            type="button"
            className={`community-subnav__filter-btn ${
              hasActiveFilters ? "community-subnav__filter-btn--active" : ""
            }`}
            onClick={onOpenFilters}
            aria-label={
              activeFilterCount > 0
                ? `Filters (${activeFilterCount} active)`
                : "Filters"
            }
            title="Filters"
          >
            <SlidersHorizontal size={18} />
            {activeFilterCount > 0 && (
              <span className="community-subnav__filter-badge">{activeFilterCount}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CommunitySubNav;
