import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useGetCommunityDetailsQuery } from "../../store/slices/communitySlice";
import { useSelector } from "react-redux";
import {
  useFollowUserMutation,
  useUnFollowUserMutation,
} from "../../store/slices/usersSlice";
import { toast } from "react-toastify";
import Loader from "../Loader";
// No need to import custom CSS as we're using Bootstrap

// Improved TypeScript interfaces
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
}

interface ActionButtonProps {
  icon: string;
  label: string;
  onClick: () => void;
  variant?: string;
  isLoading?: boolean;
  disabled?: boolean;
}

// Helper component for language display using Bootstrap classes
const LanguagePair: React.FC<LanguagePairProps> = ({ nativeLanguage, learningLanguage }) => {
  // Map common language codes to flag emojis
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
      // Add more as needed
    };

    return flagMap[language] || "🌐";
  };

  return (
    <div className="bg-light p-3 rounded mb-3 border-start border-4 border-primary">
      <div className="d-flex align-items-center">
        <div className="me-3">
          <span className="fs-5 me-2">{getLanguageFlag(nativeLanguage)}</span>
          <span>{nativeLanguage}</span>
        </div>
        <div className="mx-3 text-muted">→</div>
        <div>
          <span className="fs-5 me-2">{getLanguageFlag(learningLanguage)}</span>
          <span>{learningLanguage}</span>
        </div>
      </div>
    </div>
  );
};

