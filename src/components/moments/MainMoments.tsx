import React from "react";
import {
  Container,
  Row,
  Col,
  Button,
  FormControl,
  Image,
} from "react-bootstrap";
import { FaPlus } from "react-icons/fa"; // Importing the plus icon
import { useGetMomentsQuery } from "../../store/slices/momentsSlice";
import Loader from "../Loader";
import Message from "../Message";
import SingleMoment from "./SingleMoment";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { MomentType } from "./types";

const MainMoments = () => {
  const { data, isLoading, error, refetch } = useGetMomentsQuery({});
  const userId = useSelector((state: any) => state.auth.userInfo?.user._id);
  const userInfo = useSelector((state: any) => state.auth.userInfo);

  const navigate = useNavigate();
  const handleAddMoment = () => {
    navigate("/add-moment"); // Navigate to the desired route
  };
  const moments = data as MomentType[];

  return (
    <Container
      style={{ minHeight: "100vh" }}
      className="d-flex flex-column justify-content-center"
    >
      <Row className="mt-3">
        <Col xs={9} className="d-flex justify-content-center">
          <Image
            src={userInfo.user.images[0]} // Replace with your image URL or source
            roundedCircle
            width="50" // Adjust size as needed
            height="50"
          />

          <Button
            variant="outline-secondary"
            onClick={handleAddMoment}
            style={{
              marginLeft: "10px",
              padding: "10px",
              width: "100%", // Full width to align with the image size
              textAlign: "start", // Center the button text
            }}
          >
            What's on your mind, {userInfo.user.name}?
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
                commentCount={moment.commentCount}
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
      {userId && (
        <Button
          className="add-button fixed-bottom-right d-flex justify-content-center align-items-center"
          variant="success"
          onClick={handleAddMoment}
          style={{
            position: "fixed",
            bottom: "20px", // Adjust to desired spacing from the bottom
            right: "20px", // Adjust to desired spacing from the right
            borderRadius: "50%",
            width: "60px", // Button size
            height: "60px", // Button size
            padding: "0",
          }}
        >
          <FaPlus style={{ fontSize: "30px", color: "white" }} />
        </Button>
      )}
    </Container>
  );
};

export default MainMoments;
