import React, { useState, useEffect } from "react";
import { Card, Image, Button, Badge, OverlayTrigger, Tooltip } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { 
  AiFillLike, 
  AiOutlineLike, 
  AiOutlineComment, 
  AiOutlineShareAlt 
} from "react-icons/ai";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import moment from 'moment'

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
  const userId = useSelector((state: any) => state.auth.userInfo?.user._id);
  const [liked, setLiked] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setLiked(userId ? likedUsers.includes(userId) : false);
  }, [likedUsers, userId]);

  const handleLikeToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!userId) {
      toast.error("Please login to like moments");
      navigate("/login");
      return;
    }

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      setLiked(!liked);
      if (refetch) refetch();
    } catch (error) {
      toast.error("Failed to update like status");
    }
  };

  const formatDate = (dateString: string): string => {
    return moment(dateString).fromNow();
  };

  const defaultProfileImage = "https://cdn.pixabay.com/photo/2015/10/05/22/37/blank-profile-picture-973460_1280.png";

  return (
    <Card 
      className="mb-4 border-0 shadow-sm rounded-lg overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        transform: isHovered ? "translateY(-2px)" : "none",
        boxShadow: isHovered ? "0 10px 20px rgba(0,0,0,0.1)" : "0 2px 8px rgba(0,0,0,0.05)"
      }}
    >
      {/* Header with user info */}
      <div className="d-flex align-items-center p-3 border-bottom">
        <Link to={`/community/${user._id}`} className="d-flex align-items-center text-decoration-none">
          <Image
            src={user?.imageUrls?.[0] || defaultProfileImage}
            roundedCircle
            width={40}
            height={40}
            className="border object-cover me-3"
            style={{ objectFit: "cover" }}
          />
          <div>
            <h6 className="mb-0 fw-bold text-dark">{user.name}</h6>
            <small className="text-muted">{formatDate(createdAt)}</small>
          </div>
        </Link>
      </div>

      {/* Content */}
      <Link to={`/moment/${_id}`} className="text-decoration-none text-dark">
        <div className="p-3">
          <h5 className="fw-bold mb-2">{title}</h5>
          <p className="text-muted mb-3">{description}</p>

          {imageUrls && imageUrls.length > 0 && (
            <div className="rounded-lg overflow-hidden mb-3">
              <Image
                src={imageUrls[0]}
                alt={title}
                fluid
                className="w-100"
                style={{
                  height: "300px",
                  objectFit: "cover",
                  transition: "transform 0.3s ease",
                  transform: isHovered ? "scale(1.02)" : "scale(1)"
                }}
              />
            </div>
          )}
        </div>
      </Link>

      {/* Stats */}
      <div className="px-3 py-2 border-top d-flex justify-content-between align-items-center">
        <div>
          {likeCount > 0 && (
            <Badge pill bg="light" text="primary" className="me-2">
              <AiFillLike className="me-1" /> {likeCount}
            </Badge>
          )}
          {commentCount > 0 && (
            <Badge pill bg="light" text="dark">
              {commentCount} comments
            </Badge>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="d-flex border-top">
        <OverlayTrigger
          placement="top"
          overlay={<Tooltip>{liked ? "Unlike" : "Like"}</Tooltip>}
        >
          <Button
            variant="light"
            className="flex-grow-1 d-flex justify-content-center align-items-center border-0 py-2 bg-hover-light"
            onClick={handleLikeToggle}
          >
            {liked ? (
              <AiFillLike className="text-primary me-2" size={18} />
            ) : (
              <AiOutlineLike className="me-2" size={18} />
            )}
            <span className={liked ? "text-primary fw-medium" : ""}>Like</span>
          </Button>
        </OverlayTrigger>

        <OverlayTrigger placement="top" overlay={<Tooltip>Comment</Tooltip>}>
          <Link
            to={`/moment/${_id}`}
            className="btn btn-light flex-grow-1 d-flex justify-content-center align-items-center border-0 py-2 text-decoration-none text-dark bg-hover-light"
          >
            <AiOutlineComment className="me-2" size={18} />
            <span>Comment</span>
          </Link>
        </OverlayTrigger>

        <OverlayTrigger placement="top" overlay={<Tooltip>Share</Tooltip>}>
          <Button
            variant="light"
            className="flex-grow-1 d-flex justify-content-center align-items-center border-0 py-2 bg-hover-light"
          >
            <AiOutlineShareAlt className="me-2" size={18} />
            <span>Share</span>
          </Button>
        </OverlayTrigger>
      </div>
    </Card>
  );
};

export default SingleMoment;