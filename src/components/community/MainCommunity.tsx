import { useState, useMemo, useEffect, useCallback } from "react";
import { 
  Search, 
  Globe, 
  Sparkles, 
  TrendingUp, 
  Clock, 
  Users, 
  X,
  ArrowRight,
  Heart,
  MessageCircle,
  Star,
  Zap,
  Loader2
} from "lucide-react";
import { useGetCommunityMembersQuery } from "../../store/slices/communitySlice";
import { Link } from "react-router-dom";

// TypeScript interfaces
interface CommunityMember {
  _id: string;
  name: string;
  bio: string;
  native_language: string;
  language_to_learn: string;
  imageUrls: string[];
}

interface CommunityResponse {
  success: boolean;
  count: number;
  data: CommunityMember[];
}

interface LanguageFlagProps {
  code: string;
}

interface MemberCardProps {
  member: CommunityMember;
  index: number;
  onMemberClick: (memberId: string) => void;
}

interface UseDebounceReturn<T> {
  debouncedValue: T;
}

type TabType = "all" | "popular" | "new";

// Debounce hook with proper typing
const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

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

export const LanguageFlag: React.FC<LanguageFlagProps> = ({ code }) => {
  const flagMap: Record<string, string> = {
    en: "🇺🇸",
    es: "🇪🇸", 
    fr: "🇫🇷",
    de: "🇩🇪",
    it: "🇮🇹",
    pt: "🇵🇹",
    ru: "🇷🇺",
    ja: "🇯🇵",
    ko: "🇰🇷",
    zh: "🇨🇳",
  };
  return <span className="text-2xl">{flagMap[code] || code}</span>;
};

export const MemberCard: React.FC<MemberCardProps> = ({ member, index, onMemberClick }) => {
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  const getLanguageCode = (language: string): string => {
    const languageMap: Record<string, string> = {
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
    };
    if (typeof language === 'string' && language.trim() !== '') {
      return languageMap[language] || language.slice(0, 2).toLowerCase();
    }
    

  };

  const nativeCode = getLanguageCode(member.native_language);
  const learningCode = getLanguageCode(member.language_to_learn);

  const handleCardClick = () => {
    onMemberClick(member._id);
  };

  const handleLikeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLiked(!isLiked);
  };

  const handleMessageClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Handle message action
    console.log(`Message ${member.name}`);
  };

  return (
    <Link to={`/community/${member._id}`} className="member-card">
    <div 
      className="group relative bg-white bg-opacity-10 backdrop-blur-lg rounded-3xl overflow-hidden hover:bg-opacity-15 transition-all duration-500 hover:scale-105 hover:-translate-y-2 shadow-xl hover:shadow-2xl cursor-pointer border border-white border-opacity-20"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      {/* Gradient border effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 rounded-3xl opacity-0 group-hover:opacity-75 transition-opacity duration-300 p-px">
        <div className="w-full h-full bg-gray-900 bg-opacity-90 rounded-3xl"></div>
      </div>
      
      <div className="relative z-10 p-4 sm:p-6">
        {/* Header with image and status */}
        <div className="relative mb-4">
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4">
            <img
              src={member.imageUrls?.length > 0 ? member.imageUrls[0] : "/images/default-avatar.jpg"}
              alt={member.name}
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-4 border-white border-opacity-20 group-hover:border-opacity-40 transition-all duration-300"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "/images/default-avatar.jpg";
              }}
            />
            <div className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
          </div>
          
          {/* Action buttons */}
          <div className={`absolute top-2 right-2 flex space-x-2 transition-all duration-300 ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
            <button 
              onClick={handleLikeClick}
              className={`p-2 rounded-full backdrop-blur-sm transition-all duration-300 hover:scale-110 ${isLiked ? 'bg-red-500 bg-opacity-20 text-red-400' : 'bg-white bg-opacity-10 text-white hover:bg-opacity-20'}`}
            >
              <Heart className={`w-3 h-3 sm:w-4 sm:h-4 ${isLiked ? 'fill-current' : ''}`} />
            </button>
            <button 
              onClick={handleMessageClick}
              className="p-2 bg-white bg-opacity-10 backdrop-blur-sm rounded-full hover:bg-opacity-20 transition-all duration-300 hover:scale-110"
            >
              <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Language exchange visual */}
        <div className="flex items-center justify-center space-x-2 sm:space-x-3 mb-4 bg-white bg-opacity-5 rounded-2xl p-2 sm:p-3">
          <div className="flex items-center space-x-1 sm:space-x-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg sm:rounded-xl px-2 sm:px-3 py-1 sm:py-2">
            <LanguageFlag code={nativeCode} />
            <span className="text-white text-xs sm:text-sm font-medium hidden sm:inline">Native</span>
          </div>
          <ArrowRight className="text-white text-opacity-60 w-3 h-3 sm:w-4 sm:h-4" />
          <div className="flex items-center space-x-1 sm:space-x-2 bg-gradient-to-r from-pink-500 to-orange-500 rounded-lg sm:rounded-xl px-2 sm:px-3 py-1 sm:py-2">
            <LanguageFlag code={learningCode} />
            <span className="text-white text-xs sm:text-sm font-medium hidden sm:inline">Learning</span>
          </div>
        </div>

        {/* Member info */}
        <div className="text-center">
          <h3 className="text-lg sm:text-xl font-bold text-white mb-2 bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
            {member.name}
          </h3>
          
          <div className="flex items-center justify-center space-x-3 sm:space-x-4 mb-3 text-white text-opacity-80">
            <div className="flex items-center space-x-1">
              <Star className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400 fill-current" />
              <span className="text-xs sm:text-sm">{(Math.random() * 2 + 3).toFixed(1)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-green-400" />
              <span className="text-xs sm:text-sm">{Math.floor(Math.random() * 100) + 1}</span>
            </div>
          </div>

          <p className="text-white text-opacity-90 text-xs sm:text-sm leading-relaxed">
            {member.bio?.substring(0, 60) || "Passionate language learner ready to connect!"}
            {member.bio && member.bio.length > 60 ? "..." : ""}
          </p>
        </div>

        {/* Hover overlay */}
        <div className={`absolute inset-0 bg-gradient-to-t from-purple-600 from-opacity-20 to-transparent rounded-3xl transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}></div>
      </div>
      </div>
      </Link>
  );
};