// Gallery component for user images using Bootstrap
const ImageGallery: React.FC<ImageGalleryProps> = ({ images }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="bg-light rounded d-flex align-items-center justify-content-center" style={{ height: "350px" }}>
        <div className="text-muted">No image available</div>
      </div>
    );
  }

  return (
    <div>
      <div className="rounded overflow-hidden mb-3 shadow-sm" style={{ height: "350px" }}>
        <img
          src={images[activeIndex] || "/images/default-avatar.jpg"}
          alt="Profile"
          className="w-100 h-100 object-fit-cover"
          style={{ objectFit: "cover" }}
         
        />
      </div>

      {images.length > 1 && (
        <div className="d-flex gap-2 overflow-auto pb-2">
          {images.map((image, index) => (
            <div
              key={index}
              className={`rounded overflow-hidden cursor-pointer ${activeIndex === index ? 'border border-2 border-primary' : 'opacity-75'}`}
              style={{ width: "60px", height: "60px", cursor: "pointer" }}
              onClick={() => setActiveIndex(index)}
            >
              <img
                src={image}
                alt={`Thumbnail ${index + 1}`}
                className="w-100 h-100"
                style={{ objectFit: "cover" }}
               
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Action button component using Bootstrap
const ActionButton: React.FC<ActionButtonProps> = ({
  icon,
  label,
  onClick,
  variant = "primary",
  isLoading = false,
  disabled = false,
}) => {
  // Map variant to Bootstrap button classes
  const getButtonClass = (variant: string): string => {
    const variantMap: Record<string, string> = {
      primary: "btn-primary",
      following: "btn-outline-secondary",
      message: "btn-success",
      call: "btn-warning text-white",
      "large-primary": "btn-primary btn-lg",
    };

    return variantMap[variant] || "btn-primary";
  };

  return (
    <button
      className={`btn ${getButtonClass(variant)} d-flex align-items-center justify-content-center gap-2 w-100`}
      onClick={onClick}
      disabled={disabled || isLoading}
      aria-label={label}
    >
      <span>{icon}</span>
      <span>{isLoading ? `${label}...` : label}</span>
    </button>
  );
};

const CommunityDetail: React.FC = () => {
  const { id: communityId } = useParams<{ id: string }>();
  const { data, isLoading, error, refetch } = useGetCommunityDetailsQuery(communityId);

  const navigate = useNavigate();
  const userId = useSelector((state: RootState) => state.auth.userInfo?.user._id);

  const [followUser, { isLoading: isFollowing }] = useFollowUserMutation();
  const [unFollowUser, { isLoading: isUnfollowing }] = useUnFollowUserMutation();

  // Scroll to top when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [communityId]);

  if (!communityId) {
    return (
      <div className="container py-5 text-center">
        <div className="alert alert-danger">Invalid profile ID</div>
        <button className="btn btn-outline-primary" onClick={() => navigate("/community")}>
          Back to Community
        </button>
      </div>
    );
  }

  const handleFollow = async (targetUser: string) => {
    try {
      if (!userId) {
        toast.error("You need to be logged in to follow users");
        return;
      }

      const response = await followUser({ userId, targetUserId: targetUser });

      if ('error' in response) {
        toast.error("Failed to follow user. Please try again.");
      } else {
        toast.success("Successfully followed!");
        await refetch();
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.");
    }
  };

  const handleUnfollow = async (targetUser: string) => {
    if (window.confirm("Are you sure you want to unfollow this user?")) {
      try {
        if (!userId) {
          toast.error("You need to be logged in to unfollow users");
          return;
        }

        const response = await unFollowUser({
          userId,
          targetUserId: targetUser,
        });

        if ('error' in response) {
          toast.error("Failed to unfollow user. Please try again.");
        } else {
          toast.success("Successfully unfollowed");
          await refetch();
        }
      } catch (error) {
        toast.error("An error occurred. Please try again.");
      }
    }
  };

  const handleStartChat = (memberId: string) => {
    navigate(`/chat/${memberId}`);
  };

  const handleCallUser = (memberName: string) => {
    toast.info(`Initiating call with ${memberName}...`);
    // Implement call functionality here
  };

  if (isLoading) {
    return (
      <div className="container py-5 text-center">
        <Loader />
        <p className="mt-3">Loading profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-5 text-center">
        <div className="display-1 mb-3">⚠️</div>
        <h3>Oops! Something went wrong</h3>
        <p className="text-muted mb-4">We couldn't load this profile. Please try again later.</p>
        <button className="btn btn-primary me-2" onClick={() => refetch()}>
          Try Again
        </button>
        <button className="btn btn-outline-secondary" onClick={() => navigate("/community")}>
          Back to Community
        </button>
      </div>
    );
  }

  // Ensure data is defined
  const member = data as SingleMember;
  const memberDetails = member?.data;

  if (!memberDetails) {
    return (
      <div className="container py-5 text-center">
        <div className="display-1 mb-3">🔍</div>
        <h3>Profile Not Found</h3>
        <p className="text-muted mb-4">This user profile doesn't exist or has been removed.</p>
        <button className="btn btn-outline-primary" onClick={() => navigate("/community")}>
          Back to Community
        </button>
      </div>
    );
  }

  const userAge = memberDetails.birth_year
    ? new Date().getFullYear() - parseInt(memberDetails.birth_year)
    : null;

  // Calculate member since date
  const memberSince = new Date(memberDetails.createdAt).toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "long",
    }
  );

  // Check if current user is following this member
  const isUserFollowing = memberDetails.followers.includes(userId || '');

  return (
    <div className="container py-4">
      <div className="mb-4">
        <button
          className="btn btn-link text-decoration-none p-0 fs-5"
          onClick={() => navigate("/communities")}
        >
          ← Back to Community
        </button>
      </div>

      <div className="card shadow-sm">
        <div className="row g-0">
          {/* Left column - Photos and actions */}
          <div className="col-md-4 border-end">
            <div className="p-4">
              <ImageGallery images={memberDetails.imageUrls} />

              <div className="d-flex justify-content-around py-3 border-top border-bottom my-3">
                <div className="text-center">
                  <div className="fw-bold fs-4">{memberDetails.followers.length}</div>
                  <div className="text-muted small">Followers</div>
                </div>
                <div className="text-center">
                  <div className="fw-bold fs-4">{memberDetails.following.length}</div>
                  <div className="text-muted small">Following</div>
                </div>
              </div>

              <div className="d-flex flex-column gap-2">
                {isUserFollowing ? (
                  <ActionButton
                    icon="👥"
                    label="Following"
                    variant="following"
                    onClick={() => handleUnfollow(memberDetails._id)}
                    isLoading={isUnfollowing}
                  />
                ) : (
                  <ActionButton
                    icon="➕"
                    label="Follow"
                    variant="primary"
                    onClick={() => handleFollow(memberDetails._id)}
                    isLoading={isFollowing}
                  />
                )}

                <ActionButton
                  icon="💬"
                  label="Message"
                  variant="message"
                  onClick={() => handleStartChat(memberDetails._id)}
                />

                <ActionButton
                  icon="📞"
                  label="Call"
                  variant="call"
                  onClick={() => handleCallUser(memberDetails.name)}
                />
              </div>
            </div>
          </div>

          {/* Right column - User details */}
          <div className="col-md-8">
            <div className="p-4">
              <div className="mb-2 d-flex align-items-baseline flex-wrap">
                <h1 className="fs-2 fw-bold me-3 mb-0">{memberDetails.name}</h1>
                {userAge && <span className="text-muted me-2">{userAge}</span>}
                {memberDetails.gender && (
                  <span className="text-muted">• {memberDetails.gender}</span>
                )}
              </div>

              <LanguagePair
                nativeLanguage={memberDetails.native_language || "Not specified"}
                learningLanguage={
                  memberDetails.language_to_learn || "Not specified"
                }
              />

              <div className="mb-4">
                <h2 className="fs-5 fw-semibold mb-2">About Me</h2>
                <p className="text-muted">{memberDetails.bio || "This user hasn't added a bio yet."}</p>
              </div>

              <div className="border-top pt-3 text-muted small mb-4">
                <div>
                  <span className="fw-medium">Member since:</span>
                  <span className="ms-2">{memberSince}</span>
                </div>
              </div>

              <div className="bg-light p-4 rounded text-center mt-4">
                <p className="mb-3">
                  Want to practice languages with {memberDetails.name.split(" ")[0]}?
                </p>
                <ActionButton
                  icon="💬"
                  label="Start Conversation"
                  variant="large-primary"
                  onClick={() => handleStartChat(memberDetails._id)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityDetail;