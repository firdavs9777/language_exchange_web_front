import React, { useState } from "react";
import {
  Button,
  Card,
  ListGroup,
  ListGroupItem,
  Image,
  Row,
  Col,
} from "react-bootstrap";
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

  const toggleLike = async (e: React.MouseEvent) => {
    if (!userId) {
      toast.error("Please login first");
      navigate("/login");
      return;
    }
    e.preventDefault();
    if (liked) {
      await dislikeMoment({ momentId: _id, userId });
    } else {
      await likeMoment({ momentId: _id, userId });
    }
    setLiked(!liked);
    refetch && refetch();
  };

  return (
    <Link to={`/moment/${_id}`} className="text-decoration-none">
      <Card className="my-3 rounded shadow-sm overflow-hidden">
        <ListGroup variant="flush">
          <Link to={`/community/${user._id}`} className="text-decoration-none">
            <Card className="border-0 bg-transparent">
              <ListGroupItem className="d-flex align-items-center border-0 px-3 pt-3 pb-1 bg-transparent">
                <Image
                  src={
                    user?.imageUrls?.length > 0
                      ? user.imageUrls[0]
                      : "https://via.placeholder.com/50"
                  }
                  roundedCircle
                  className="me-3"
                  style={{ width: "40px", height: "40px", objectFit: "cover" }}
                />
                <div>
                  <h6 className="mb-0 text-dark fw-semibold">{user.name}</h6>
                  <small className="text-muted">
                    {new Date(createdAt).toLocaleString()}
                  </small>
                </div>
              </ListGroupItem>
            </Card>
          </Link>

          <Card.Body className="px-3 py-2">
            <Card.Title className="text-dark mb-2">{title}</Card.Title>
            <Card.Text className="text-dark mb-2">{description}</Card.Text>
          </Card.Body>

          {/* Image container that maintains consistent presence */}
          <div
            className="media-container px-3 pb-2"
            style={{ minHeight: "30px" }}
          >
            {imageUrls && imageUrls.length > 0 ? (
              <Image
                src={imageUrls[0]}
                alt={title}
                fluid
                className="rounded w-100"
                style={{ objectFit: "cover", maxHeight: "400px" }}
              />
            ) : null}
          </div>

          <ListGroupItem className="d-flex justify-content-between border-0 px-3 pb-3 pt-2">
            <Button
              variant="link"
              className="text-dark text-decoration-none p-0"
              onClick={toggleLike}
            >
              {likedUsers.includes(userId) ? (
                <AiFillLike className="text-primary me-1" size={20} />
              ) : (
                <AiOutlineLike className="me-1" size={20} />
              )}
              {likeCount}
            </Button>
            <Button
              variant="link"
              className="text-dark text-decoration-none p-0"
            >
              {commentCount !== 0 ? (
                <FaComments className="me-1" size={20} />
              ) : (
                <FaRegComments className="me-1" size={20} />
              )}
              {commentCount}
            </Button>
            <Button
              variant="link"
              className="text-dark text-decoration-none p-0"
            >
              <IoMdShare size={20} />
            </Button>
          </ListGroupItem>
        </ListGroup>
      </Card>
    </Link>
  );
};

export default SingleMoment;
