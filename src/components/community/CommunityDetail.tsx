import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useGetCommunityDetailsQuery } from "../../store/slices/communitySlice";
import { useSelector } from "react-redux";
import {
  useFollowUserMutation,
  useUnFollowUserMutation,
} from "../../store/slices/usersSlice";
import { Bounce, toast } from "react-toastify";
import Loader from "../Loader";
import { useCreateChatRoomMutation } from "../../store/slices/chatSlice";
import { useTranslation } from "react-i18next";
import { AiFillProfile } from "react-icons/ai";
// Enhanced TypeScript interfaces
interface UserData {
  _id: string;
  name: string;
  gender: string;
  email: string;
  bio: string;
  birth_year: string;
  birth_month: string;
  birth_day: string;
  images: string[];
  native_language: string;
  language_to_learn: string;
  createdAt: string;
  followers: string[];
  following: string[];
  imageUrls: string[];
  __v: number;
}

interface SingleMember {
  data: UserData;
}

interface RootState {
  auth: {
    userInfo?: {
      user: {
        _id: string;
      };
    };
  };
}

interface LanguagePairProps {
  nativeLanguage: string;
  learningLanguage: string;
}

interface ImageGalleryProps {
  images: string[];
  userName: string;
}

interface ActionButtonProps {
  icon: string;
  label: string;
  onClick: () => void;
  variant?:
    | "primary"
    | "secondary"
    | "success"
    | "warning"
    | "following"
    | "outline";
  isLoading?: boolean;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
}

interface StatsCardProps {
  value: number;
  label: string;
}

// Modern Language Display Component
const LanguagePair: React.FC<LanguagePairProps> = ({
  nativeLanguage,
  learningLanguage,
}) => {
  const getLanguageFlag = (language: string): string => {
    const flagMap: Record<string, string> = {
      English: "🇺🇸",
      Spanish: "🇪🇸",
      French: "🇫🇷",
      German: "🇩🇪",
      Italian: "🇮🇹",
      Portuguese: "🇵🇹",
      Russian: "🇷🇺",
      Japanese: "🇯🇵",
      Korean: "🇰🇷",
      Chinese: "🇨🇳",
    };
    return flagMap[language] || "🌐";
  };

  return (
    <div className="d-flex align-items-center justify-content-center gap-4 p-4 bg-light rounded-4 mb-4">
      <div className="text-center">
        <div className="fs-2 mb-2">{getLanguageFlag(nativeLanguage)}</div>
        <div className="fw-medium text-dark">{nativeLanguage}</div>
        <div className="small text-muted">Speaks</div>
      </div>
      <div className="text-primary fs-4">⟷</div>
      <div className="text-center">
        <div className="fs-2 mb-2">{getLanguageFlag(learningLanguage)}</div>
        <div className="fw-medium text-dark">{learningLanguage}</div>
        <div className="small text-muted">Learning</div>
      </div>
    </div>
  );
};

