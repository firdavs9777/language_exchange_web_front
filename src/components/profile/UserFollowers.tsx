import React from "react";
import "./UserFollowers.css";
import { useGetFollowersQuery } from "../../store/slices/usersSlice";
import { useSelector } from "react-redux";
import { FollowerInterface } from "./Profile";
import { Card, Col, Row, Container } from "react-bootstrap";
import { Link } from "react-router-dom";

const UserFollowersList = () => {
  const userId = useSelector((state: any) => state.auth.userInfo?.user._id);
  const {
    data: followers,
    isLoading: isLoading_two,
    error: ErrorMessage,
  } = useGetFollowersQuery({ userId });

  const followersDataMain = followers as FollowerInterface;

  return (
    <Container className="followers-container my-4">
      <h1 className="mb-4 text-center">Followers({followersDataMain.count})</h1>
      <Row className="g-4">
        {followersDataMain?.followers?.map((follower) => (
          <Col xs={12} sm={6} md={4} lg={3} key={follower._id}>
            <Link to={`/community/${follower._id}`}>
              <Card className="shadow-sm community-card hover-card h-100">
                <div className="image-wrapper">
                  <Card.Img
                    variant="top"
                    src={follower.imageUrls[0] || "/placeholder.jpg"}
                    alt={follower.name}
                    className="community-image"
                  />
                </div>
                <Card.Body className="community-profile">
                  <Card.Title>{follower.name}</Card.Title>
                  <Card.Text className="bio">
                    <strong>Bio:</strong> {follower.bio || "No bio available"}
                  </Card.Text>
                  <Card.Text>
                    <strong>Native Language:</strong> {follower.native_language}
                  </Card.Text>
                  <Card.Text>
                    <strong>Learning:</strong> {follower.language_to_learn}
                  </Card.Text>
                </Card.Body>
              </Card>
            </Link>
          </Col>
        ))}
      </Row>
    </Container>
  );
};

export default UserFollowersList;
