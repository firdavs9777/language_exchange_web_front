import React from "react";
import {
  Button,
  Card,
  ListGroup,
  ListGroupItem,
  Row,
  Col,
  Image,
} from "react-bootstrap";
import { MomentType } from "./MainMoments";
import { Link } from "react-router-dom";
import { AiFillLike } from "react-icons/ai";
import { FaRegComment } from "react-icons/fa";
import { IoMdShare } from "react-icons/io";
import "./SingleMoment.css";

const SingleMoment: React.FC<MomentType> = ({
  _id,
  title,
  description,
  likeCount,
  user,
  imageUrls,
}) => {
  return (
    <Link to={`/moment/${_id}`}>
      <Card className="my-3 p-4 rounded shadow-sm post-card">
        <ListGroup variant="flush">
          <ListGroupItem className="d-flex align-items-center">
            <Image
              src={user.imageUrls[0] || "https://via.placeholder.com/50"}
              roundedCircle
              className="profile-pic"
            />
            <div className="ms-3">
              <h6 className="mb-0">{user.name}</h6>
              <small className="text-muted">
                {new Date().toLocaleString()}
              </small>
            </div>
          </ListGroupItem>

          {imageUrls.length > 0 ? (
            <Card.Img
              variant="top"
              src={imageUrls[0]}
              alt={title}
              className="post-image"
            />
          ) : (
            <></>
          )}

          <Card.Body>
            <Card.Title>{title}</Card.Title>
            <Card.Text>{description}</Card.Text>
          </Card.Body>

          <ListGroupItem className="d-flex justify-content-between">
            <Button variant="link" className="text-dark">
              <AiFillLike className="icon" /> {likeCount}
            </Button>
            <Button variant="link" className="text-dark">
              <FaRegComment className="icon" /> {user.__v}
            </Button>
            <Button variant="link" className="text-dark">
              <IoMdShare className="icon" />
            </Button>
          </ListGroupItem>
        </ListGroup>
      </Card>
    </Link>
  );
};

export default SingleMoment;
