import React, { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaExclamationTriangle, FaPlus, FaRedo } from "react-icons/fa";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import Pagination from "../../composables/Pagination";
import { useGetMomentsQuery } from "../../store/slices/momentsSlice";
import EmptyState from "./EmptyState";
import SingleMoment from "./SingleMoment";
import { MomentType } from "./types";

// TypeScript interfaces (keeping existing interfaces)
interface User {
  _id: string;
  name: string;
  images?: string[];
  imageUrls?: string[];
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

interface CreatePostCardProps {
  userImage: string;
  userName: string;
  handleAddMoment: () => void;
  t: (key: string) => string;
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


// Mobile-optimized Create Post Card
const CreatePostCard: React.FC<CreatePostCardProps> = ({
  userImage,
  userName,
  handleAddMoment,
  t,
}) => (
  <div className="relative mb-4 sm:mb-6 overflow-hidden rounded-xl sm:rounded-2xl bg-gradient-to-br from-white/80 to-gray-50/50 backdrop-blur-xl border border-white/20 shadow-xl">
    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5"></div>
    <div className="relative p-3 sm:p-6">
      <div className="flex items-center gap-2 sm:gap-4">
        <div className="relative">
          <div className="relative overflow-hidden rounded-full ring-2 ring-white/50 shadow-lg">
            <img
              src={userImage}
              alt="User"
              className="h-8 w-8 sm:h-12 sm:w-12 object-cover transition-transform duration-300 hover:scale-110"
            />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 sm:h-4 sm:w-4 rounded-full bg-gradient-to-r from-green-400 to-green-500 ring-2 ring-white shadow-sm"></div>
        </div>
        <button
          onClick={handleAddMoment}
          className="group flex-1 rounded-full bg-white/60 backdrop-blur-sm border border-white/30 px-3 py-2 sm:px-6 sm:py-3 text-left shadow-lg transition-all duration-300 hover:bg-white/80 hover:shadow-xl hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
        >
          <span className="text-sm sm:text-base text-gray-600 font-medium group-hover:text-gray-700 transition-colors">
            {t("moments_section.question")} {userName.split(" ")[0]}?
          </span>
        </button>
        {/* Hide the plus button on mobile since we have a floating action button */}
        <button
          onClick={handleAddMoment}
          className="hidden sm:group sm:flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-110 hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
        >
          <FaPlus className="h-4 w-4 text-white transition-transform group-hover:rotate-90" />
        </button>
      </div>
    </div>
  </div>
);

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
      <p className="mt-1 text-xs sm:text-sm text-gray-500">Fetching latest updates...</p>
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
        <h3 className="text-sm sm:text-base font-semibold text-gray-800">Something went wrong</h3>
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
          {t("moments_section.rety_btn")}
        </span>
      </button>
    </div>
  </div>
);



// Enhanced mobile floating action button
const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onClick,
}) => (
  <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 lg:hidden">
    <button
      onClick={onClick}
      className="group flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-600 shadow-2xl transition-all duration-300 hover:shadow-3xl hover:scale-110 hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-400/50 active:scale-95"
      aria-label="Add new moment"
    >
      <FaPlus className="h-4 w-4 sm:h-5 sm:w-5 text-white transition-transform group-hover:rotate-90" />
    </button>
  </div>
);



const MainMoments: React.FC = () => {
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);

  const { data, isLoading, error, refetch } = useGetMomentsQuery({
    page: currentPage,
    limit: limit,
  });

  const userId = useSelector(
    (state: RootState) => state.auth.userInfo?.user._id
  );
  const userInfo = useSelector((state: RootState) => state.auth.userInfo);
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Memoize user data with proper typing
  const { userName, userImage } = useMemo(
    () => ({
      userName: userInfo?.user.name || "User",
      userImage:
        userInfo?.user.imageUrls?.[0] ||
        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face",
    }),
    [userInfo]
  );

  // Extract moments and pagination from response
  const { moments, pagination } = useMemo(() => {
    if (!data) {
      return {
        moments: [] as MomentType[],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalMoments: 0,
          limit: 10,
          hasNextPage: false,
          hasPrevPage: false,
          nextPage: null,
          prevPage: null,
        },
      };
    }

    if (Array.isArray(data)) {
      return {
        moments: data as MomentType[],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalMoments: data.length,
          limit: data.length,
          hasNextPage: false,
          hasPrevPage: false,
          nextPage: null,
          prevPage: null,
        },
      };
    } else {
      const response = data as MomentsResponse;
      return {
        moments: response.moments || [],
        pagination: response.pagination || {
          currentPage: 1,
          totalPages: 0,
          totalMoments: 0,
          limit: 10,
          hasNextPage: false,
          hasPrevPage: false,
          nextPage: null,
          prevPage: null,
        },
      };
    }
  }, [data]);

  // Callback for adding a new moment
  const handleAddMoment = useCallback(() => {
    navigate("/add-moment");
  }, [navigate]);

  // Handle page change
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    // Scroll to top when changing pages
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Reset to page 1 when refetching
  const handleRefetch = useCallback(() => {
    setCurrentPage(1);
    refetch();
  }, [refetch]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
      {/* Mobile-optimized container */}
      <div className="mx-auto max-w-2xl px-2 sm:px-4 py-3 sm:py-6 lg:px-6">
        {/* Main container with glassmorphism effect */}
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white/60 backdrop-blur-xl border border-white/30 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>

          <div className="relative">
            {/* Create post area */}
            <div className="p-3 sm:p-4 lg:p-6">
              <CreatePostCard
                userImage={userImage}
                userName={userName}
                handleAddMoment={handleAddMoment}
                t={t}
              />
            </div>

            <div className="px-3 sm:px-4 lg:px-6">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3 sm:mb-4">Stories list</h1>
            </div>

            {/* Content states */}
            {isLoading ? (
              <LoadingState t={t} />
            ) : error ? (
              <ErrorState t={t} refetch={handleRefetch} />
            ) : moments.length > 0 ? (
              <>
                <div className="space-y-3 sm:space-y-6 px-2 sm:px-4 pb-4 sm:pb-6 lg:px-6">
                  {moments.map((moment, index) => (
                    <div
                      key={moment._id}
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
                          commentCount={moment.comments}
                          user={moment.user}
                          likedUsers={moment.likedUsers}
                          imageUrls={moment.imageUrls}
                          createdAt={moment.createdAt}
                          refetch={refetch}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination component */}
                <Pagination
                  currentPage={pagination.currentPage}
                  totalPages={pagination.totalPages}
                  onPageChange={handlePageChange}
                  hasNextPage={pagination.hasNextPage}
                  hasPrevPage={pagination.hasPrevPage}
                  totalMoments={pagination.totalMoments}
                  isLoading={isLoading}
                />
              </>
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
