import React from "react";
import { useGetMyMomentsQuery } from "../../store/slices/momentsSlice";
import { useSelector } from "react-redux";
import { MomentType } from "../moments/types";
import { Col, Row, Card, ListGroup, ListGroupItem, Button, Image } from "react-bootstrap";
import { AiFillEdit, AiFillLike, AiOutlineLike } from "react-icons/ai";
import { FaComments, FaPlus, FaRegComments } from "react-icons/fa";
import { IoMdShare } from "react-icons/io";
import { Link, useNavigate } from "react-router-dom";
import { Moment } from "./Profile";
import { FiEdit, FiTrash2 } from 'react-icons/fi'
const MyMoments = () => {
  const userId = useSelector((state: any) => state.auth.userInfo?.user._id);
  const { data: moments, refetch } = useGetMyMomentsQuery({ userId });
  const momentsData = moments as Moment;
    const navigate = useNavigate();
  const handleAddMoment = () => {
    navigate("/add-moment"); // Navigate to the desired route
  };
  return (
    <div>
      <Row>
        {momentsData?.data.map((moment: MomentType) => (
          <Col md={6} sm={6} lg={4} xl={3} key={moment._id} className="d-flex mb-4">
            <Link to={`/moment/${moment._id}`} className="text-decoration-none">
              <Card className="my-3 p-4 rounded shadow-sm post-card">
                <ListGroup variant="flush">
                  <Link to={`/community/${moment.user._id}`}>
                    <Card className="card-header">
                      <ListGroupItem className="d-flex align-items-center">
                        <Image
                          src={
                            moment.user?.imageUrls?.length > 0
                              ? moment.user.imageUrls[0]
                              : "https://via.placeholder.com/50"
                          }
                          roundedCircle
                          className="profile-pic"
                        />
                        <div className="ms-3">
                          <h6 className="mb-0">{moment.user.name}</h6>
                          <small className="text-muted">
                            {new Date(moment.createdAt).toLocaleString()}
                          </small>
                        </div>
                      </ListGroupItem>
                    </Card>
                  </Link>

                  {moment.imageUrls.length > 0 && (
                    <Card.Img
                      variant="top"
                      src={moment.imageUrls[0]}
                      alt={moment.title}
                      className="post-image"
                    />
                  )}

                  <Card.Body>
                    <Card.Title>{moment.title}</Card.Title>
                    <Card.Text>{moment.description}</Card.Text>
                  </Card.Body>

                  <ListGroupItem className="d-flex justify-content-between">
                    <Button variant="link" className="text-dark" onClick={() => { }}>
                      {moment.likedUsers.includes(userId) ? (
                        <AiFillLike className="icon" size={24} />
                      ) : (
                          <AiOutlineLike className="icon" size={24} color="blue" />
                      )}
                      {moment.likeCount}
                    </Button>

                    <Button variant="link" className="text-dark">
                      <span className="commentCount" style={{ padding: "5px" }}>
                        {moment.commentCount.toString()}
                      </span>
                      {moment.commentCount !== 0 ? (
                        <>
                          <FaComments className="comment-icon" size={24} color="blue" />
                        </>
                      ) : (
                        <>
                          <FaRegComments className="comment-icon-empty" size={24} />
                        </>
                      )}
                    </Button>

                    <Button variant="link" className="text-dark">
                      <IoMdShare className="icon" size={24} color="blue"/>
                    </Button>
                  </ListGroupItem>
                  <ListGroupItem>
                    <Button variant="link" className="text-dark me-2">
                      <FiEdit className="icon" size={24} />
                    </Button>
                    <Button variant="link" className="text-danger">
                      <FiTrash2 className="icon" size={24} />
                    </Button>
                  </ListGroupItem>
                </ListGroup>
              </Card>
            </Link>
          </Col>
        ))}
      </Row>
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
    </div>
  );
};

export default MyMoments;
