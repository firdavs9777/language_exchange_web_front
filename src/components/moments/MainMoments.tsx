import React, { useCallback, useMemo } from "react";
import { useGetMomentsQuery } from "../../store/slices/momentsSlice";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import SingleMoment from "./SingleMoment";
import { MomentType } from "./types";
import { 
  Container,
  Card,
  Image,
  Button,
  Spinner,
  Alert
} from "react-bootstrap";
import { FaEdit, FaPlus } from "react-icons/fa";

// Component for the Create Post card
const CreatePostCard = ({ userImage, userName, handleAddMoment, t }) => (
  <Card className="shadow-sm mb-3 border rounded-lg">
    <Card.Body className="p-3">
      <div className="d-flex align-items-center">
        <Image
          src={userImage}
          roundedCircle
          width={40}
          height={40}
          className="me-2"
          style={{ objectFit: "cover" }}
        />
        <Button
          variant="light"
          className="flex-grow-1 py-2 px-3 rounded-pill text-start bg-gray-100"
          onClick={handleAddMoment}
        >
          <span className="text-muted">
            {t('moments_section.question')} {userName.split(' ')[0]}?
          </span>
        </Button>
      </div>
    </Card.Body>
  </Card>
);

// Loading state component
const LoadingState = ({ t }) => (
  <div className="text-center py-4">
    <Spinner animation="border" variant="primary" size="sm" role="status" />
    <p className="mt-2 text-muted small">{t('moments_section.loading_moments')}</p>
  </div>
);

// Error state component
const ErrorState = ({ t, refetch }) => (
  <Alert variant="light" className="my-3 border">
    <p className="mb-2 text-secondary">
      {t('moments_section.error_info')}
    </p>
    <div className="d-flex justify-content-end">
      <Button variant="outline-primary" onClick={refetch} size="sm">
        {t('moments_section.rety_btn')}
      </Button>
    </div>
  </Alert>
);

// Empty state component
const EmptyState = ({ t, handleAddMoment }) => (
  <Card className="text-center py-4 my-3 border-light">
    <Card.Body>
      <div className="py-3">
        <h6 className="text-muted mb-3">{t('moments_section.no_moments')}</h6>
        <p className="text-muted mb-3 small">
          {t('moments_section.first_to_moment')}
        </p>
        <Button
          variant="primary"
          onClick={handleAddMoment}
          className="px-4 py-1"
        >
          {t('moments_section.share_moment')} 
        </Button>
      </div>
    </Card.Body>
  </Card>
);

// Mobile floating action button
const FloatingActionButton = ({ onClick }) => (
  <div className="d-lg-none position-fixed bottom-0 end-0 m-3 z-3">
    <Button
      className="d-flex justify-content-center align-items-center shadow"
      variant="primary"
      onClick={onClick}
      style={{
        borderRadius: "50%",
        width: "50px",
        height: "50px",
        padding: "0",
      }}
      aria-label="Add new moment"
    >
      <FaPlus size={20} />
    </Button>
  </div>
);

const MainMoments = () => {
  const { data, isLoading, error, refetch } = useGetMomentsQuery({});
  const userId = useSelector((state) => state.auth.userInfo?.user._id);
  const userInfo = useSelector((state) => state.auth.userInfo);
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  // Memoize user data
  const { userName, userImage } = useMemo(() => ({
    userName: userInfo?.user.name || "User",
    userImage: userInfo?.user.images?.[0] || "https://via.placeholder.com/40"
  }), [userInfo]);
  
  // Memoize moments data
  const moments = useMemo(() => (data || []) as MomentType[], [data]);
  
  // Callback for adding a new moment
  const handleAddMoment = useCallback(() => {
    navigate("/add-moment");
  }, [navigate]);

  return (
    <Container className="py-3 px-lg-4 px-2 max-w-md mx-auto">
      <div className="bg-white rounded-lg">
        {/* Create post area */}
        <CreatePostCard 
          userImage={userImage} 
          userName={userName} 
          handleAddMoment={handleAddMoment}
          t={t}
        />
        
        {/* Content states */}
        {isLoading ? (
          <LoadingState t={t} />
        ) : error ? (
          <ErrorState t={t} refetch={refetch} />
        ) : moments.length > 0 ? (
          <div className="moments-feed">
            {moments.map((moment) => (
              <div key={moment._id} className="mb-3">
                <SingleMoment
                  _id={moment._id}
                  title={moment.title}
                  description={moment.description}
                  likeCount={moment.likeCount}
                  commentCount={moment.commentCount}
                  user={moment.user}
                  likedUsers={moment.likedUsers}
                  imageUrls={moment.imageUrls}
                  createdAt={moment.createdAt}
                  refetch={refetch}
                />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState t={t} handleAddMoment={handleAddMoment} />
        )}
      </div>
      
      {/* Mobile floating action button */}
      {userId && <FloatingActionButton onClick={handleAddMoment} />}
    </Container>
  );
};

export default React.memo(MainMoments);