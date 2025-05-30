import React, { useEffect, useState, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useTranslation } from 'react-i18next';
import { useSelector } from "react-redux";
import { Bounce, toast } from "react-toastify";
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
  Stack,
} from "react-bootstrap";
import { AiFillLike, AiOutlineLike } from "react-icons/ai";
import { FaComments, FaRegComments, FaArrowLeft, FaPaperPlane } from "react-icons/fa";
import { IoMdShare } from "react-icons/io";

// API hooks
import {
  useDislikeMomentMutation,
  useGetMomentDetailsQuery,
  useLikeMomentMutation,
} from "../../store/slices/momentsSlice";
import {
  useAddCommentMutation,
  useGetCommentsQuery,
} from "../../store/slices/comments";

// Types
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

// Helper components
const TimeAgo: React.FC<{ date: string }> = ({ date }) => {
  const { t } = useTranslation();
  
  const calculateTimeAgo = () => {
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

  return <small className="text-muted">{calculateTimeAgo()}</small>;
};

const CommentItem: React.FC<{ comment: Comment }> = ({ comment }) => {
  return (
    <ListGroup.Item className="border-bottom border-light py-3 px-0 bg-transparent">
      <div className="d-flex">
        <Image
          src={comment.user.imageUrls[0] || "/default-avatar.png"}
          roundedCircle
          width={36}
          height={36}
          className="me-2"
          alt={comment.user.name}
        />
        <div className="bg-light rounded-3 p-2 flex-grow-1">
          <div className="d-flex justify-content-between align-items-center">
            <strong className="text-dark">{comment.user.name}</strong>
            <TimeAgo date={comment.createdAt} />
          </div>
          <p className="mb-0 mt-1">{comment.text}</p>
        </div>
      </div>
    </ListGroup.Item>
  );
};

const ImageCarousel: React.FC<{ images: string[]; title?: string }> = ({ images, title }) => {
  const { t } = useTranslation();
  
  return (
    <Carousel
      variant="dark"
      interval={null}
      indicators={images.length > 1}
      controls={images.length > 1}
      className="mb-2"
    >
      {images.map((url, idx) => (
        <Carousel.Item key={idx}>
          <div className="carousel-image-container bg-light d-flex justify-content-center align-items-center">
            <img
              className="img-fluid"
              src={url}
              alt={`${title || t('moments_section.title')} - ${idx + 1}`}
              style={{
                maxHeight: "400px",
                objectFit: "contain",
              }}
            />
          </div>
        </Carousel.Item>
      ))}
    </Carousel>
  );
};

const MomentDetail: React.FC = () => {
  const { t } = useTranslation();
  const { id: momentId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // User data
  const { userInfo } = useSelector((state: any) => state.auth);
  const userId = userInfo?.user?._id;
  
  // State
  const [newComment, setNewComment] = useState("");
  
  // API hooks
  const {
    data: momentData,
    isLoading: isLoadingMoment,
    refetch: refetchMomentDetails,
  } = useGetMomentDetailsQuery(momentId || '');
  
  const [likeMoment] = useLikeMomentMutation();
  const [dislikeMoment] = useDislikeMomentMutation();
  const [addComment, { isLoading: isAddingComment }] = useAddCommentMutation();
  
  const {
    data: commentsData,
    isLoading: isLoadingComments,
    refetch: refetchComments,
  } = useGetCommentsQuery(momentId || '');

  // Data
  const momentDetails = (momentData as MomentResponse)?.data;
  const commentsList = (commentsData as CommentResponse)?.data || [];
  const isLiked = momentDetails?.likedUsers.includes(userId || '');
  const formattedDate = momentDetails ? new Date(momentDetails.createdAt).toLocaleString() : '';

  // Effects
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [momentId]);

  // Handlers
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
    if (!momentId || !momentDetails) return;

    try {
      if (isLiked) {
        await dislikeMoment({ momentId, userId }).unwrap();
        toast.info(t('moments_section.removedLike'), {
          autoClose: 3000,
          hideProgressBar: false,
          theme: "dark",
          transition: Bounce,
        });
      } else {
        await likeMoment({ momentId, userId }).unwrap();
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
  }, [momentId, userId, isLiked, refetchMomentDetails, t]);

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

  // Loading states
  if (!momentId) {
    return (
      <Container className="py-5 text-center">
        <div className="alert alert-danger">{t('moments_section.invalidMomentId')}</div>
      </Container>
    );
  }

  if (isLoadingMoment) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">{t('moments_section.loadingMoment')}</p>
      </Container>
    );
  }

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

  return (
    <Container fluid className="px-0 bg-light min-vh-100">
      {/* Navigation Header */}
      <div className="bg-white shadow-sm sticky-top mb-3 p-2">
        <Container>
          <Stack direction="horizontal" gap={3} className="align-items-center">
            <Button 
              variant="light" 
              className="rounded-circle p-2" 
              onClick={handleGoBack}
              aria-label={t('moments_section.goBack')}
            >
              <FaArrowLeft />
            </Button>
            <h5 className="mb-0 flex-grow-1 text-truncate">
              {t('moments_section.momentDetails')}
            </h5>
          </Stack>
        </Container>
      </div>

      <Container>
        <Row className="justify-content-center">
          <Col lg={7} md={9} sm={12}>
            <Card className="shadow-sm border-0 rounded-3 mb-4 overflow-hidden">
              <Card.Body className="p-0">
                {/* Author Header */}
                <div className="d-flex align-items-center p-3 border-bottom">
                  <Image
                    src={momentDetails.user.imageUrls[0] || "/default-avatar.png"}
                    roundedCircle
                    width={46}
                    height={46}
                    className="me-3 border"
                    alt={momentDetails.user.name}
                  />
                  <div>
                    <h6 className="mb-0 fw-bold">{momentDetails.user.name}</h6>
                    <small className="text-muted">{formattedDate}</small>
                  </div>
                </div>

                {/* Moment Content */}
                <div className="p-3">
                  {momentDetails.title && (
                    <h5 className="fw-bold mb-2">{momentDetails.title}</h5>
                  )}
                  {momentDetails.description && (
                    <p className="mb-3 text-break">{momentDetails.description}</p>
                  )}
                </div>

                {/* Images */}
                {momentDetails.imageUrls.length > 0 && (
                  <ImageCarousel 
                    images={momentDetails.imageUrls} 
                    title={momentDetails.title} 
                  />
                )}

                {/* Stats */}
                <div className="d-flex justify-content-between px-3 py-2 border-top border-bottom bg-white">
                  <div className="d-flex align-items-center">
                    <Badge bg="light" className="text-primary p-2">
                      <AiFillLike size={16} className="me-1" />
                      {momentDetails.likeCount}
                    </Badge>
                  </div>
                  <div>
                    {commentsList.length > 0 && (
                      <Badge bg="light" className="text-muted">
                        {t('moments_section.commentsCount', { count: commentsList.length })}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="d-flex justify-content-around p-1 border-bottom bg-white">
                  <Button
                    variant="link"
                    onClick={handleLikeToggle}
                    className={` py-2 rounded-0 ${isLiked ? 'text-primary' : 'text-muted'}`}
                  >
                    {isLiked ? (
                      <AiFillLike size={20} className="" />
                    ) : (
                      <AiOutlineLike size={20} className="" />
                    )}
                    {t('moments_section.likeButton')}
                  </Button>
           
                  
                  <Button
                    variant="link"
                    className=" py-2 rounded-0 text-muted"
                    onClick={() => document.getElementById('commentInput')?.focus()}
                  >
                    {commentsList.length > 0 ? (
                      <FaComments size={18} className="me-2" />
                    ) : (
                      <FaRegComments size={18} className="me-2" />
                    )}
                    {t('moments_section.commentButton')}
                  </Button>
                  
                  <Button
                    variant="link"
                    className=" py-2 rounded-0 text-muted "
                  >
                    <IoMdShare size={20} className="me-2" />
                    {t('moments_section.shareButton')}
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
                      {/* Comment Form */}
                      {userInfo ? (
                        <Form onSubmit={handleCommentSubmit} className="mb-3">
                          <div className="position-relative">
                            <Form.Control
                              id="commentInput"
                              type="text"
                              placeholder={t('moments_section.writeCommentPlaceholder')}
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              disabled={isAddingComment}
                              className="rounded-pill pe-5"
                            />
                            {newComment.trim() && (
                              <Button
                                type="submit"
                                variant="primary"
                                size="sm"
                                className="position-absolute end-0 top-50 translate-middle-y rounded-circle me-2"
                                disabled={isAddingComment}
                                style={{ width: "30px", height: "30px" }}
                              >
                                {isAddingComment ? (
                                  <Spinner animation="border" size="sm" />
                                ) : (
                                  <FaPaperPlane size={12} />
                                )}
                              </Button>
                            )}
                          </div>
                        </Form>
                      ) : (
                        <div className="alert alert-light border my-3 text-center">
                          {t('moments_section.signInToComment')}{" "}
                          <Link to="/login" className="text-primary fw-bold">
                            {t('moments_section.signIn')}
                          </Link>
                        </div>
                      )}

                      {/* Comments List */}
                      {commentsList.length > 0 ? (
                        <div className="mt-3">
                          <h6 className="text-muted mb-3">
                            {t('moments_section.comments')} • {commentsList.length}
                          </h6>
                          <ListGroup variant="flush" className="comment-list">
                            {commentsList.map((comment) => (
                              <CommentItem key={comment._id} comment={comment} />
                            ))}
                          </ListGroup>
                        </div>
                      ) : (
                        <div className="text-center text-muted py-4">
                          <FaRegComments size={30} className="mb-2 opacity-50" />
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