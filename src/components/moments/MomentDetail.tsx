import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  useDislikeMomentMutation,
  useGetMomentDetailsQuery,
  useLikeMomentMutation,
} from "../../store/slices/momentsSlice";
import {
  Card,
  Container,
  Row,
  Col,
  Image,
  Carousel,
  ListGroup,
  Form,
  Button,
} from "react-bootstrap";
import { AiFillLike, AiOutlineLike } from "react-icons/ai";
import { FaRegComment } from "react-icons/fa";
import { IoMdShare } from "react-icons/io";
import "./MomentDetails.css";
import {
  useAddCommentMutation,
  useGetCommentsQuery,
} from "../../store/slices/comments";
import { useSelector } from "react-redux";
import Message from "../Message";
import { toast } from "react-toastify";
interface UserType {
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
  __v: number;
  imageUrls: string[];
}

interface MomentType {
  _id: string;
  title: string;
  description: string;
  images: string[];
  likeCount: number;
  likedUsers: string[];
  user: UserType;
  createdAt: string;
  __v: number;
  imageUrls: string[];
}

interface Response {
  success: boolean;
  data: MomentType;
}

interface CommentType {
  _id: string;
  text: string;
  user: UserType;
  createdAt: string;
}

interface CommentResponse {
  success: boolean;
  count: number;
  data: CommentType[];
}

const MomentDetail = () => {
  const { id: momentId } = useParams();
  const {
    data,
    isLoading,
    refetch: refetchMomentDetails,
    error,
  } = useGetMomentDetailsQuery(momentId);
  const [newComment, setNewComment] = useState<string>("");
  const { userInfo } = useSelector((state: any) => state.auth);
  const userId = useSelector((state: any) => state.auth.userInfo?.user._id);
  const [likeMoment] = useLikeMomentMutation();
  const [dislikeMoment] = useDislikeMomentMutation();

  const [liked, setLiked] = useState(false);
  const [addComment, { isLoading: isAddingComment, error: addCommentError }] =
    useAddCommentMutation();

  const {
    data: commentsData,
    isLoading: isLoadingComments,
    refetch,
    error: commentError,
  } = useGetCommentsQuery(momentId);

  if (!momentId) {
    return <div>Invalid moment ID</div>;
  }

  if (isLoading) {
    return <div>Loading...</div>;
  }

  // if (error) {
  //   return <div>Error fetching moment details: {error.message}</div>;
  // }

  // Make sure to check if data is defined
  const moment = data as Response;

  // Optional chaining to avoid errors if data is undefined
  const momentDetails = moment?.data;

  if (!momentDetails) {
    return <div>No details found</div>;
  }
  // Handling comments data
  const comments = commentsData as CommentResponse;
  const commentsList = comments?.data || [];
  const handleCommentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setNewComment(event.target.value);
  };

  const handleCommentSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newComment.trim() === "") {
      toast.error("Please add comment text");
      return;
    }

    try {
      await addComment({ momentId, newComment }).unwrap();
      toast.success("Comment created successfully");
      refetch();
      setNewComment("");
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  const toggleLike = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevents the Link from triggering on button click
    if (momentDetails.likedUsers.includes(userId)) {
      await dislikeMoment({ momentId: momentDetails._id, userId });
      // Call the dislike mutation
    } else {
      await likeMoment({ momentId: momentDetails._id, userId }); // Call the like mutation
    }

    setLiked(momentDetails.likedUsers.includes(userId));
    refetchMomentDetails(); // Call refetch to update the moments list
  };

  return (
    <Container className="my-4">
      <Row className="justify-content-center">
        <Col md={8}>
          <Card className="post-card shadow-sm">
            <Card.Body>
              <Row className="align-items-center">
                <Col xs={2}>
                  <Image
                    src={
                      momentDetails.user.imageUrls[0] ||
                      "https://via.placeholder.com/50"
                    }
                    roundedCircle
                    fluid
                    className="profile-pic"
                  />
                </Col>
                <Col xs={3}>
                  <h6 className="mb-0">{momentDetails.user.name}</h6>
                  <small className="text-muted">
                    {new Date(momentDetails.createdAt).toLocaleString()}
                  </small>
                </Col>
              </Row>
              <hr />
              <Card.Text>
                <strong>{momentDetails.title}</strong>
              </Card.Text>
              <Card.Text>{momentDetails.description}</Card.Text>
              {momentDetails.imageUrls.length > 0 && (
                <Carousel className="post-image-carousel">
                  {momentDetails.imageUrls.map((url, index) => (
                    <Carousel.Item key={index}>
                      <img
                        className="d-block w-100 post-image"
                        src={url}
                        alt={`${momentDetails.title} - ${index + 1}`}
                      />
                    </Carousel.Item>
                  ))}
                </Carousel>
              )}
              <hr />
              <Row className="text-center">
                <Col>
                  <Button
                    variant="link"
                    className="text-dark"
                    onClick={toggleLike}
                  >
                    {momentDetails.likedUsers.includes(userId) ? (
                      <AiFillLike className="icon" />
                    ) : (
                      <AiOutlineLike className="icon" />
                    )}
                    <span className="likeCount">{momentDetails.likeCount}</span>
                  </Button>
                </Col>
                <Col>
                  <FaRegComment className="icon" />
                  <span className="commentCount">{commentsList.length}</span>
                </Col>
                <Col>
                  <IoMdShare className="icon" />
                </Col>
              </Row>

              <hr />
              <h5>Comments</h5>
              {isLoadingComments ? (
                <div>Loading comments...</div>
              ) : commentError ? (
                <div>Error loading comments</div>
              ) : commentsList.length > 0 ? (
                <ListGroup variant="flush">
                  {commentsList.map((comment: CommentType) => (
                    <ListGroup.Item key={comment._id}>
                      <div className="d-flex align-items-start">
                        <Image
                          src={
                            comment.user.imageUrls[0] ||
                            "https://via.placeholder.com/50"
                          }
                          roundedCircle
                          fluid
                          className="profile-pic"
                          style={{ width: "40px", height: "40px" }}
                        />
                        <div className="ms-3">
                          <strong>{comment.user.name}</strong>
                          <div>{comment.text}</div>
                        </div>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              ) : (
                <div>No comments yet.</div>
              )}
              {userInfo ? (
                <Form onSubmit={handleCommentSubmit}>
                  <Form.Group controlId="commentInput">
                    <Form.Control
                      type="text"
                      placeholder="Add a comment..."
                      value={newComment}
                      onChange={handleCommentChange}
                      disabled={isAddingComment}
                    />
                  </Form.Group>
                  <Button
                    variant="primary"
                    type="submit"
                    className="mt-2"
                    disabled={isAddingComment}
                  >
                    {isAddingComment ? "Adding..." : "Add Comment"}
                  </Button>
                  {/* {addCommentError && (
   <div className="text-danger mt-2">Error adding comment</div>
 )} */}
                </Form>
              ) : (
                <Message>
                  Please <Link to="/login">sign in</Link> to write a review
                </Message>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default MomentDetail;
