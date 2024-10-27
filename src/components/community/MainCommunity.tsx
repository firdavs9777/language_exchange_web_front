import { useNavigate } from "react-router-dom";
import { Col, Container, Row, Card, Button } from "react-bootstrap";
import Message from "../Message";
import Loader from "../Loader";
import { useGetCommunityMembersQuery } from "../../store/slices/communitySlice";
import { Link } from "react-router-dom";

import "./MainCommunity.css";
import { useSelector } from "react-redux";
export interface CommunityType {
  success: boolean;
  count: number;
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
    imageUrls: string[];
    __v: number;
  }[];
}

const MainCommunity = () => {
  const { data, isLoading, error } = useGetCommunityMembersQuery({});
  const userId = useSelector((state: any) => state.auth.userInfo?.user._id);
  const community = data as CommunityType | undefined;

  return (
    <Container fluid>
      <Row className="mt-4">
        {isLoading ? (
          <Loader />
        ) : error ? (
          <Message variant="danger">Error Occurred</Message>
        ) : community ? (
          community.data
            .filter((member) => member._id !== userId)
            .map((member) => (
              <Col
                md={6}
                sm={6}
                lg={3}
                xl={3}
                key={member._id}
                className="mb-4"
              >
                <Link to={`/community/${member._id}`}>
                  <Card className="shadow-sm community-card">
                    <Card.Img
                      variant="top"
                      src={member.imageUrls[0] || "placeholder.jpg"}
                      alt={member.name}
                      className="community-image"
                    />
                    <Card.Body className="community-profile">
                      <Card.Title>{member.name}</Card.Title>
                      <Card.Text className="bio">
                        <strong>Bio:</strong> {member.bio}
                      </Card.Text>
                      <Card.Text>
                        <strong>Native Language:</strong>{" "}
                        {member.native_language}
                      </Card.Text>
                      <Card.Text>
                        <strong>Learning:</strong> {member.language_to_learn}
                      </Card.Text>
                    </Card.Body>
                  </Card>
                </Link>
              </Col>
            ))
        ) : (
          <p>No Members yet</p>
        )}
      </Row>
    </Container>
  );
};

export default MainCommunity;