const ModernCommunity: React.FC = () => {
  // State with proper typing
  const [filter, setFilter] = useState<string>("");
  const [languageFilter, setLanguageFilter] = useState<string>("");
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedFilter = useDebounce(filter, 300);

  // Mock current user data - replace with your actual user data
  const currentUser = {
    _id: "current-user-id",
    native_language: "English",
    language_to_learn: "Japanese"
  };
  const [page, setPage] = useState(1);
  const limit = 20; 
  const {
    data: communityData,
    isLoading: isLoadin2,
    isFetching,
    error:errorInfo,
    refetch,
  } = useGetCommunityMembersQuery({
    page,
    limit,
    filter: debouncedFilter,
    language: languageFilter,
    sort:
      activeTab === "popular" ? "popular" : activeTab === "new" ? "newest" : "",
  });

  // Simulated API call - replace with your actual API integration
  const fetchMembers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Replace this mock data with your actual API call
      // const response = await useGetCommunityMembersQuery({...});
      
      // Mock data for demonstration
      // const mockMembers: CommunityMember[] = [
      //   {
      //     _id: "1",
      //     name: "Sofia Martinez",
      //     bio: "Passionate about Spanish culture and flamenco dancing. Love sharing stories about Barcelona!",
      //     native_language: "Spanish",
      //     language_to_learn: "English",
      //     imageUrls: ["https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face"]
      //   },
      //   {
      //     _id: "2", 
      //     name: "Hiroshi Tanaka",
      //     bio: "Software engineer from Tokyo. Interested in anime, ramen, and exploring different cultures through language.",
      //     native_language: "Japanese",
      //     language_to_learn: "English",
      //     imageUrls: ["https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face"]
      //   },
      //   {
      //     _id: "3",
      //     name: "Emma Thompson",
      //     bio: "Teacher from London who loves literature, tea, and helping others learn English.",
      //     native_language: "English", 
      //     language_to_learn: "French",
      //     imageUrls: ["https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face"]
      //   },
      //   {
      //     _id: "4",
      //     name: "Marco Rossi",
      //     bio: "Chef from Rome passionate about Italian cuisine and sharing the beauty of Italian language.",
      //     native_language: "Italian",
      //     language_to_learn: "English", 
      //     imageUrls: ["https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face"]
      //   }
      // ];

      if (communityData)
      {
        setMembers(communityData?.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch members');
    } finally {
      setIsLoading(false);
    }
  }, [communityData]);

  useEffect(() => {
    setIsLoaded(true);
    fetchMembers();
  }, [fetchMembers]);

  const filteredMembers = useMemo(() => {
    let filteredList = members.filter(member => member._id !== currentUser._id);
    
    // Apply text filter
    if (debouncedFilter?.trim()) {
      const lowerCaseFilter = debouncedFilter.toLowerCase();

      filteredList = filteredList.filter(
        (member) =>
          member.name?.toLowerCase().includes(lowerCaseFilter) ||
          member.native_language?.toLowerCase().includes(lowerCaseFilter) ||
          member.language_to_learn?.toLowerCase().includes(lowerCaseFilter) ||
          member.bio?.toLowerCase().includes(lowerCaseFilter)
      );
    }
    
    // Apply language filter
    if (languageFilter) {
      filteredList = filteredList.filter(
        (member) =>
          member.native_language === languageFilter ||
          member.language_to_learn === languageFilter
      );
    }
    
    // Apply tab filter
    if (activeTab === "popular") {
      filteredList = filteredList.sort(() => Math.random() - 0.5).slice(0, 6);
    } else if (activeTab === "new") {
      filteredList = filteredList.slice(-4);
    }
    
    return filteredList;
  }, [members, currentUser._id, debouncedFilter, languageFilter, activeTab]);

  const handleMemberClick = (memberId: string) => {
    // Handle navigation to member profile
    console.log(`Navigate to member: ${memberId}`);
    // You can implement navigation here: navigate(`/community/${memberId}`)
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter(e.target.value);
  };

  const handleLanguageFilterChange = (language: string) => {
    setLanguageFilter(language === languageFilter ? "" : language);
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
  };

  const clearFilters = () => {
    setFilter("");
    setLanguageFilter("");
  };

  const commonLanguages: string[] = [
    "English", "Spanish", "French", "German", "Korean", 
    "Japanese", "Chinese", "Portuguese", "Russian", "Italian"
  ];

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center text-white">
          <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
          <p className="mb-4">{error}</p>
          <button 
            onClick={fetchMembers}
            className="bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-3 rounded-full font-medium hover:scale-105 transition-transform"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-green-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
      </div>

      {/* Floating particles */}
      {[...Array(15)].map((_, i) => (
        <div
          key={i}
          className="absolute opacity-20 animate-bounce"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            animationDuration: `${3 + Math.random() * 2}s`
          }}
        >
          <Sparkles className="text-white w-4 h-4" />
        </div>
      ))}

      <div className={`relative z-10 container mx-auto px-4 py-6 sm:py-8 transition-all duration-1000 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold bg-gradient-to-r from-pink-400 via-purple-400 to-blue-400 bg-clip-text text-transparent mb-4">
            Language Exchange
          </h1>
          <p className="text-lg sm:text-xl text-white text-opacity-80 mb-6 sm:mb-8">Connect with language learners worldwide</p>
          
          {/* Stats */}
          <div className="flex justify-center space-x-4 sm:space-x-8 mb-6 sm:mb-8">
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-white">{members.length}+</div>
              <div className="text-xs sm:text-sm text-white text-opacity-70">Active Learners</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-white">50+</div>
              <div className="text-xs sm:text-sm text-white text-opacity-70">Languages</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-white">180+</div>
              <div className="text-xs sm:text-sm text-white text-opacity-70">Countries</div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="max-w-4xl mx-auto mb-8 sm:mb-12 space-y-4 sm:space-y-6">
          {/* Search Bar */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-purple-500 rounded-2xl opacity-75 blur"></div>
            <div className="relative bg-white bg-opacity-10 backdrop-blur-md rounded-2xl p-1">
              <div className="flex items-center bg-white bg-opacity-5 rounded-xl px-4 sm:px-6 py-3 sm:py-4">
                <Search className="w-5 h-5 sm:w-6 sm:h-6  text-opacity-60 mr-3 sm:mr-4" />
                <input
                  type="text"
                  placeholder="Search by name or language..."
                  value={filter}
                  onChange={handleFilterChange}
                  className="flex-1 text-[#333] placeholder-white placeholder-opacity-60 outline-none text-base sm:text-lg"
                />
                {filter && (
                  <button
                    onClick={() => setFilter("")}
                    className="ml-4 p-2 hover:bg-[#333]  rounded-full transition-colors"
                  >
                    <X className="w-4 h-4 sm:w-5 sm:h-5 " />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Language Filter Pills */}
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            {commonLanguages.map((language) => (
              <button
                key={language}
                onClick={() => handleLanguageFilterChange(language)}
                className={`px-3 sm:px-6 py-2 sm:py-3 rounded-full font-medium transition-all duration-300 hover:scale-105 text-sm sm:text-base ${
                  languageFilter === language
                    ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg'
                    : 'bg-white bg-opacity-10 backdrop-blur-sm text-white text-opacity-90 hover:bg-opacity-20'
                }`}
              >
                {language}
              </button>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex justify-center">
            <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-2xl p-1">
              {[
                { id: "all" as TabType, label: "All", icon: Users },
                { id: "popular" as TabType, label: "Popular", icon: TrendingUp },
                { id: "new" as TabType, label: "New", icon: Clock }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => handleTabChange(id)}
                  className={`flex items-center space-x-1 sm:space-x-2 px-3 sm:px-6 py-2 sm:py-3 rounded-xl font-medium transition-all duration-300 text-sm sm:text-base ${
                    activeTab === id
                      ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white shadow-lg'
                      : 'text-white text-opacity-70 hover:text-white hover:bg-white hover:bg-opacity-10'
                  }`}
                >
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sm:hidden">{label.substring(0, 3)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
            <span className="ml-2 text-white">Loading amazing language partners...</span>
          </div>
        )}

        {/* Results count */}
        {!isLoading && filteredMembers.length > 0 && (
          <div className="text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center space-x-2 bg-white bg-opacity-10 backdrop-blur-sm rounded-full px-4 sm:px-6 py-2 sm:py-3">
              <Globe className="w-4 h-4 sm:w-5 sm:h-5 text-white text-opacity-70" />
              <span className="text-white text-opacity-90 text-sm sm:text-base">
                Showing {filteredMembers.length} amazing language partner{filteredMembers.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        )}

        {/* Members Grid */}
        {!isLoading && filteredMembers.length === 0 ? (
          <div className="text-center py-12 sm:py-20">
            <div className="text-5xl sm:text-6xl mb-4">🌍</div>
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-4">No language partners found</h3>
            <p className="text-white text-opacity-70 mb-6 sm:mb-8 px-4">Try adjusting your search filters to discover more learners</p>
            {(filter || languageFilter) && (
              <button
                onClick={clearFilters}
                className="bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 sm:px-8 py-2 sm:py-3 rounded-full font-medium hover:scale-105 transition-transform shadow-lg text-sm sm:text-base"
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : !isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {filteredMembers.map((member, index) => (
              <MemberCard 
                key={member._id} 
                member={member} 
                index={index} 
                onMemberClick={handleMemberClick}
              />
            ))}
          </div>
        )}

        {/* Clear filters button */}
        {!isLoading && (filter || languageFilter) && filteredMembers.length > 0 && (
          <div className="text-center mt-8 sm:mt-12">
            <button
              onClick={clearFilters}
              className="bg-white bg-opacity-10 backdrop-blur-sm text-white px-6 sm:px-8 py-2 sm:py-3 rounded-full font-medium hover:bg-opacity-20 transition-all duration-300 hover:scale-105 text-sm sm:text-base"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModernCommunity;