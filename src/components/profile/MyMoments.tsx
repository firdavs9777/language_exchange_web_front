import React, { useState } from "react";
import { useGetMyMomentsQuery } from "../../store/slices/momentsSlice";
import { useSelector } from "react-redux";
import { MomentType } from "../moments/types";
import {
  Col,
  Row,
  Card,
  ListGroup,
  ListGroupItem,
  Button,
  Image,
} from "react-bootstrap";
import {
  AiFillLike,
  AiOutlineLike,
  AiFillEdit,
  AiFillDelete,
} from "react-icons/ai";
import { FaComments, FaRegComments } from "react-icons/fa";
import { IoMdShare } from "react-icons/io";
import { Link, useNavigate } from "react-router-dom";
import { Moment } from "./Profile";

const MyMoments = () => {
  const userId = useSelector((state: any) => state.auth.userInfo?.user._id);
  const { data: moments, refetch } = useGetMyMomentsQuery({ userId });
  // const [deleteMoment] = useDeleteMomentMutation();
  const momentsData = moments as Moment;
  const navigate = useNavigate();
  const [edit, setEditMode] = useState<"moment" | null>(null);
  // const handleDelete = async (momentId: string) => {
  //   try {
  //     await deleteMoment({ momentId }).unwrap();
  //     refetch(); // Refresh the moments list after deletion
  //   } catch (error) {
  //     console.error("Error deleting moment:", error);
  //   }
  // };

  const handleEdit = (momentId: string) => {
    navigate(`/edit-moment/${momentId}`); // Navigate to the edit page
  };

  return (
    <div>
      <Row>
        {momentsData?.data.map((moment: MomentType) => (
          <Col
            md={6}
            sm={6}
            lg={4}
            xl={3}
            key={moment._id}
            className="d-flex mb-4"
          >
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

                <ListGroupItem>
                  <Button
                    variant="link"
                    className="text-dark"
                    onClick={() => {}}
                  >
                    {moment.likedUsers.includes(userId) ? (
                      <AiFillLike className="icon" size={24} />
                    ) : (
                      <AiOutlineLike className="icon" size={24} />
                    )}
                    {moment.likeCount}
                  </Button>

                  <Button variant="link" className="text-dark">
                    <span className="commentCount" style={{ padding: "5px" }}>
                      {moment.commentCount.toString()}
                    </span>
                    {moment.commentCount !== 0 ? (
                      <>
                        <FaComments className="comment-icon" size={24} />
                      </>
                    ) : (
                      <>
                        <FaRegComments
                          className="comment-icon-empty"
                          size={24}
                        />
                      </>
                    )}
                  </Button>
                </ListGroupItem>

                <ListGroupItem className="d-flex justify-content-between">
                  <div className="d-flex">
                    <Button
                      variant="link"
                      className="text-primary"
                      onClick={() => handleEdit(moment._id)}
                    >
                      <AiFillEdit className="icon" size={20} />
                    </Button>
                    <Button
                      variant="link"
                      className="text-danger"
                      onClick={() => {}}
                    >
                      <AiFillDelete className="icon" size={20} />
                    </Button>
                    <Button variant="link" className="text-dark">
                      <IoMdShare className="icon" />
                    </Button>
                  </div>
                </ListGroupItem>
              </ListGroup>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default MyMoments;
