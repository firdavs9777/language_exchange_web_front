import { Button, Card, Container, Row, Col, Spinner } from "react-bootstrap";
import { useNavigate, useParams } from "react-router-dom";
import { useGetCommunityDetailsQuery } from "../../store/slices/communitySlice";
import "./CommunityDetail.css"; // Make sure to create this CSS file
import { useSelector } from "react-redux";
import {
  useFollowUserMutation,
  useUnFollowUserMutation,
} from "../../store/slices/usersSlice";
import { toast } from "react-toastify";

export interface SingleMember {
  data: {
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
    followers: string[];
    following: string[];
    imageUrls: string[];
    __v: number;
  };
}

const CommunityDetail = () => {
  const { id: communityId } = useParams();
  const { data, isLoading, error, refetch } =
    useGetCommunityDetailsQuery(communityId);
  const navigate = useNavigate();
  const userId = useSelector((state: any) => state.auth.userInfo?.user._id);
  const [followUser, { isLoading: isFollowing, error: followError }] =
    useFollowUserMutation({});
  const [unFollowUser, { isLoading: isUnfollowing, error: unfollowError }] =
    useUnFollowUserMutation();

  if (!communityId) {
    return <div className="error-message">Invalid community ID</div>;
  }

  const handleFollow = async (targetUser: string) => {
    try {
      if (!userId) {
        console.error("User ID is not available");
        return;
      }
      const response = await followUser({ userId, targetUserId: targetUser });
      if (response.error) {
        console.error("Error following user:", response.error);
      } else {
        toast.success("Successfully followed");
        await refetch();
        // Update UI or state as necessary
      }
    } catch (error) {
      console.error("Error following user:", error);
    }
  };

  const handleUnfollow = async (targetUser: string) => {
    if (window.confirm("Are you sure you want to unfollow this user?")) {
      try {
        if (!userId) {
          console.error("User ID is not available");
          return;
        }
        const response = await unFollowUser({
          userId,
          targetUserId: targetUser,
        });
        if (response.error) {
          console.error("Error unfollowing user:", response.error);
        } else {
          toast.success("Successfully unfollowed");
          await refetch(); // Refresh data
        }
      } catch (error) {
        console.error("Error unfollowing user:", error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <Spinner animation="border" />
        <p>Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-message">
        An error occurred. Please try again later.
      </div>
    );
  }

  // Ensure data is defined
  const member = data as SingleMember;
  const memberDetails = member?.data;

  if (!memberDetails) {
    return <div className="error-message">Member details not found</div>;
  }

  const isFollower = memberDetails.followers.includes(userId);

  return (
    <Container fluid className="community-detail-container">
      <Row className="justify-content-center">
        <Col md={8}>
          <Card className="shadow-lg">
            <Card.Img
              variant="top"
              src={memberDetails.imageUrls[0] || "/placeholder.jpg"}
              alt={memberDetails.name}
              className="community-image"
            />
            <Card.Body>
              <Card.Title className="text-center">
                {memberDetails.name}
              </Card.Title>
              <Card.Text className="text-center">
                <strong>Bio:</strong> {memberDetails.bio || "No bio available"}
              </Card.Text>
              <Card.Text className="text-center">
                <strong>Native Language:</strong>{" "}
                {memberDetails.native_language || "Not specified"}
              </Card.Text>
              <Card.Text className="text-center">
                <strong>Learning:</strong>{" "}
                {memberDetails.language_to_learn || "Not specified"}
              </Card.Text>
              <div className="d-flex justify-content-center mt-3">
                {isFollower ? (
                  <div>
                    <Button
                      variant="primary"
                      size="lg"
                      className="mx-2"
                      disabled={isUnfollowing}
                      onClick={() => handleUnfollow(memberDetails._id)}
                    >
                      {isUnfollowing ? "Unfollowing..." : "Following"}
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Button
                      variant="primary"
                      size="lg"
                      className="mx-2"
                      disabled={isFollowing}
                      onClick={() => handleFollow(memberDetails._id)}
                    >
                      {isFollowing ? "Following..." : "Follow"}
                    </Button>
                  </div>
                )}

                <Button
                  variant="success"
                  size="lg"
                  className="mx-2"
                  onClick={() => navigate(`/chat/${memberDetails._id}`)}
                >
                  Chat
                </Button>
                <Button
                  variant="warning"
                  size="lg"
                  className="mx-2"
                  onClick={() => alert("Calling")}
                >
                  Call
                </Button>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default CommunityDetail;
