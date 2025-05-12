import React, { useEffect, useState } from "react";
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
import { FaComments, FaRegComments } from "react-icons/fa";
import { IoMdShare } from "react-icons/io";
import {
  useAddCommentMutation,
  useGetCommentsQuery,
} from "../../store/slices/comments";
import { useSelector } from "react-redux";
import Message from "../Message";
import { toast } from "react-toastify";

const MomentDetail = () => {
  const { id: momentId } = useParams();
  const {
    data,
    isLoading,
    refetch: refetchMomentDetails,
  } = useGetMomentDetailsQuery(momentId);
  const { userInfo } = useSelector((state: any) => state.auth);
  const userId = userInfo?.user?._id;

  const [liked, setLiked] = useState(false);
  const [newComment, setNewComment] = useState("");

  const [likeMoment] = useLikeMomentMutation();
  const [dislikeMoment] = useDislikeMomentMutation();
  const [addComment, { isLoading: isAddingComment }] = useAddCommentMutation();

  const {
    data: commentsData,
    isLoading: isLoadingComments,
    refetch,
  } = useGetCommentsQuery(momentId);

    useEffect(() => {
      window.scrollTo(0, 0);
    }, [momentId]);

  if (!momentId)
    return <div className="text-center my-5">Invalid moment ID</div>;
  if (isLoading) return <div className="text-center my-5">Loading...</div>;

  const momentDetails = (data as any)?.data;
  const commentsList = (commentsData as any)?.data || [];

  if (!momentDetails)
    return <div className="text-center my-5">No details found</div>;

  const handleLikeToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!userId) {
      toast.error("Please login first");
      return;
    }
    if (momentDetails.likedUsers.includes(userId)) {
      await dislikeMoment({ momentId: momentDetails._id, userId });
    } else {
      await likeMoment({ momentId: momentDetails._id, userId });
    }
    setLiked(!liked);
    refetchMomentDetails();
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) {
      toast.error("Please add a comment");
      return;
    }
    try {
      await addComment({ momentId, newComment }).unwrap();
      toast.success("Comment added");
      refetch();
      setNewComment("");
    } catch (error) {
      toast.error("Failed to add comment");
    }
  };

  return (
    <Container className="py-4">
      <Row className="justify-content-center">
        <Col md={8}>
          <Card className="shadow-sm border-0">
            <Card.Body>
              {/* User info */}
              <Row className="align-items-center mb-3">
                <Col xs="auto">
                  <Image
                    src={
                      momentDetails.user.imageUrls[0] ||
                      "https://via.placeholder.com/50"
                    }
                    roundedCircle
                    width={50}
                    height={50}
                  />
                </Col>
                <Col>
                  <h6 className="mb-0">{momentDetails.user.name}</h6>
                  <small className="text-muted">
                    {new Date(momentDetails.createdAt).toLocaleString()}
                  </small>
                </Col>
              </Row>

              {/* Title and Description */}
              <h5 className="fw-bold">{momentDetails.title}</h5>
              <p className="text-muted">{momentDetails.description}</p>

              {/* Images Carousel */}
              {momentDetails.imageUrls.length > 0 && (
                <Carousel variant="dark" className="mb-4">
                  {momentDetails.imageUrls.map((url: string, idx: number) => (
                    <Carousel.Item key={idx}>
                      <img
                        className="d-block w-100"
                        src={url}
                        alt={`${momentDetails.title} - ${idx + 1}`}
                        style={{
                          height: "300px",
                          objectFit: "contain", // or 'contain' if you prefer no cropping
                          borderRadius: "10px",
                        }}
                      />
                    </Carousel.Item>
                  ))}
                </Carousel>
              )}

              {/* Buttons */}
              <Row className="text-center mb-3">
                <Col>
                  <Button
                    variant="light"
                    onClick={handleLikeToggle}
                    className="w-100"
                  >
                    {momentDetails.likedUsers.includes(userId) ? (
                      <AiFillLike size={24} className="me-2 text-primary" />
                    ) : (
                      <AiOutlineLike size={24} className="me-2" />
                    )}
                    {momentDetails.likeCount}
                  </Button>
                </Col>
                <Col>
                  <Button variant="light" className="w-100">
                    {commentsList.length > 0 ? (
                      <FaComments size={24} className="me-2 text-success" />
                    ) : (
                      <FaRegComments size={24} className="me-2" />
                    )}
                    {commentsList.length}
                  </Button>
                </Col>
                <Col>
                  <Button variant="light" className="w-100">
                    <IoMdShare size={24} />
                  </Button>
                </Col>
              </Row>

              {/* Comments Section */}
              <h6 className="fw-bold mb-3">Comments</h6>
              {isLoadingComments ? (
                <div className="text-center">Loading comments...</div>
              ) : commentsList.length > 0 ? (
                <ListGroup variant="flush" className="mb-4">
                  {commentsList.map((comment: any) => (
                    <ListGroup.Item key={comment._id} className="border-0 ps-0">
                      <Row className="align-items-start">
                        <Col xs="auto">
                          <Image
                            src={
                              comment.user.imageUrls[0] ||
                              "https://via.placeholder.com/40"
                            }
                            roundedCircle
                            width={40}
                            height={40}
                          />
                        </Col>
                        <Col>
                          <strong>{comment.user.name}</strong>
                          <p className="mb-0">{comment.text}</p>
                        </Col>
                      </Row>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              ) : (
                <div className="text-muted mb-4">No comments yet.</div>
              )}

              {/* Add Comment Form */}
              {userInfo ? (
                <Form onSubmit={handleCommentSubmit}>
                  <Form.Group controlId="commentInput">
                    <Form.Control
                      type="text"
                      placeholder="Add a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      disabled={isAddingComment}
                    />
                  </Form.Group>
                  <Button
                    type="submit"
                    variant="primary"
                    className="mt-2 w-100"
                    disabled={isAddingComment}
                  >
                    {isAddingComment ? "Adding..." : "Post Comment"}
                  </Button>
                </Form>
              ) : (
                <Message>
                  Please{" "}
                  <Link to="/login" className="text-decoration-underline">
                    sign in
                  </Link>{" "}
                  to add a comment
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
