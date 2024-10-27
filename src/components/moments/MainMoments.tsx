import React from "react";
import { Container, Row, Col, Button } from "react-bootstrap";
import { useGetMomentsQuery } from "../../store/slices/momentsSlice";
import Loader from "../Loader";
import Message from "../Message";
import SingleMoment from "./SingleMoment";
import { useNavigate } from "react-router-dom";

export interface MomentType {
  _id: string;
  title: string;
  description: string;
  images: string[];
  likeCount: number;
  likedUsers: string[];
  user: {
    _id: string;
    name: string;
    gender: string;
    email: string;
    bio: string;
    birth_year: string;
    birth_month: string;
    birth_day: string;
    image: string;
    native_language: string;
    language_to_learn: string;
    createdAt: string;
    imageUrls: string[];
    __v: number;
  };
  createdAt: string;
  __v: number;
  imageUrls: string[];
  refetch?: () => {};
}

//     final String id;
//     final String title;
//     final String description;
//     final String image;
//     final DateTime createdAt;
//     likeCount: string
// }
const MainMoments = () => {
  const { data, isLoading, error, refetch } = useGetMomentsQuery({});

  const navigate = useNavigate();
  const handleAddMoment = () => {
    navigate("/add-moment"); // Navigate to the desired route
  };

  const moments = data as MomentType[];
  return (
    <Container fluid>
      <Row className="mt-2">
        <Col className="d-flex justify-content-end text-center">
          <Button
            className="add-button mt-1 ml-auto"
            variant="success"
            onClick={handleAddMoment}
          >
            Add Moment
          </Button>
        </Col>
      </Row>
      <Row className="mt-2">
        {isLoading ? (
          <Loader />
        ) : error ? (
          <Message variant="danger">Error Occured</Message>
        ) : moments ? (
          moments.map((moment: MomentType) => (
            <Col md={6} sm={6} lg={4} xl={3} key={moment._id} className="mb-4">
              <SingleMoment
                _id={moment._id}
                title={moment.title}
                description={moment.description}
                images={[]}
                likeCount={moment.likeCount}
                user={moment.user}
                likedUsers={moment.likedUsers}
                imageUrls={moment.imageUrls}
                createdAt={moment.createdAt}
                __v={moment.__v}
                refetch={refetch}
              />
            </Col>
          ))
        ) : (
          <p>No Moments yet</p>
        )}
      </Row>
    </Container>
  );
};
export default MainMoments;
