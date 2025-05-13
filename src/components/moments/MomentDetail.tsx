import React, { useEffect, useState, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
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
  Badge,
  Spinner,
} from "react-bootstrap";
import { AiFillLike, AiOutlineLike } from "react-icons/ai";
import { FaComments, FaRegComments, FaArrowLeft, FaPaperPlane } from "react-icons/fa";
import { IoMdShare } from "react-icons/io";
import {
  useAddCommentMutation,
  useGetCommentsQuery,
} from "../../store/slices/comments";
import { useSelector } from "react-redux";
import Message from "../Message";
import { Bounce, toast } from "react-toastify";

// TypeScript interfaces
interface User {
  _id: string;
  name: string;
  imageUrls: string[];
}

interface MomentDetails {
  _id: string;
  title: string;
  description: string;
  likedUsers: string[];
  likeCount: number;
  imageUrls: string[];
  createdAt: string;
  user: User;
}

interface Comment {
  _id: string;
  text: string;
  user: User;
  createdAt: string;
}

interface CommentResponse {
  data: Comment[];
}

interface MomentResponse {
  data: MomentDetails;
}

// Comment component for better organization
const CommentItem: React.FC<{ comment: Comment }> = ({ comment }) => {
  const { t } = useTranslation();

  const timeAgo = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diff = now.getTime() - past.getTime();

    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return t('moments_section.timeAgo.justNow');
    if (minutes < 60) return t('moments_section.timeAgo.minutesAgo', { minutes });
    if (hours < 24) return t('moments_section.timeAgo.hoursAgo', { hours });
    if (days < 7) return t('moments_section.timeAgo.daysAgo', { days });
    return new Date(date).toLocaleDateString();
  };

  return (
    <ListGroup.Item className="border-bottom border-light py-3 px-0 bg-transparent">
      <div className="d-flex">
        <Image
          src={comment.user.imageUrls[0] || "https://via.placeholder.com/40"}
          roundedCircle
          width={36}
          height={36}
          className="me-2"
        />
        <div className="bg-light rounded-3 p-2 flex-grow-1">
          <div className="d-flex justify-content-between">
            <strong className="text-dark">{comment.user.name}</strong>
            <small className="text-muted">{timeAgo(comment.createdAt)}</small>
          </div>
          <p className="mb-0 mt-1">{comment.text}</p>
        </div>
      </div>
    </ListGroup.Item>
  );
};

