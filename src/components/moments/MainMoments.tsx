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

// TypeScript interfaces
interface User {
  _id: string;
  name: string;
  images?: string[];
}

interface UserInfo {
  user: User;
}

interface AuthState {
  userInfo?: UserInfo;
}

interface RootState {
  auth: AuthState;
}

interface CreatePostCardProps {
  userImage: string;
  userName: string;
  handleAddMoment: () => void;
  t: (key: string) => string;
}

interface LoadingStateProps {
  t: (key: string) => string;
}

interface ErrorStateProps {
  t: (key: string) => string;
  refetch: () => void;
}

interface EmptyStateProps {
  t: (key: string) => string;
  handleAddMoment: () => void;
}

interface FloatingActionButtonProps {
  onClick: () => void;
}

// Component for the Create Post card with modern design
const CreatePostCard: React.FC<CreatePostCardProps> = ({ 
  userImage, 
  userName, 
  handleAddMoment, 
  t 
}) => (
  <Card className="shadow-sm mb-4 border-0 rounded-4 overflow-hidden bg-gradient-subtle">
    <Card.Body className="p-4">
      <div className="d-flex align-items-center gap-3">
        <div className="position-relative">
          <Image
            src={userImage}
            roundedCircle
            width={48}
            height={48}
            className="border border-2 border-light shadow-sm"
            style={{ objectFit: "cover" }}
          />
          <div 
            className="position-absolute bottom-0 end-0 bg-success rounded-circle border border-2 border-white"
            style={{ width: '12px', height: '12px' }}
          />
        </div>
        <Button
          variant="light"
          className="flex-grow-1 py-3 px-4 rounded-pill text-start border-0 shadow-sm hover-lift"
          onClick={handleAddMoment}
          style={{ 
            backgroundColor: '#f8f9fa',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#e9ecef';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#f8f9fa';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <span className="text-muted fw-medium">
            {t('moments_section.question')} {userName.split(' ')[0]}?
          </span>
        </Button>
        <Button
          variant="primary"
          className="rounded-circle d-flex align-items-center justify-content-center shadow-sm"
          onClick={handleAddMoment}
          style={{ width: '40px', height: '40px', padding: 0 }}
        >
          <FaPlus size={16} />
        </Button>
      </div>
    </Card.Body>
  </Card>
);

// Modern loading state component
const LoadingState: React.FC<LoadingStateProps> = ({ t }) => (
  <div className="text-center py-5">
    <div className="d-flex flex-column align-items-center gap-3">
      <div className="position-relative">
        <Spinner 
          animation="border" 
          variant="primary" 
          style={{ width: '3rem', height: '3rem' }}
        />
        <div 
          className="position-absolute top-50 start-50 translate-middle bg-primary rounded-circle"
          style={{ width: '8px', height: '8px' }}
        />
      </div>
      <div>
        <h6 className="mb-1 text-dark">{t('moments_section.loading_moments')}</h6>
        <p className="mb-0 text-muted small">Fetching latest updates...</p>
      </div>
    </div>
  </div>
);

// Enhanced error state component
const ErrorState: React.FC<ErrorStateProps> = ({ t, refetch }) => (
  <Alert variant="light" className="my-4 border-0 rounded-4 shadow-sm">
    <div className="d-flex align-items-center gap-3">
      <div className="flex-shrink-0">
        <div 
          className="bg-danger-subtle text-danger rounded-circle d-flex align-items-center justify-content-center"
          style={{ width: '40px', height: '40px' }}
        >
          <i className="fas fa-exclamation-triangle"></i>
        </div>
      </div>
      <div className="flex-grow-1">
        <h6 className="mb-1 text-dark">Something went wrong</h6>
        <p className="mb-2 text-muted small">
          {t('moments_section.error_info')}
        </p>
      </div>
      <Button 
        variant="outline-primary" 
        onClick={refetch} 
        size="sm"
        className="rounded-pill px-3"
      >
        {t('moments_section.rety_btn')}
      </Button>
    </div>
  </Alert>
);

// Modern empty state component
const EmptyState: React.FC<EmptyStateProps> = ({ t, handleAddMoment }) => (
  <Card className="text-center py-5 my-4 border-0 bg-gradient-subtle rounded-4">
    <Card.Body>
      <div className="py-4">
        <div 
          className="bg-primary-subtle text-primary rounded-circle d-inline-flex align-items-center justify-content-center mb-4"
          style={{ width: '80px', height: '80px' }}
        >
          <FaPlus size={32} />
        </div>
        <h5 className="text-dark mb-3 fw-bold">{t('moments_section.no_moments')}</h5>
        <p className="text-muted mb-4 px-3">
          {t('moments_section.first_to_moment')}
        </p>
        <Button
          variant="primary"
          onClick={handleAddMoment}
          className="px-5 py-2 rounded-pill shadow-sm"
          style={{ fontSize: '0.95rem' }}
        >
          <FaPlus className="me-2" size={14} />
          {t('moments_section.share_moment')} 
        </Button>
      </div>
    </Card.Body>
  </Card>
);

// Enhanced mobile floating action button
const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({ onClick }) => (
  <div className="d-lg-none position-fixed" style={{ bottom: '24px', right: '24px', zIndex: 1050 }}>
    <Button
      className="d-flex justify-content-center align-items-center shadow-lg border-0"
      variant="primary"
      onClick={onClick}
      style={{
        borderRadius: "50%",
        width: "56px",
        height: "56px",
        padding: "0",
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        transition: 'all 0.3s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.1) translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.4)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1) translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.2)';
      }}
      aria-label="Add new moment"
    >
      <FaPlus size={20} />
    </Button>
  </div>
);

const MainMoments: React.FC = () => {
  const { data, isLoading, error, refetch } = useGetMomentsQuery({});
  const userId = useSelector((state: RootState) => state.auth.userInfo?.user._id);
  const userInfo = useSelector((state: RootState) => state.auth.userInfo);
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  // Memoize user data with proper typing
  const { userName, userImage } = useMemo(() => ({
    userName: userInfo?.user.name || "User",
    userImage: userInfo?.user.images?.[0] || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face"
  }), [userInfo]);
  
  // Memoize moments data with proper typing
  const moments = useMemo(() => (data || []) as MomentType[], [data]);
  
  // Callback for adding a new moment
  const handleAddMoment = useCallback(() => {
    navigate("/add-moment");
  }, [navigate]);

  return (
    <>
      {/* Custom CSS for modern effects */}
      <style>
        {`
          .bg-gradient-subtle {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
          }
          .hover-lift:hover {
            transform: translateY(-1px);
          }
          .moments-feed {
            animation: fadeInUp 0.6s ease-out;
          }
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .moment-card {
            transition: all 0.2s ease;
          }
          .moment-card:hover {
            transform: translateY(-2px);
          }
        `}
      </style>

      <Container className="py-4 px-lg-4 px-3" style={{ maxWidth: '680px' }}>
        <div className="bg-white rounded-4 shadow-sm border-0 overflow-hidden">
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
            <div className="moments-feed px-3 pb-3">
              {moments.map((moment, index) => (
                <div 
                  key={moment._id} 
                  className="mb-4 moment-card"
                  style={{
                    animationDelay: `${index * 0.1}s`,
                    animation: 'fadeInUp 0.6s ease-out forwards'
                  }}
                >
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
    </>
  );
};

export default React.memo(MainMoments);