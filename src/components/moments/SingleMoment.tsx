import React, { useState, useEffect } from "react";
import { Button, Card, ListGroup, ListGroupItem, Image } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { AiFillLike, AiOutlineLike } from "react-icons/ai";
import { FaComments, FaRegComments } from "react-icons/fa";
import { IoMdShare } from "react-icons/io";
import {
  useDislikeMomentMutation,
  useLikeMomentMutation,
} from "../../store/slices/momentsSlice";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { MomentType } from "./types";

const SingleMoment: React.FC<MomentType> = ({
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
  const [liked, setLiked] = useState(false);
  const navigate = useNavigate();

  const [likeMoment] = useLikeMomentMutation();
  const [dislikeMoment] = useDislikeMomentMutation();

  useEffect(() => {
    if (likedUsers.includes(userId)) {
      setLiked(true);
    }
  }, [likedUsers, userId]);

  const toggleLike = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!userId) {
      toast.error("Please login first");
      navigate("/login");
      return;
    }

    if (liked) {
      await dislikeMoment({ momentId: _id, userId });
    } else {
      await likeMoment({ momentId: _id, userId });
    }
    setLiked(!liked);
    refetch && refetch();
  };

  return (
    <Card className="my-3 rounded shadow-sm overflow-hidden border-0">
      <ListGroup variant="flush">
        {/* User Info */}
        <ListGroupItem className="d-flex align-items-center bg-white border-0 p-3">
          <Link
            to={`/community/${user._id}`}
            className="d-flex align-items-center text-decoration-none text-dark"
          >
            <Image
              src={user?.imageUrls?.[0] || "https://via.placeholder.com/50"}
              roundedCircle
              style={{ width: "45px", height: "45px", objectFit: "cover" }}
              className="me-2"
            />
            <div>
              <div className="fw-semibold">{user.name}</div>
              <small className="text-muted">
                {new Date(createdAt).toLocaleString()}
              </small>
            </div>
          </Link>
        </ListGroupItem>

        {/* Moment Content */}
        <ListGroupItem className="bg-white border-0 p-3 pt-0">
          <Link
            to={`/moment/${_id}`}
            className="text-decoration-none text-dark"
          >
            <div className="mb-2">
              <h5 className="mb-1 fw-bold">{title}</h5>
              <p className="mb-0">{description}</p>
            </div>

            {/* Moment Image if exists */}
            {imageUrls && imageUrls.length > 0 && (
              <div className="mt-2">
                <Image
                  src={imageUrls[0]}
                  alt={title}
                  fluid
                  rounded
                  style={{
                    width: "100%",
                    height: "250px",
                    objectFit: "cover",
                  }}
                />
              </div>
            )}
          </Link>
        </ListGroupItem>

        {/* Interaction Buttons */}
        <ListGroupItem className="d-flex justify-content-around align-items-center bg-white border-0 p-2 pt-0">
          <Button
            variant="link"
            className="text-dark text-decoration-none d-flex align-items-center gap-1 p-0"
            onClick={toggleLike}
          >
            {liked ? (
              <AiFillLike className="text-primary" size={22} />
            ) : (
              <AiOutlineLike size={22} />
            )}
            <small>{likeCount}</small>
          </Button>
          <Link
            to={`/moment/${_id}`}
            className="text-dark text-decoration-none d-flex align-items-center gap-1"
          >
            {commentCount !== 0 ? (
              <FaComments size={22} />
            ) : (
              <FaRegComments size={22} />
            )}
            <small>{commentCount}</small>
          </Link>
          <Button
            variant="link"
            className="text-dark text-decoration-none d-flex align-items-center gap-1 p-0"
          >
            <IoMdShare size={22} />
            <small>Share</small>
          </Button>
        </ListGroupItem>
      </ListGroup>
    </Card>
  );
};

export default SingleMoment;