const MomentDetail: React.FC = () => {
  const { t } = useTranslation();
  const { id: momentId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    data,
    isLoading,
    refetch: refetchMomentDetails,
  } = useGetMomentDetailsQuery(momentId || '');

  const { userInfo } = useSelector((state: any) => state.auth);
  const userId = userInfo?.user?._id;

  const [newComment, setNewComment] = useState<string>("");

  const [likeMoment] = useLikeMomentMutation();
  const [dislikeMoment] = useDislikeMomentMutation();
  const [addComment, { isLoading: isAddingComment }] = useAddCommentMutation();

  const {
    data: commentsData,
    isLoading: isLoadingComments,
    refetch: refetchComments,
  } = useGetCommentsQuery(momentId || '');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [momentId]);

  const handleGoBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  const handleLikeToggle = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!userId) {
      toast.error(t('moments_section.pleaseLoginFirst'), {
                autoClose: 3000,
                hideProgressBar: false,
                theme: "dark",
                transition: Bounce,
              });
      return;
    }
    if (!momentId) return;

    const momentDetails = (data as MomentResponse)?.data;
    if (!momentDetails) return;

    try {
      if (momentDetails.likedUsers.includes(userId)) {
        await dislikeMoment({ momentId: momentDetails._id, userId }).unwrap();
        toast.info(t('moments_section.removedLike'), {
                  autoClose: 3000,
                  hideProgressBar: false,
                  theme: "dark",
                  transition: Bounce,
                });
      } else {
        await likeMoment({ momentId: momentDetails._id, userId }).unwrap();
        toast.success(t('moments_section.likedMoment'), {
                  autoClose: 3000,
                  hideProgressBar: false,
                  theme: "dark",
                  transition: Bounce,
                });
      }
      refetchMomentDetails();
    } catch (error) {
      toast.error(t('moments_section.failedToUpdateLike'), {
                autoClose: 3000,
                hideProgressBar: false,
                theme: "dark",
                transition: Bounce,
              });
    }
  }, [data, userId, momentId, likeMoment, dislikeMoment, refetchMomentDetails, t]);

  const handleCommentSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) {
      toast.error(t('moments_section.emptyCommentError'), {
                autoClose: 3000,
                hideProgressBar: false,
                theme: "dark",
                transition: Bounce,
              });
      return;
    }
    if (!momentId) return;

    try {
      await addComment({ momentId, newComment }).unwrap();
      toast.success(t('moments_section.commentAdded'), {
        autoClose: 3000,
        hideProgressBar: false,
        theme: "dark",
        transition: Bounce,
      });
      refetchComments();
      setNewComment("");
    } catch (error) {
      toast.error(t('moments_section.failedToAddComment'), {
        autoClose: 3000,
        hideProgressBar: false,
        theme: "dark",
        transition: Bounce,
      });
    }
  }, [newComment, momentId, addComment, refetchComments, t]);

  if (!momentId) {
    return (
      <Container className="py-5 text-center">
        <div className="alert alert-danger">{t('moments_section.invalidMomentId')}</div>
      </Container>
    );
  }

  if (isLoading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">{t('moments_section.loadingMoment')}</p>
      </Container>
    );
  }

  const momentDetails = (data as MomentResponse)?.data;
  const commentsList = (commentsData as CommentResponse)?.data || [];

  if (!momentDetails) {
    return (
      <Container className="py-5 text-center">
        <div className="alert alert-warning">{t('moments_section.noDetailsFound')}</div>
        <Button variant="outline-primary" onClick={handleGoBack} className="mt-3">
          <FaArrowLeft className="me-2" /> {t('moments_section.goBack')}
        </Button>
      </Container>
    );
  }

  const isLiked = momentDetails.likedUsers.includes(userId || '');
  const formattedDate = new Date(momentDetails.createdAt).toLocaleString();

  return (
    <Container fluid className=" px-0 bg-light min-vh-100">
      {/* Top navigation bar */}
      <div className="bg-white shadow-sm mb-3 p-2 ">
        <Container>
          <div className="d-flex align-items-center">
            <Button variant="light" className="me-3 rounded-circle p-2" onClick={handleGoBack}>
              <FaArrowLeft />
            </Button>
            <h5 className="mb-0 flex-grow-1">{t('moments_section.momentDetails')}</h5>
          </div>
        </Container>
      </div>

      <Container>
        <Row className="justify-content-center">
          <Col lg={7} md={9} sm={12}>
            <Card className="shadow-sm border-0 rounded-3 mb-4">
              <Card.Body className="p-0">
                {/* User info */}
                <div className="d-flex align-items-center p-3 border-bottom">
                  <Image
                    src={momentDetails.user.imageUrls[0] || "https://via.placeholder.com/50"}
                    roundedCircle
                    width={46}
                    height={46}
                    className="me-3 border"
                  />
                  <div>
                    <h6 className="mb-0 fw-bold">{momentDetails.user.name}</h6>
                    <small className="text-muted">{formattedDate}</small>
                  </div>
                </div>

                {/* Content */}
                <div className="p-3">
                  {momentDetails.title && (
                    <h5 className="fw-bold mb-2">{momentDetails.title}</h5>
                  )}
                  {momentDetails.description && (
                    <p className="mb-3">{momentDetails.description}</p>
                  )}
                </div>

                {/* Images Carousel */}
                {momentDetails.imageUrls.length > 0 && (
                  <Carousel
                    variant="dark"
                    interval={null}
                    indicators={momentDetails.imageUrls.length > 1}
                    controls={momentDetails.imageUrls.length > 1}
                    className="mb-2"
                  >
                    {momentDetails.imageUrls.map((url: string, idx: number) => (
                      <Carousel.Item key={idx}>
                        <div className="carousel-image-container bg-light">
                          <img
                            className="d-block w-100"
                            src={url}
                            alt={`${momentDetails.title || t('moments_section.title')} - ${idx + 1}`}
                            style={{
                              maxHeight: "400px",
                              objectFit: "contain",
                            }}
                          />
                        </div>
                      </Carousel.Item>
                    ))}
                  </Carousel>
                )}

                {/* Stats */}
                <div className="d-flex justify-content-between px-3 py-2 border-top border-bottom">
                  <div className="d-flex align-items-center">
                    <span className="bg-primary rounded-circle p-1 d-flex justify-content-center align-items-center" style={{ width: "24px", height: "24px" }}>
                      <AiFillLike size={14} className="text-white" />
                    </span>
                    <span className="ms-2 text-muted">{momentDetails.likeCount}</span>
                  </div>
                  <div className="text-muted">
                    {commentsList.length > 0 && (
                      <span>{t('moments_section.commentsCount', { count: commentsList.length })}</span>
                    )}
                  </div>
                </div>

                {/* Buttons */}
                <div className="d-flex justify-content-around p-1 border-bottom">
                  <Button
                    variant="light"
                    onClick={handleLikeToggle}
                    className="flex-grow-1 py-2 rounded-0 border-0"
                  >
                    {isLiked ? (
                      <><AiFillLike size={20} className="me-2 text-primary" /> <span className="text-primary">{t('moments_section.likeButton')}</span></>
                    ) : (
                      <><AiOutlineLike size={20} className="me-2" /> {t('moments_section.likeButton')}</>
                    )}
                  </Button>
                  <Button
                    variant="light"
                    className="flex-grow-1 py-2 rounded-0 border-0"
                    onClick={() => document.getElementById('commentInput')?.focus()}
                  >
                    {commentsList.length > 0 ? (
                      <><FaComments size={20} className="me-2 text-success" /> {t('moments_section.commentButton')}</>
                    ) : (
                      <><FaRegComments size={20} className="me-2" /> {t('moments_section.commentButton')}</>
                    )}
                  </Button>
                  <Button
                    variant="light"
                    className="flex-grow-1 py-2 rounded-0 border-0"
                  >
                    <IoMdShare size={20} className="me-2" /> {t('moments_section.shareButton')}
                  </Button>
                </div>

                {/* Comments Section */}
                <div className="p-3">
                  {isLoadingComments ? (
                    <div className="text-center py-3">
                      <Spinner animation="border" size="sm" />
                      <p className="text-muted mt-2 mb-0">{t('moments_section.loadingComments')}</p>
                    </div>
                  ) : (
                    <>

                      {userInfo ? (
                        <Form onSubmit={handleCommentSubmit} className="mb-3 position-relative">
                          <div className="d-flex">

                            <Form.Group controlId="commentInput" className="flex-grow-1">
                              <Form.Control
                                type="text"
                                placeholder={t('moments_section.writeCommentPlaceholder')}
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                disabled={isAddingComment}
                                className="rounded-pill"
                              />
                              {newComment.trim() && (
                                <Button
                                  type="submit"
                                  variant="primary"
                                  size="sm"
                                  className="position-absolute end-0 top-0 mt-1 me-2 rounded-circle"
                                  disabled={isAddingComment}
                                  style={{ width: "30px", height: "30px", padding: "0" }}
                                >
                                  {isAddingComment ? (
                                    <Spinner animation="border" size="sm" />
                                  ) : (
                                    <FaPaperPlane size={12} />
                                  )}
                                </Button>
                              )}

                            </Form.Group>
                          </div>
                        </Form>
                      ) : (
                        <div className="alert alert-light border my-3">
                          {t('moments_section.signInToComment')}{" "}
                          <Link to="/login" className="text-decoration-none fw-bold">
                            {t('moments_section.signIn')}
                          </Link>
                        </div>
                      )}

                      {/* Comments list */}
                      {commentsList.length > 0 ? (
                        <div className="mt-2">
                          <Badge bg="primary" className="mb-3">
                            {t('moments_section.commentsCount', { count: commentsList.length })}
                          </Badge>
                          <ListGroup variant="flush" className="comment-list">
                            {commentsList.map((comment: Comment) => (
                              <CommentItem key={comment._id} comment={comment} />
                            ))}
                          </ListGroup>
                        </div>
                      ) : (
                        <div className="text-center text-muted py-4">
                          <FaRegComments size={30} className="mb-2" />
                          <p>{t('moments_section.noCommentsYet')}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

    </Container>
  );
};

export default MomentDetail;