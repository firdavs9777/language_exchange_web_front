import { useState, useMemo, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { useGetCommunityMembersQuery } from "../../store/slices/communitySlice";
import Message from "../Message";
import Loader from "../Loader";
import "./MainCommunity.css";
// Debounce hook
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export const LanguageFlag = ({ code }) => {
  // Map common language codes to flag emojis (simplified version)
  const flagMap = {
    en: "🇺🇸", // English
    es: "🇪🇸", // Spanish
    fr: "🇫🇷", // French
    de: "🇩🇪", // German
    it: "🇮🇹", // Italian
    pt: "🇵🇹", // Portuguese
    ru: "🇷🇺", // Russian
    ja: "🇯🇵", // Japanese
    ko: "🇰🇷", // Korean
    zh: "🇨🇳", // Chinese
  };

  return <span className="language-flag">{flagMap[code] || code}</span>;
};

export const MemberCard = ({ member }) => {
  // Function to extract language code from full language name
  const getLanguageCode = (language) => {
    const languageMap = {
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
      // Add more mappings as needed
    };

    // Try to find the language code, default to first two characters lowercase
    return languageMap[language] || language.slice(0, 2).toLowerCase();
  };

  const nativeCode = getLanguageCode(member.native_language);
  const learningCode = getLanguageCode(member.language_to_learn);

  return (
    <Link to={`/community/${member._id}`} className="member-card">
      <div className="member-image-container">
        <img
          src={
            member.imageUrls?.length > 0
              ? member.imageUrls[member.imageUrls.length - 1]
              : "/images/default-avatar.jpg"
          }
          alt={member.name}
          className="member-image"
          onError={(e) => {
            e.target.src = "/images/default-avatar.jpg";
          }}
        />
        <div className="language-badges">
          <div className="language-badge native">
            <LanguageFlag code={nativeCode} />
          </div>
          <div className="language-badge arrow">→</div>
          <div className="language-badge learning">
            <LanguageFlag code={learningCode} />
          </div>
        </div>
      </div>
      <div className="member-info">
        <h3 className="member-name">{member.name}</h3>
        <div className="member-languages">
          <span className="speaks">{member.native_language}</span>
          <span className="language-separator">→</span>
          <span className="learns">{member.language_to_learn}</span>
        </div>
        <p className="member-bio">
          {member.bio?.substring(0, 60) || "No bio available"}
          {member.bio?.length > 60 ? "..." : ""}
        </p>
      </div>
    </Link>
  );
};

export interface CommunityMember {
  _id: string;
  name: string;
  bio: string;
  native_language: string;
  language_to_learn: string;
  imageUrls: string[];
}

export interface CommunityResponse {
  success: boolean;
  count: number;
  data: CommunityMember[];
}

const MainCommunity = () => {
  // State management
  const [filter, setFilter] = useState("");
  const [languageFilter, setLanguageFilter] = useState("");
  const [page, setPage] = useState(1);
  const limit = 20; // Show more members per page, like Tandem
  const [allMembers, setAllMembers] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [activeTab, setActiveTab] = useState("all"); // Tabs: all, popular, new

  // Debounced filter value
  const debouncedFilter = useDebounce(filter, 300);

  // Get current user ID from Redux store
  const userId = useSelector((state) => state.auth.userInfo?.user._id);
  const userNativeLanguage = useSelector(
    (state) => state.auth.userInfo?.user.native_language
  );
  const userLearningLanguage = useSelector(
    (state) => state.auth.userInfo?.user.language_to_learn
  );

  // RTK Query to fetch community members
  const {
    data: communityData,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useGetCommunityMembersQuery({
    page,
    limit,
    filter: debouncedFilter,
    language: languageFilter,
    sort:
      activeTab === "popular" ? "popular" : activeTab === "new" ? "newest" : "",
  });

  // Update all members when data changes
  useEffect(() => {
    if (communityData) {
      if (page === 1) {
        setAllMembers(communityData.data);
      } else {
        setAllMembers((prev) => {
          const existingIds = new Set(prev.map((member) => member._id));
          const newMembers = communityData.data.filter(
            (member) => !existingIds.has(member._id)
          );
          return [...prev, ...newMembers];
        });
      }

      setHasMore(communityData.data.length >= limit);
      setIsLoadingMore(false);
    }
  }, [communityData, page, limit]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [debouncedFilter, languageFilter, activeTab]);

  // Filter change handler
  const handleFilterChange = (e) => {
    setFilter(e.target.value);
  };

  // Language filter change handler
  const handleLanguageFilterChange = (language) => {
    setLanguageFilter(language === languageFilter ? "" : language);
  };

  // Tab change handler
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  // Infinite scroll handler
  const handleScroll = useCallback(() => {
    if (isLoading || isFetching || isLoadingMore || !hasMore) return;

    const scrollPosition = window.innerHeight + window.scrollY;
    const threshold = document.documentElement.offsetHeight - 200;

    if (scrollPosition >= threshold) {
      setIsLoadingMore(true);
      setPage((prevPage) => prevPage + 1);
    }
  }, [isLoading, isFetching, isLoadingMore, hasMore]);

  // Register scroll event listener
  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Client-side filtering
  const filteredMembers = useMemo(() => {
    return allMembers
      .filter((member) => member._id !== userId) // Exclude current user
      .filter(
        (member) =>
          debouncedFilter === "" ||
          member.name.toLowerCase().includes(debouncedFilter.toLowerCase()) ||
          member.native_language
            .toLowerCase()
            .includes(debouncedFilter.toLowerCase()) ||
          member.language_to_learn
            .toLowerCase()
            .includes(debouncedFilter.toLowerCase())
      )
      .filter(
        (member) =>
          languageFilter === "" ||
          member.native_language === languageFilter ||
          member.language_to_learn === languageFilter
      );
  }, [allMembers, userId, debouncedFilter, languageFilter]);

  // Loading state
  if (isLoading && page === 1) {
    return (
      <div className="community-loader">
        <Loader />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="community-error">
        <Message variant="danger">
          Error loading community members: {error.message}
          <button onClick={refetch} className="retry-button">
            Try Again
          </button>
        </Message>
      </div>
    );
  }

  // Common languages to show in quick filters
  const commonLanguages = [
    "English",
    "Spanish",
    "French",
    "German",
    "Korean",
    "Japanese",
    "Chinese",
  ];

  return (
    <div className="tandem-community">
      <div className="community-header">
        <h1>Language Exchange Community</h1>
        <p className="community-subtitle">
          Connect with language learners worldwide
        </p>
      </div>

      <div className="community-filters">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by name or language..."
            value={filter}
            onChange={handleFilterChange}
            className="search-input"
          />
          <span className="search-icon">🔍</span>
        </div>

        <div className="quick-language-filters">
          <div
            className={`language-pill ${
              languageFilter === userNativeLanguage ? "active" : ""
            }`}
            onClick={() => handleLanguageFilterChange(userNativeLanguage)}
          >
            Speaks {userNativeLanguage}
          </div>
          <div
            className={`language-pill ${
              languageFilter === userLearningLanguage ? "active" : ""
            }`}
            onClick={() => handleLanguageFilterChange(userLearningLanguage)}
          >
            Learns {userLearningLanguage}
          </div>
          {commonLanguages
            .filter(
              (lang) =>
                lang !== userNativeLanguage && lang !== userLearningLanguage
            )
            .slice(0, 3)
            .map((language) => (
              <div
                key={language}
                className={`language-pill ${
                  languageFilter === language ? "active" : ""
                }`}
                onClick={() => handleLanguageFilterChange(language)}
              >
                {language}
              </div>
            ))}
        </div>

        <div className="community-tabs">
          <button
            className={`tab-button ${activeTab === "all" ? "active" : ""}`}
            onClick={() => handleTabChange("all")}
          >
            All Members
          </button>
          <button
            className={`tab-button ${activeTab === "popular" ? "active" : ""}`}
            onClick={() => handleTabChange("popular")}
          >
            Popular
          </button>
          <button
            className={`tab-button ${activeTab === "new" ? "active" : ""}`}
            onClick={() => handleTabChange("new")}
          >
            New
          </button>
        </div>
      </div>

      {filteredMembers.length === 0 ? (
        <div className="empty-community">
          <div className="empty-icon">👥</div>
          <h3>No members found</h3>
          <p>Try adjusting your search filters</p>
          {(debouncedFilter || languageFilter) && (
            <button
              onClick={() => {
                setFilter("");
                setLanguageFilter("");
              }}
              className="reset-filters-button"
            >
              Reset All Filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="members-count">
            <span>Showing {filteredMembers.length} members</span>
            {(debouncedFilter || languageFilter) && (
              <button
                onClick={() => {
                  setFilter("");
                  setLanguageFilter("");
                }}
                className="clear-filters"
              >
                Clear filters
              </button>
            )}
          </div>

          <div className="members-grid">
            {filteredMembers.map((member) => (
              <MemberCard key={member._id} member={member} />
            ))}
          </div>

          {/* Loading indicator for infinite scroll */}
          {(isLoadingMore || isFetching) && (
            <div className="loading-more">
              <Loader />
              <p>Loading more members...</p>
            </div>
          )}

          {/* End of list message */}
          {!hasMore && filteredMembers.length > 0 && (
            <div className="end-of-list">
              <p>You've seen all matching members</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MainCommunity;
