import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AiFillLike,
  AiOutlineLike,
  AiOutlineComment,
  AiOutlineShareAlt,
} from "react-icons/ai";
import { HiDotsHorizontal } from "react-icons/hi";
import { useSelector } from "react-redux";
import { Bounce, toast } from "react-toastify";
import moment from "moment";
import { useTranslation } from "react-i18next";

// TypeScript interfaces
interface User {
  _id: string;
  name: string;
  imageUrls?: string[];
}

interface MomentProps {
  _id: string;
  title: string;
  description: string;
  likeCount: number;
  likedUsers: string[];
  commentCount: number;
  createdAt: string;
  user: User;
  imageUrls?: string[];
  refetch?: () => void;
}

interface AuthState {
  userInfo?: {
    user: {
      _id: string;
    };
  };
}

interface RootState {
  auth: AuthState;
}

const SingleMoment: React.FC<MomentProps> = ({
  _id,
  title,
  description,
  likeCount,
  likedUsers,
  createdAt,
  user,
  commentCount,
  imageUrls,
  refetch,
}) => {
  const userId = useSelector(
    (state: RootState) => state.auth.userInfo?.user._id
  );
  const [liked, setLiked] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [currentLikeCount, setCurrentLikeCount] = useState<number>(likeCount);
  const [isLiking, setIsLiking] = useState<boolean>(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    setLiked(userId ? likedUsers.includes(userId) : false);
    setCurrentLikeCount(likeCount);
  }, [likedUsers, userId, likeCount]);

  const handleLikeToggle = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!userId) {
        toast.error(t("moment_login_error"), {
          autoClose: 3000,
          hideProgressBar: false,
          theme: "colored",
          transition: Bounce,
        });
        navigate("/login");
        return;
      }

      if (isLiking) return; // Prevent double clicks

      setIsLiking(true);
      const previousLiked = liked;
      const previousCount = currentLikeCount;

      // Optimistic update
      setLiked(!liked);
      setCurrentLikeCount((prev) => (liked ? prev - 1 : prev + 1));

      try {
        // Simulate API call - replace with actual API call
        await new Promise((resolve) => setTimeout(resolve, 300));
        if (refetch) refetch();
      } catch (error) {
        // Revert optimistic update on error
        setLiked(previousLiked);
        setCurrentLikeCount(previousCount);

        toast.error(t("moment_like_error"), {
          autoClose: 3000,
          hideProgressBar: false,
          theme: "colored",
          transition: Bounce,
        });
      } finally {
        setIsLiking(false);
      }
    },
    [userId, liked, currentLikeCount, isLiking, t, navigate, refetch]
  );

  const handleShare = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (navigator.share) {
        navigator.share({
          title: title,
          text: description,
          url: `${window.location.origin}/moment/${_id}`,
        });
      } else {
        // Fallback to clipboard
        navigator.clipboard.writeText(
          `${window.location.origin}/moment/${_id}`
        );
        toast.success("Link copied to clipboard!", {
          autoClose: 2000,
          hideProgressBar: true,
          theme: "colored",
        });
      }
    },
    [title, description, _id]
  );

  const formatDate = (dateString: string): string => {
    return moment(dateString).fromNow();
  };

  const defaultProfileImage =
    "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face";

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl bg-white/90 backdrop-blur-sm border border-white/30 shadow-lg transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:bg-white/95 ${
        isHovered ? "shadow-2xl -translate-y-1" : ""
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

      <div className="relative">
        {/* Header with user info */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100/80">
          <Link
            to={`/community/${user._id}`}
            className="flex items-center flex-1 group/user hover:opacity-80 transition-opacity duration-200"
          >
            <div className="relative">
              {/* Profile image with gradient ring */}
              <div className="relative p-0.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg group-hover/user:shadow-xl transition-shadow duration-300">
                <img
                  src={user?.imageUrls?.[0] || defaultProfileImage}
                  alt={user.name}
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover bg-white border-2 border-white transition-transform duration-300 group-hover/user:scale-105"
                />
              </div>
              {/* Online indicator */}
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-gradient-to-r from-green-400 to-green-500 rounded-full border-2 border-white shadow-sm"></div>
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <h3 className="font-bold text-gray-800 text-sm sm:text-base truncate group-hover/user:text-blue-600 transition-colors duration-200">
                {user.name}
              </h3>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <svg
                  className="w-3 h-3"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{formatDate(createdAt)}</span>
              </div>
            </div>
          </Link>

          <button className="group/more p-2 rounded-full hover:bg-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400/50">
            <HiDotsHorizontal className="w-4 h-4 text-gray-400 group-hover/more:text-gray-600 transition-colors" />
          </button>
        </div>

        {/* Content */}
        <Link to={`/moment/${_id}`} className="block group/content">
          <div className="px-4 sm:px-6 py-4">
            <h2 className="font-bold text-gray-900 text-lg sm:text-xl leading-tight mb-3 group-hover/content:text-blue-600 transition-colors duration-200">
              {title}
            </h2>
            <p className="text-gray-600 leading-relaxed text-sm sm:text-base">
              {description.length > 150
                ? `${description.substring(0, 150)}...`
                : description}
            </p>
          </div>

          {/* Image section */}
          {imageUrls && imageUrls.length > 0 && (
            <div className="relative overflow-hidden">
              <div className="relative">
                <img
                  src={imageUrls[0]}
                  alt={title}
                  className="w-full h-64 sm:h-80 object-cover transition-transform duration-700 group-hover/content:scale-105"
                />
                {/* Image overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 group-hover/content:opacity-100 transition-opacity duration-500"></div>

                {imageUrls.length > 1 && (
                  <div className="absolute top-3 right-3 px-3 py-1 bg-black/70 backdrop-blur-sm text-white text-xs font-medium rounded-full">
                    +{imageUrls.length - 1}
                  </div>
                )}
              </div>
            </div>
          )}
        </Link>

        {/* Stats Bar */}
        {(currentLikeCount > 0 || commentCount > 0) && (
          <div className="px-4 sm:px-6 py-3 bg-gray-50/80 border-t border-gray-100/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-gray-500">
                {currentLikeCount > 0 && (
                  <div className="flex items-center gap-1">
                    <AiFillLike className="w-4 h-4 text-blue-500" />
                    <span className="font-medium">
                      {currentLikeCount}{" "}
                      {currentLikeCount === 1 ? "like" : "likes"}
                    </span>
                  </div>
                )}
                {commentCount > 0 && (
                  <span className="font-medium">
                    {commentCount} {commentCount === 1 ? "comment" : "comments"}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex border-t border-gray-100/80">
          {/* Like Button */}
          <button
            onClick={handleLikeToggle}
            disabled={isLiking}
            className={`group/like flex-1 flex items-center justify-center py-3 sm:py-4 transition-all duration-300 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-400/50 disabled:opacity-50 ${
              liked
                ? "bg-blue-50 text-blue-600"
                : "text-gray-600 hover:text-blue-600"
            }`}
            title={liked ? "Unlike" : "Like"}
          >
            <div
              className={`flex items-center gap-2 ${
                liked && !isLiking ? "animate-pulse" : ""
              }`}
            >
              {liked ? (
                <AiFillLike className="w-5 h-5 transition-transform group-hover/like:scale-110" />
              ) : (
                <AiOutlineLike className="w-5 h-5 transition-transform group-hover/like:scale-110" />
              )}
              <span className="font-medium text-sm hidden sm:inline">
                {t("moments_section.moment_like")}
              </span>
            </div>
          </button>

          {/* Comment Button */}
          <Link
            to={`/moment/${_id}`}
            className="group/comment flex-1 flex items-center justify-center py-3 sm:py-4 text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
            title={t("moments_section.moment_comment")}
          >
            <div className="flex items-center gap-2">
              <AiOutlineComment className="w-5 h-5 transition-transform group-hover/comment:scale-110" />
              <span className="font-medium text-sm hidden sm:inline">
                {t("moments_section.moment_comment")}
              </span>
            </div>
          </Link>

          {/* Share Button */}
          <button
            onClick={handleShare}
            className="group/share flex-1 flex items-center justify-center py-3 sm:py-4 text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
            title={t("moments_section.moment_share")}
          >
            <div className="flex items-center gap-2">
              <AiOutlineShareAlt className="w-5 h-5 transition-transform group-hover/share:scale-110" />
              <span className="font-medium text-sm hidden sm:inline">
                {t("moments_section.moment_share")}
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(SingleMoment);
