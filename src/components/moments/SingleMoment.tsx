import React, { useState } from "react";
import { Button, Card, ListGroup, ListGroupItem, Image } from "react-bootstrap";

import { Link, useNavigate } from "react-router-dom";
import { AiFillLike, AiOutlineLike } from "react-icons/ai";
import { FaComments, FaRegComment, FaRegComments } from "react-icons/fa";
import { IoMdShare } from "react-icons/io";
import "./SingleMoment.css";
import {
  useDislikeMomentMutation,
  useLikeMomentMutation,
} from "../../store/slices/momentsSlice";
import { useSelector } from "react-redux";
import { useGetCommentsQuery } from "../../store/slices/comments";
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
    e.preventDefault(); // Prevents the Link from triggering on button click
    if (liked) {
      await dislikeMoment({ momentId: _id, userId });
      // Call the dislike mutation
    } else {
      await likeMoment({ momentId: _id, userId }); // Call the like mutation
    }
    setLiked(!liked); // Toggle the liked state
    refetch && refetch(); // Call refetch to update the moments list
  };

  return (
    <Link to={`/moment/${_id}`}>
      <Card className="my-3 p-4 rounded shadow-sm post-card">
        <ListGroup variant="flush">
          <Link to={`/community/${user._id}`}>
            <Card className="card-header">
              <ListGroupItem className="d-flex align-items-center">
                <Image
                  src={
                    user?.imageUrls?.length > 0
                      ? user.imageUrls[0]
                      : "https://via.placeholder.com/50"
                  }
                  roundedCircle
                  className="profile-pic"
                />

                <div className="ms-3">
                  <h6 className="mb-0">{user.name}</h6>
                  <small className="text-muted">
                    {new Date(createdAt).toLocaleString()}
                  </small>
                </div>
              </ListGroupItem>
            </Card>
          </Link>
          {imageUrls.length > 0 && (
            <Card.Img
              variant="top"
              src={imageUrls[0]}
              alt={title}
              className="post-image"
            />
          )}
          <Card.Body>
            <Card.Title>{title}</Card.Title>
            <Card.Text>{description}</Card.Text>
          </Card.Body>
          <ListGroupItem className="d-flex justify-content-between">
            <Button variant="link" className="text-dark" onClick={toggleLike}>
              {likedUsers.includes(userId) ? (
                <AiFillLike className="icon" size={24} />
              ) : (
                <AiOutlineLike className="icon" size={24} />
              )}{" "}
              {likeCount}
            </Button>
            <Button variant="link" className="text-dark">
              <span className="commentCount" style={{ padding: '5px' }}> {commentCount.toString()}</span>
              {commentCount !== 0 ? (
                <>
                  <FaComments className="comment-icon" size={24} />
                </>
              ) : (
                <>
                  <FaRegComments className="comment-icon-empty" size={24} />
                </>
              )}
            </Button>
            <Button variant="link" className="text-dark">
              <IoMdShare className="icon" />
            </Button>
          </ListGroupItem>
        </ListGroup>
      </Card>
    </Link>
  );
};

export default SingleMoment;
