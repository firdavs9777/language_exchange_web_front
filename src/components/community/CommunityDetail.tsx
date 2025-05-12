import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useGetCommunityDetailsQuery } from "../../store/slices/communitySlice";
import { useSelector } from "react-redux";
import {
  useFollowUserMutation,
  useUnFollowUserMutation,
} from "../../store/slices/usersSlice";
import { toast } from "react-toastify";
import Loader from "../Loader";
import "./CommunityDetail.css";
export interface SingleMember {
  data: {
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
  };
}

// Helper component for language display
const LanguagePair = ({ nativeLanguage, learningLanguage }) => {
  // Map common language codes to flag emojis
  const getLanguageFlag = (language) => {
    const flagMap = {
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
    <div className="language-exchange-pair">
      <div className="language native">
        <span className="language-flag">{getLanguageFlag(nativeLanguage)}</span>
        <span className="language-name">{nativeLanguage}</span>
      </div>
      <div className="language-arrow">→</div>
      <div className="language learning">
        <span className="language-flag">
          {getLanguageFlag(learningLanguage)}
        </span>
        <span className="language-name">{learningLanguage}</span>
      </div>
    </div>
  );
};

// Gallery component for user images
const ImageGallery = ({ images }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  if (!images || images.length === 0) {
    return (
      <div className="profile-image-container empty">
        <div className="profile-image-placeholder">
          <span>No image available</span>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-gallery">
      <div className="main-image-container">
        <img
          src={images[activeIndex] || "/images/default-avatar.jpg"}
          alt="Profile"
          className="main-profile-image"
          onError={(e) => {
            e.target.src = "/images/default-avatar.jpg";
          }}
        />
      </div>

      {images.length > 1 && (
        <div className="thumbnail-gallery">
          {images.map((image, index) => (
            <div
              key={index}
              className={`thumbnail ${activeIndex === index ? "active" : ""}`}
              onClick={() => setActiveIndex(index)}
            >
              <img
                src={image}
                alt={`Thumbnail ${index + 1}`}
                onError={(e) => {
                  e.target.src = "/images/default-avatar.jpg";
                }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Action button component
const ActionButton = ({
  icon,
  label,
  onClick,
  variant = "primary",
  isLoading = false,
  disabled = false,
}) => {
  return (
    <button
      className={`action-button ${variant} ${disabled ? "disabled" : ""}`}
      onClick={onClick}
      disabled={disabled || isLoading}
    >
      <span className="button-icon">{icon}</span>
      <span className="button-label">{isLoading ? `${label}...` : label}</span>
    </button>
  );
};

const CommunityDetail = () => {
  const { id: communityId } = useParams();
  const { data, isLoading, error, refetch } =
    useGetCommunityDetailsQuery(communityId);

  const navigate = useNavigate();
  const userId = useSelector((state) => state.auth.userInfo?.user._id);

  const [followUser, { isLoading: isFollowing }] = useFollowUserMutation({});
  const [unFollowUser, { isLoading: isUnfollowing }] =
    useUnFollowUserMutation();

  if (!communityId) {
    return (
      <div className="error-container">
        <div className="error-message">Invalid profile ID</div>
        <button className="back-button" onClick={() => navigate("/community")}>
          Back to Community
        </button>
      </div>
    );
  }

  const handleFollow = async (targetUser) => {
    try {
      if (!userId) {
        toast.error("You need to be logged in to follow users");
        return;
      }

      const response = await followUser({ userId, targetUserId: targetUser });

      if (response.error) {
        toast.error("Failed to follow user. Please try again.");
      } else {
        toast.success("Successfully followed!");
        await refetch();
      }
    } catch (error) {
      toast.error("An error occurred. Please try again.");
    }
  };

  const handleUnfollow = async (targetUser) => {
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

        if (response.error) {
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

  const handleStartChat = (memberId) => {
    navigate(`/chat/${memberId}`);
  };

  const handleCallUser = (memberName) => {
    toast.info(`Initiating call with ${memberName}...`);
    // Implement call functionality here
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <Loader />
        <p>Loading profile...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <div className="error-icon">⚠️</div>
        <h3>Oops! Something went wrong</h3>
        <p>We couldn't load this profile. Please try again later.</p>
        <button className="retry-button" onClick={refetch}>
          Try Again
        </button>
        <button className="back-button" onClick={() => navigate("/community")}>
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
      <div className="error-container">
        <div className="error-icon">🔍</div>
        <h3>Profile Not Found</h3>
        <p>This user profile doesn't exist or has been removed.</p>
        <button className="back-button" onClick={() => navigate("/community")}>
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

  return (
    <div className="tandem-profile-detail">
      <div className="profile-header">
        <button
          className="back-button"
          onClick={() => navigate("/communities")}
        >
          ← Back to Community
        </button>
      </div>

      <div className="profile-content">
        <div className="profile-left">
          <ImageGallery images={memberDetails.imageUrls} />

          <div className="profile-stats">
            <div className="stat-item">
              <span className="stat-value">
                {memberDetails.followers.length}
              </span>
              <span className="stat-label">Followers</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">
                {memberDetails.following.length}
              </span>
              <span className="stat-label">Following</span>
            </div>
          </div>

          <div className="profile-actions">
            {isFollowing ? (
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

        <div className="profile-right">
          <div className="profile-header-info">
            <h1 className="profile-name">{memberDetails.name}</h1>
            {userAge && <span className="profile-age">{userAge}</span>}
            {memberDetails.gender && (
              <span className="profile-gender">• {memberDetails.gender}</span>
            )}
          </div>

          <LanguagePair
            nativeLanguage={memberDetails.native_language || "Not specified"}
            learningLanguage={
              memberDetails.language_to_learn || "Not specified"
            }
          />

          <div className="profile-bio">
            <h2>About Me</h2>
            <p>{memberDetails.bio || "This user hasn't added a bio yet."}</p>
          </div>

          <div className="profile-meta">
            <div className="meta-item">
              <span className="meta-label">Member since:</span>
              <span className="meta-value">{memberSince}</span>
            </div>
          </div>

          <div className="profile-cta">
            <p>
              Want to practice languages with {memberDetails.name.split(" ")[0]}
              ?
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
  );
};

export default CommunityDetail;