// Modern Image Gallery Component
const ImageGallery: React.FC<ImageGalleryProps> = ({ images, userName }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const { t } = useTranslation();
  if (!images || images.length === 0) {
    return (
      <div
        className="bg-gradient rounded-4 d-flex align-items-center justify-content-center position-relative overflow-hidden"
        style={{
          height: "400px",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        }}
      >
        <div className="text-white text-center">
          <div className="fs-1 mb-2">
            <AiFillProfile />
          </div>
          <div className="fw-medium">
            {t("communityDetail.profile.noPhotos")}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="position-relative">
      <div
        className="rounded-4 overflow-hidden shadow-lg position-relative"
        style={{ height: "400px" }}
      >
        <img
          src={images[activeIndex] || "/images/default-avatar.jpg"}
          alt={`${userName}'s photo`}
          className="w-100 h-100 object-fit-cover"
          style={{ objectFit: "cover" }}
        />

        {images.length > 1 && (
          <div className="position-absolute bottom-0 start-0 end-0 p-3 bg-gradient-dark">
            <div className="d-flex justify-content-center gap-1">
              {images.map((_, index) => (
                <button
                  key={index}
                  className={`btn btn-sm rounded-circle p-0 ${
                    activeIndex === index ? "btn-light" : "btn-outline-light"
                  }`}
                  style={{ width: "8px", height: "8px" }}
                  onClick={() => setActiveIndex(index)}
                  aria-label={`View photo ${index + 1}`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {images.length > 1 && (
        <div className="d-flex gap-2 mt-3 overflow-auto pb-2">
          {images.map((image, index) => (
            <button
              key={index}
              className={`border-0 rounded-3 overflow-hidden p-0 ${
                activeIndex === index ? "ring ring-primary" : "opacity-75"
              }`}
              style={{
                width: "60px",
                height: "60px",
                boxShadow:
                  activeIndex === index
                    ? "0 0 0 2px var(--bs-primary)"
                    : "none",
              }}
              onClick={() => setActiveIndex(index)}
            >
              <img
                src={image}
                alt={`${userName}'s photo ${index + 1}`}
                className="w-100 h-100 object-fit-cover"
                style={{ objectFit: "cover" }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Modern Stats Card Component
const StatsCard: React.FC<StatsCardProps> = ({ value, label }) => (
  <div className="text-center p-3 bg-white rounded-3 shadow-sm">
    <div className="fs-4 fw-bold text-primary mb-1">{value}</div>
    <div className="small text-muted fw-medium">{label}</div>
  </div>
);

// Modern Action Button Component
const ActionButton: React.FC<ActionButtonProps> = ({
  icon,
  label,
  onClick,
  variant = "primary",
  isLoading = false,
  disabled = false,
  size = "md",
}) => {
  const getButtonClasses = (): string => {
    const baseClasses =
      "btn d-flex align-items-center justify-content-center gap-2 fw-medium rounded-3";
    const sizeClasses = {
      sm: "btn-sm",
      md: "",
      lg: "btn-lg",
    };

    const variantClasses = {
      primary: "btn-primary shadow-sm",
      secondary: "btn-secondary",
      success: "btn-success shadow-sm",
      warning: "btn-warning text-white shadow-sm",
      following: "btn-outline-primary",
      outline: "btn-outline-secondary",
    };

    return `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]}`;
  };

  return (
    <button
      className={`${getButtonClasses()} ${
        disabled || isLoading ? "disabled" : ""
      }`}
      onClick={onClick}
      disabled={disabled || isLoading}
      aria-label={label}
      style={{ minHeight: "44px" }}
    >
      <span className="fs-5">{icon}</span>
      <span>{isLoading ? `${label}...` : label}</span>
    </button>
  );
};

const CommunityDetail: React.FC = () => {
  const { id: communityId } = useParams<{ id: string }>();
  const { data, isLoading, error, refetch } =
    useGetCommunityDetailsQuery(communityId);
  const [createChatRoom, { isLoading: isCreatingChat }] =
    useCreateChatRoomMutation();

  const navigate = useNavigate();
  const userId = useSelector(
    (state: RootState) => state.auth.userInfo?.user._id
  );

  const [followUser, { isLoading: isFollowing }] = useFollowUserMutation();
  const [unFollowUser, { isLoading: isUnfollowing }] =
    useUnFollowUserMutation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [communityId]);

  if (!communityId) {
    return (
      <div className="container py-5 text-center">
        <div className="alert alert-danger rounded-4">Invalid profile ID</div>
        <button
          className="btn btn-outline-primary rounded-3"
          onClick={() => navigate("/community")}
        >
          Back to Community
        </button>
      </div>
    );
  }

  const handleFollow = async (targetUser: string): Promise<void> => {
    try {
      if (!userId) {
        toast.error("You need to be logged in to follow users", {
          autoClose: 3000,
          hideProgressBar: false,
          theme: "dark",
          transition: Bounce,
        });
        return;
      }

      const response = await followUser({ userId, targetUserId: targetUser });

      if ("error" in response) {
        toast.error("Failed to follow user. Please try again.", {
          autoClose: 3000,
          hideProgressBar: false,
          theme: "dark",
          transition: Bounce,
        });
      } else {
        toast.success("Successfully followed!", {
          autoClose: 3000,
          hideProgressBar: false,
          theme: "dark",
          transition: Bounce,
        });
        await refetch();
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.", {
        autoClose: 3000,
        hideProgressBar: false,
        theme: "dark",
        transition: Bounce,
      });
    }
  };

  const handleUnfollow = async (targetUser: string): Promise<void> => {
    if (window.confirm("Are you sure you want to unfollow this user?")) {
      try {
        if (!userId) {
          toast.error("You need to be logged in to unfollow users", {
            autoClose: 3000,
            hideProgressBar: false,
            theme: "dark",
            transition: Bounce,
          });
          return;
        }

        const response = await unFollowUser({
          userId,
          targetUserId: targetUser,
        });

        if ("error" in response) {
          toast.error("Failed to unfollow user. Please try again.", {
            autoClose: 3000,
            hideProgressBar: false,
            theme: "dark",
            transition: Bounce,
          });
        } else {
          toast.success("Successfully unfollowed", {
            autoClose: 3000,
            hideProgressBar: false,
            theme: "dark",
            transition: Bounce,
          });
          await refetch();
        }
      } catch (error) {
        toast.error("An error occurred. Please try again.", {
          autoClose: 3000,
          hideProgressBar: false,
          theme: "dark",
          transition: Bounce,
        });
      }
    }
  };

  const handleStartChat = async (memberId: string): Promise<void> => {
    try {
      if (!userId) {
        toast.error("You need to be logged in to start a chat", {
          autoClose: 3000,
          hideProgressBar: false,
          theme: "dark",
          transition: Bounce,
        });
        return;
      }

      const response = await createChatRoom(memberId).unwrap();

      if (response) {
        navigate(`/chat/${memberId}`);
      } else {
        navigate(`/chat`);
      }
    } catch (error) {
      toast.error("Failed to start chat. Please try again.", {
        autoClose: 3000,
        hideProgressBar: false,
        theme: "dark",
        transition: Bounce,
      });
      console.error("Chat creation error:", error);
      navigate(`/chat/${memberId}`);
    }
  };

  const handleCallUser = (memberName: string): void => {
    toast.info(`Initiating call with ${memberName}...`, {
      autoClose: 3000,
      hideProgressBar: false,
      theme: "dark",
      transition: Bounce,
    });
  };

  if (isLoading) {
    return (
      <div className="container py-5 text-center">
        <Loader />
        <p className="mt-3 text-muted">Loading profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-5 text-center">
        <div className="display-1 mb-3">⚠️</div>
        <h3 className="fw-bold">Oops! Something went wrong</h3>
        <p className="text-muted mb-4">
          We couldn't load this profile. Please try again later.
        </p>
        <div className="d-flex gap-3 justify-content-center">
          <button
            className="btn btn-primary rounded-3"
            onClick={() => refetch()}
          >
            Try Again
          </button>
          <button
            className="btn btn-outline-secondary rounded-3"
            onClick={() => navigate("/community")}
          >
            Back to Community
          </button>
        </div>
      </div>
    );
  }

  const member = data as SingleMember;
  const memberDetails = member?.data;

  if (!memberDetails) {
    return (
      <div className="container py-5 text-center">
        <div className="display-1 mb-3">🔍</div>
        <h3 className="fw-bold">Profile Not Found</h3>
        <p className="text-muted mb-4">
          This user profile doesn't exist or has been removed.
        </p>
        <button
          className="btn btn-outline-primary rounded-3"
          onClick={() => navigate("/community")}
        >
          Back to Community
        </button>
      </div>
    );
  }

  const userAge: number | null = memberDetails.birth_year
    ? new Date().getFullYear() - parseInt(memberDetails.birth_year)
    : null;

  const memberSince: string = new Date(
    memberDetails.createdAt
  ).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });

  const isUserFollowing: boolean = memberDetails.followers.includes(
    userId || ""
  );

  // Helper function to get first name safely
  const getFirstName = (fullName: string | undefined): string => {
    if (!fullName || typeof fullName !== "string") return "User";
    const parts = fullName.trim().split(" ");
    return parts[0] || "User";
  };

  const firstName = getFirstName(memberDetails.name);

  return (
    <div className="min-vh-100" style={{ backgroundColor: "#f8f9fa" }}>
      {/* Header */}
      <div className="bg-white border-bottom sticky-top">
        <div className="container py-3">
          <button
            className="btn btn-link text-decoration-none p-0 d-flex align-items-center gap-2"
            onClick={() => navigate("/communities")}
          >
            <span className="fs-5">←</span>
            <span className="fw-medium">Back to Community</span>
          </button>
        </div>
      </div>

      <div className="container py-4">
        <div className="row g-4">
          {/* Left Column - Photos and Quick Actions */}
          <div className="col-lg-4">
            <div className="bg-white rounded-4 p-4 shadow-sm h-100">
              <ImageGallery
                images={memberDetails.imageUrls || []}
                userName={memberDetails.name || "User"}
              />

              {/* Stats */}
              <div className="row g-2 my-4">
                <div className="col-6">
                  <StatsCard
                    value={memberDetails.followers?.length || 0}
                    label="Followers"
                  />
                </div>
                <div className="col-6">
                  <StatsCard
                    value={memberDetails.following?.length || 0}
                    label="Following"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="d-grid gap-2">
                {userId !== memberDetails._id && (
                  <>
                    {isUserFollowing ? (
                      <ActionButton
                        icon="✓"
                        label="Following"
                        variant="following"
                        onClick={() => handleUnfollow(memberDetails._id)}
                        isLoading={isUnfollowing}
                      />
                    ) : (
                      <ActionButton
                        icon="+"
                        label="Follow"
                        variant="primary"
                        onClick={() => handleFollow(memberDetails._id)}
                        isLoading={isFollowing}
                      />
                    )}

                    <ActionButton
                      icon="💬"
                      label="Start Chat"
                      variant="success"
                      onClick={() => handleStartChat(memberDetails._id)}
                      isLoading={isCreatingChat}
                    />

                    <ActionButton
                      icon="📞"
                      label="Video Call"
                      variant="warning"
                      onClick={() =>
                        handleCallUser(memberDetails.name || "User")
                      }
                    />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Profile Details */}
          <div className="col-lg-8">
            <div className="bg-white rounded-4 p-4 shadow-sm">
              {/* Header */}
              <div className="mb-4">
                <div className="d-flex align-items-baseline flex-wrap gap-3 mb-3">
                  <h1 className="display-6 fw-bold mb-0">
                    {memberDetails.name || "User"}
                  </h1>
                  {userAge && (
                    <span className="badge bg-light text-dark fs-6 fw-normal">
                      {userAge} years old
                    </span>
                  )}
                  {memberDetails.gender && (
                    <span className="badge bg-light text-dark fs-6 fw-normal">
                      {memberDetails.gender}
                    </span>
                  )}
                </div>

                <div className="small text-muted d-flex align-items-center gap-2">
                  <span>📅</span>
                  <span>Member since {memberSince}</span>
                </div>
              </div>

              {/* Languages */}
              <LanguagePair
                nativeLanguage={
                  memberDetails.native_language || "Not specified"
                }
                learningLanguage={
                  memberDetails.language_to_learn || "Not specified"
                }
              />

              {/* About Section */}
              <div className="mb-4">
                <h2 className="h5 fw-bold mb-3 d-flex align-items-center gap-2">
                  <span>💭</span>
                  About {firstName}
                </h2>
                <div className="bg-light rounded-3 p-4">
                  <p className="mb-0 lh-lg">
                    {memberDetails.bio && memberDetails.bio.trim()
                      ? memberDetails.bio
                      : `${firstName} hasn't added a bio yet. Start a conversation to learn more about them!`}
                  </p>
                </div>
              </div>

              {/* Call to Action */}
              {userId !== memberDetails._id && (
                <div className="bg-primary bg-opacity-10 rounded-4 p-4 text-center border border-primary border-opacity-25">
                  <div className="mb-3">
                    <span className="fs-2">🌟</span>
                  </div>
                  <h3 className="h5 fw-bold text-primary mb-2">
                    Ready to practice with {firstName}?
                  </h3>
                  <p className="text-muted mb-3">
                    Start chatting and improve your language skills together!
                  </p>
                  <ActionButton
                    icon="💬"
                    label="Start Conversation"
                    variant="primary"
                    size="lg"
                    onClick={() => handleStartChat(memberDetails._id)}
                    isLoading={isCreatingChat}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityDetail;
