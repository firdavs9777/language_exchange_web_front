import React, { useEffect, useState, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { Bounce, toast } from "react-toastify";
import { AiFillLike, AiOutlineLike } from "react-icons/ai";
import {
  FaComments,
  FaRegComments,
  FaArrowLeft,
  FaPaperPlane,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import { IoMdShare } from "react-icons/io";

// API hooks
import {
  useDislikeMomentMutation,
  useGetMomentDetailsQuery,
  useLikeMomentMutation,
} from "../../store/slices/momentsSlice";
import {
  useAddCommentMutation,
  useGetCommentsQuery,
} from "../../store/slices/comments";

// Types
interface User {
  _id: string;
  name: string;
  imageUrls: string[];
}

interface MomentDetails {
  _id: string;
  title: string;
  description: string;
  likedUsers: string[];
  likeCount: number;
  imageUrls: string[];
  createdAt: string;
  user: User;
}

interface Comment {
  _id: string;
  text: string;
  user: User;
  createdAt: string;
}

interface CommentResponse {
  data: Comment[];
}

interface MomentResponse {
  data: MomentDetails;
}

// Helper components
const TimeAgo: React.FC<{ date: string }> = ({ date }) => {
  const { t } = useTranslation();

  const calculateTimeAgo = () => {
    const now = new Date();
    const past = new Date(date);
    const diff = now.getTime() - past.getTime();

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return t("moments_section.timeAgo.justNow");
    if (minutes < 60)
      return t("moments_section.timeAgo.minutesAgo", { minutes });
    if (hours < 24) return t("moments_section.timeAgo.hoursAgo", { hours });
    if (days < 7) return t("moments_section.timeAgo.daysAgo", { days });
    return new Date(date).toLocaleDateString();
  };

  return <span className="text-xs text-gray-500">{calculateTimeAgo()}</span>;
};

const CommentItem: React.FC<{ comment: Comment; index: number }> = ({
  comment,
  index,
}) => {
  return (
    <div className="flex gap-3 py-3 px-2 hover:bg-gray-50/50 rounded-xl transition-all duration-200">
      <div className="flex-shrink-0">
        <div className="relative">
          <img
            src={comment.user.imageUrls[0] || "/default-avatar.png"}
            alt={comment.user.name}
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover ring-2 ring-white shadow-sm"
          />
          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border border-white"></div>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="bg-gray-50 rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-semibold text-gray-800 text-sm truncate pr-2">
              {comment.user.name}
            </h4>
            <TimeAgo date={comment.createdAt} />
          </div>
          <p className="text-gray-700 text-sm leading-relaxed break-words">
            {comment.text}
          </p>
        </div>
      </div>
    </div>
  );
};

const ImageCarousel: React.FC<{ images: string[]; title?: string }> = ({
  images,
  title,
}) => {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  if (images.length === 0) return null;

  return (
    <div className="relative bg-gray-900 overflow-hidden">
      <div className="relative aspect-video max-h-96">
        <img
          src={images[currentIndex]}
          alt={`${title || t("moments_section.title")} - ${currentIndex + 1}`}
          className="w-full h-full object-contain"
        />

        {/* Navigation buttons */}
        {images.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
              aria-label="Previous image"
            >
              <FaChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
              aria-label="Next image"
            >
              <FaChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Indicators */}
        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentIndex ? "bg-white" : "bg-white/50"
                }`}
                aria-label={`Go to image ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const LoadingSpinner: React.FC<{ message?: string }> = ({ message }) => (
  <div className="flex flex-col items-center justify-center py-16">
    <div className="relative">
      <div className="w-12 h-12 border-4 border-gray-200 rounded-full animate-spin"></div>
      <div className="absolute top-0 left-0 w-12 h-12 border-4 border-transparent border-t-blue-500 rounded-full animate-spin"></div>
    </div>
    {message && <p className="mt-4 text-gray-600 font-medium">{message}</p>}
  </div>
);

const MomentDetail: React.FC = () => {
  const { t } = useTranslation();
  const { id: momentId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // User data
  const { userInfo } = useSelector((state: any) => state.auth);
  const userId = userInfo?.user?._id;

  // State
  const [newComment, setNewComment] = useState("");

  // API hooks
  const {
    data: momentData,
    isLoading: isLoadingMoment,
    refetch: refetchMomentDetails,
  } = useGetMomentDetailsQuery(momentId || "");

  const [likeMoment] = useLikeMomentMutation();
  const [dislikeMoment] = useDislikeMomentMutation();
  const [addComment, { isLoading: isAddingComment }] = useAddCommentMutation();

  const {
    data: commentsData,
    isLoading: isLoadingComments,
    refetch: refetchComments,
  } = useGetCommentsQuery(momentId || "");

  // Data
  const momentDetails = (momentData as MomentResponse)?.data;
  const commentsList = (commentsData as CommentResponse)?.data || [];
  const isLiked = momentDetails?.likedUsers.includes(userId || "");
  const formattedDate = momentDetails
    ? new Date(momentDetails.createdAt).toLocaleString()
    : "";

  // Effects
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [momentId]);

  // Handlers
  const handleGoBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleLikeToggle = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      if (!userId) {
        toast.error(t("moments_section.pleaseLoginFirst"), {
          autoClose: 3000,
          hideProgressBar: false,
          theme: "dark",
          transition: Bounce,
        });
        return;
      }
      if (!momentId || !momentDetails) return;

      try {
        if (isLiked) {
          await dislikeMoment({ momentId, userId }).unwrap();
          toast.info(t("moments_section.removedLike"), {
            autoClose: 3000,
            hideProgressBar: false,
            theme: "dark",
            transition: Bounce,
          });
        } else {
          await likeMoment({ momentId, userId }).unwrap();
          toast.success(t("moments_section.likedMoment"), {
            autoClose: 3000,
            hideProgressBar: false,
            theme: "dark",
            transition: Bounce,
          });
        }
        refetchMomentDetails();
      } catch (error) {
        toast.error(t("moments_section.failedToUpdateLike"), {
          autoClose: 3000,
          hideProgressBar: false,
          theme: "dark",
          transition: Bounce,
        });
      }
    },
    [momentId, userId, isLiked, refetchMomentDetails, t]
  );

  const handleCommentSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newComment.trim()) {
        toast.error(t("moments_section.emptyCommentError"), {
          autoClose: 3000,
          hideProgressBar: false,
          theme: "dark",
          transition: Bounce,
        });
        return;
      }
      if (!momentId) return;

      try {
        await addComment({ momentId, newComment }).unwrap();
        toast.success(t("moments_section.commentAdded"), {
          autoClose: 3000,
          hideProgressBar: false,
          theme: "dark",
          transition: Bounce,
        });
        refetchComments();
        setNewComment("");
      } catch (error) {
        toast.error(t("moments_section.failedToAddComment"), {
          autoClose: 3000,
          hideProgressBar: false,
          theme: "dark",
          transition: Bounce,
        });
      }
    },
    [newComment, momentId, addComment, refetchComments, t]
  );

  // Loading states
  if (!momentId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 flex items-center justify-center px-4">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center max-w-md">
          <h3 className="text-red-800 font-semibold">
            {t("moments_section.invalidMomentId")}
          </h3>
        </div>
      </div>
    );
  }

  if (isLoadingMoment) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
        <LoadingSpinner message={t("moments_section.loadingMoment")} />
      </div>
    );
  }

  if (!momentDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 flex items-center justify-center px-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 text-center max-w-md">
          <h3 className="text-yellow-800 font-semibold mb-4">
            {t("moments_section.noDetailsFound")}
          </h3>
          <button
            onClick={handleGoBack}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400/50"
          >
            <FaArrowLeft className="w-4 h-4" />
            {t("moments_section.goBack")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
      {/* Navigation Header */}
      <div className="sticky top-0 z-40 bg-white/90 backdrop-blur-lg border-b border-gray-200/50 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <button
              onClick={handleGoBack}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400/50"
              aria-label={t("moments_section.goBack")}
            >
              <FaArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-lg font-semibold text-gray-800 truncate flex-1">
              {t("moments_section.momentDetails")}
            </h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-white/30 overflow-hidden">
          {/* Author Header */}
          <div className="flex items-center gap-4 p-4 sm:p-6 border-b border-gray-100/80">
            <div className="relative">
              <div className="p-0.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-600">
                <img
                  src={momentDetails.user.imageUrls[0] || "/default-avatar.png"}
                  alt={momentDetails.user.name}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover bg-white border-2 border-white"
                />
              </div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 sm:w-4 sm:h-4 bg-gradient-to-r from-green-400 to-green-500 rounded-full border-2 border-white"></div>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-gray-800 text-sm sm:text-base truncate">
                {momentDetails.user.name}
              </h2>
              <p className="text-xs sm:text-sm text-gray-500">
                {formattedDate}
              </p>
            </div>
          </div>

          {/* Moment Content */}
          <div className="p-4 sm:p-6">
            {momentDetails.title && (
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-3 sm:mb-4 leading-tight">
                {momentDetails.title}
              </h1>
            )}
            {momentDetails.description && (
              <p className="text-gray-700 text-sm sm:text-base leading-relaxed mb-4 sm:mb-6 whitespace-pre-wrap break-words">
                {momentDetails.description}
              </p>
            )}
          </div>

          {/* Images */}
          {momentDetails.imageUrls.length > 0 && (
            <ImageCarousel
              images={momentDetails.imageUrls}
              title={momentDetails.title}
            />
          )}

          {/* Stats */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-gray-50/80 border-y border-gray-100/80">
            <div className="flex items-center gap-4">
              {momentDetails.likeCount > 0 && (
                <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 bg-blue-100 rounded-full">
                  <AiFillLike className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" />
                  <span className="text-xs sm:text-sm font-medium text-blue-700">
                    {momentDetails.likeCount}
                  </span>
                </div>
              )}
            </div>
            <div>
              {commentsList.length > 0 && (
                <div className="px-2 sm:px-3 py-1 bg-gray-200 rounded-full">
                  <span className="text-xs sm:text-sm text-gray-600">
                    {t("moments_section.commentsCount", {
                      count: commentsList.length,
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex border-b border-gray-100/80">
            <button
              onClick={handleLikeToggle}
              className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-3 sm:py-4 transition-all duration-300 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-400/50 ${
                isLiked ? "text-blue-600 bg-blue-50" : "text-gray-600"
              }`}
            >
              {isLiked ? (
                <AiFillLike className="w-4 h-4 sm:w-5 sm:h-5 animate-pulse" />
              ) : (
                <AiOutlineLike className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
              <span className="font-medium text-xs sm:text-sm hidden sm:inline">
                {t("moments_section.likeButton")}
              </span>
            </button>

            <button
              onClick={() => document.getElementById("commentInput")?.focus()}
              className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-3 sm:py-4 text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
            >
              {commentsList.length > 0 ? (
                <FaComments className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              ) : (
                <FaRegComments className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              )}
              <span className="font-medium text-xs sm:text-sm hidden sm:inline">
                {t("moments_section.commentButton")}
              </span>
            </button>

            <button className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-3 sm:py-4 text-gray-600 hover:text-blue-600 hover:bg-blue-50 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-400/50">
              <IoMdShare className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="font-medium text-xs sm:text-sm hidden sm:inline">
                {t("moments_section.shareButton")}
              </span>
            </button>
          </div>

          {/* Comments Section */}
          <div className="p-4 sm:p-6">
            {isLoadingComments ? (
              <div className="text-center py-8">
                <LoadingSpinner
                  message={t("moments_section.loadingComments")}
                />
              </div>
            ) : (
              <>
                {/* Comment Form */}
                {userInfo ? (
                  <form onSubmit={handleCommentSubmit} className="mb-4 sm:mb-6">
                    <div className="relative">
                      <input
                        id="commentInput"
                        type="text"
                        placeholder={t(
                          "moments_section.writeCommentPlaceholder"
                        )}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        disabled={isAddingComment}
                        className="w-full px-3 py-2.5 sm:px-4 sm:py-3 pr-10 sm:pr-12 bg-gray-50 border border-gray-200 rounded-full text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400 transition-colors disabled:opacity-50"
                      />
                      {newComment.trim() && (
                        <button
                          type="submit"
                          disabled={isAddingComment}
                          className="absolute right-1.5 sm:right-2 top-1/2 -translate-y-1/2 w-7 h-7 sm:w-8 sm:h-8 bg-blue-500 text-white rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
                        >
                          {isAddingComment ? (
                            <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          ) : (
                            <FaPaperPlane className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                          )}
                        </button>
                      )}
                    </div>
                  </form>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 sm:p-4 text-center mb-4 sm:mb-6">
                    <p className="text-gray-600 text-sm sm:text-base">
                      {t("moments_section.signInToComment")}{" "}
                      <Link
                        to="/login"
                        className="text-blue-600 font-semibold hover:text-blue-700 transition-colors"
                      >
                        {t("moments_section.signIn")}
                      </Link>
                    </p>
                  </div>
                )}

                {/* Comments List - Scrollable */}
                {commentsList.length > 0 ? (
                  <div>
                    <h3 className="text-gray-700 font-semibold mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
                      <span>{t("moments_section.comments")}</span>
                      <span className="w-5 h-5 sm:w-6 sm:h-6 bg-gray-200 text-gray-600 rounded-full text-xs flex items-center justify-center">
                        {commentsList.length}
                      </span>
                    </h3>

                    {/* Scrollable Comments Container - Pure Tailwind */}
                    <div className="relative">
                      <div className="max-h-80 sm:max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400 rounded-xl">
                        <div className="space-y-1">
                          {commentsList.map((comment, index) => (
                            <div
                              key={comment._id}
                              className="transform transition-all duration-300 ease-out"
                              style={{
                                transitionDelay: `${index * 100}ms`,
                              }}
                            >
                              <CommentItem comment={comment} index={index} />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Scroll fade indicator using Tailwind gradients */}
                      {commentsList.length > 3 && (
                        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white via-white/90 to-transparent pointer-events-none rounded-b-xl"></div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 sm:py-12">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                      <FaRegComments className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" />
                    </div>
                    <p className="text-gray-500 font-medium text-sm sm:text-base">
                      {t("moments_section.noCommentsYet")}
                    </p>
                    <p className="text-gray-400 text-xs sm:text-sm mt-1">
                      Be the first to share your thoughts!
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MomentDetail;
