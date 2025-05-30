import React, { useState, useEffect, useCallback } from "react";
import { Card, Image, Button, Badge, OverlayTrigger, Tooltip } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { 
  AiFillLike, 
  AiOutlineLike, 
  AiOutlineComment, 
  AiOutlineShareAlt 
} from "react-icons/ai";
import { HiDotsHorizontal } from "react-icons/hi";
import { useSelector } from "react-redux";
import { Bounce, toast } from "react-toastify";
import moment from 'moment';
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
  const userId = useSelector((state: RootState) => state.auth.userInfo?.user._id);
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

  const handleLikeToggle = useCallback(async (e: React.MouseEvent) => {
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
    setCurrentLikeCount(prev => liked ? prev - 1 : prev + 1);

    try {
      // Simulate API call - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 300));
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
  }, [userId, liked, currentLikeCount, isLiking, t, navigate, refetch]);

  const handleShare = useCallback((e: React.MouseEvent) => {
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
      navigator.clipboard.writeText(`${window.location.origin}/moment/${_id}`);
      toast.success("Link copied to clipboard!", {
        autoClose: 2000,
        hideProgressBar: true,
        theme: "colored",
      });
    }
  }, [title, description, _id]);

  const formatDate = (dateString: string): string => {
    return moment(dateString).fromNow();
  };

  const defaultProfileImage = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face";

  return (
    <>
      {/* Custom CSS for modern effects */}
      <style>
        {`
          .moment-card {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            border: 1px solid rgba(0,0,0,0.06);
          }
          .moment-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 20px 40px rgba(0,0,0,0.1) !important;
            border-color: rgba(0,0,0,0.1);
          }
          .moment-image {
            transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .moment-card:hover .moment-image {
            transform: scale(1.02);
          }
          .action-btn {
            transition: all 0.2s ease;
            border: none !important;
            position: relative;
            overflow: hidden;
          }
          .action-btn:hover {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%) !important;
            transform: translateY(-1px);
          }
          .action-btn.liked {
            background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%) !important;
            color: #1976d2 !important;
          }
          .like-animation {
            animation: likeScale 0.3s ease;
          }
          @keyframes likeScale {
            0% { transform: scale(1); }
            50% { transform: scale(1.2); }
            100% { transform: scale(1); }
          }
          .profile-ring {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 2px;
            border-radius: 50%;
          }
          .content-fade {
            background: linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.8) 100%);
          }
        `}
      </style>

      <Card 
        className="moment-card border-0 rounded-4 overflow-hidden bg-white"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          boxShadow: isHovered 
            ? "0 20px 40px rgba(0,0,0,0.1)" 
            : "0 4px 20px rgba(0,0,0,0.08)"
        }}
      >
        {/* Header with user info */}
        <div className="d-flex align-items-center justify-content-between p-4 border-bottom border-light">
          <Link 
            to={`/community/${user._id}`} 
            className="d-flex align-items-center text-decoration-none flex-grow-1"
          >
            <div className="profile-ring me-3">
              <Image
                src={user?.imageUrls?.[0] || defaultProfileImage}
                roundedCircle
                width={44}
                height={44}
                className="bg-white"
                style={{ objectFit: "cover" }}
              />
            </div>
            <div className="flex-grow-1">
              <h6 className="mb-0 fw-bold text-dark">{user.name}</h6>
              <small className="text-muted d-flex align-items-center gap-1">
                <i className="fas fa-clock" style={{ fontSize: '10px' }}></i>
                {formatDate(createdAt)}
              </small>
            </div>
          </Link>
          
          <Button
            variant="light"
            size="sm"
            className="rounded-circle border-0 p-2"
            style={{ width: '36px', height: '36px' }}
          >
            <HiDotsHorizontal size={16} className="text-muted" />
          </Button>
        </div>

        {/* Content */}
        <Link to={`/moment/${_id}`} className="text-decoration-none text-dark">
          <div className="p-4 pb-3">
            <h5 className="fw-bold mb-3 lh-base" style={{ color: '#1a1a1a' }}>
              {title}
            </h5>
            <p className="text-muted mb-0 lh-base" style={{ fontSize: '0.95rem' }}>
              {description.length > 150 
                ? `${description.substring(0, 150)}...` 
                : description
              }
            </p>
          </div>

          {imageUrls && imageUrls.length > 0 && (
            <div className="position-relative overflow-hidden">
              <Image
                src={imageUrls[0]}
                alt={title}
                fluid
                className="w-100 moment-image"
                style={{
                  height: "320px",
                  objectFit: "cover",
                }}
              />
              {imageUrls.length > 1 && (
                <Badge 
                  bg="dark" 
                  className="position-absolute top-0 end-0 m-3 px-2 py-1 rounded-pill"
                  style={{ fontSize: '0.75rem' }}
                >
                  +{imageUrls.length - 1}
                </Badge>
              )}
            </div>
          )}
        </Link>

        {/* Stats Bar */}
        <div className="px-4 py-2 border-bottom border-light bg-light bg-opacity-50">
          <div className="d-flex justify-content-between align-items-center">
            <div className="d-flex align-items-center gap-3">
              {currentLikeCount > 0 && (
                <small className="text-muted d-flex align-items-center gap-1">
                  <AiFillLike className="text-primary" size={14} />
                  {currentLikeCount} {currentLikeCount === 1 ? 'like' : 'likes'}
                </small>
              )}
              {commentCount > 0 && (
                <small className="text-muted">
                  {commentCount} {commentCount === 1 ? 'comment' : 'comments'}
                </small>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="d-flex border-0">
          <OverlayTrigger
            placement="top"
            overlay={<Tooltip>{liked ? "Unlike" : "Like"}</Tooltip>}
          >
            <Button
              className={`action-btn flex-grow-1 d-flex justify-content-center align-items-center py-3 ${liked ? 'liked' : ''}`}
              onClick={handleLikeToggle}
              disabled={isLiking}
              style={{ 
                backgroundColor: liked ? '#e3f2fd' : 'transparent',
                color: liked ? '#1976d2' : '#6c757d'
              }}
            >
              <div className={liked && !isLiking ? 'like-animation' : ''}>
                {liked ? (
                  <AiFillLike className="me-2" size={18} />
                ) : (
                  <AiOutlineLike className="me-2" size={18} />
                )}
              </div>
              <span className="fw-medium" style={{ fontSize: '0.9rem' }}>
                {t('moments_section.moment_like')}
              </span>
            </Button>
          </OverlayTrigger>

          <OverlayTrigger 
            placement="top" 
            overlay={<Tooltip>{t('moments_section.moment_comment')}</Tooltip>}
          >
            <Link
              to={`/moment/${_id}`}
              className="action-btn btn flex-grow-1 d-flex justify-content-center align-items-center py-3 text-decoration-none"
              style={{ color: '#6c757d' }}
            >
              <AiOutlineComment className="me-2" size={18} />
              <span className="fw-medium" style={{ fontSize: '0.9rem' }}>
                {t('moments_section.moment_comment')}
              </span>
            </Link>
          </OverlayTrigger>

          <OverlayTrigger 
            placement="top" 
            overlay={<Tooltip>{t('moments_section.moment_share')}</Tooltip>}
          >
            <Button
              className="action-btn flex-grow-1 d-flex justify-content-center align-items-center py-3"
              onClick={handleShare}
              style={{ 
                backgroundColor: 'transparent',
                color: '#6c757d'
              }}
            >
              <AiOutlineShareAlt className="me-2" size={18} />
              <span className="fw-medium" style={{ fontSize: '0.9rem' }}>
                {t('moments_section.moment_share')}
              </span>
            </Button>
          </OverlayTrigger>
        </div>
      </Card>
    </>
  );
};

export default React.memo(SingleMoment);