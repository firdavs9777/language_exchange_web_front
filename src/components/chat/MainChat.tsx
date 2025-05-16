import { Col, Row } from "react-bootstrap";
import UsersList from "./UsersList";
import ChatContent from "./ChatContent";
import { useNavigate, useParams } from "react-router-dom";

const MainChat: React.FC = () => {
  

   const { userId } = useParams<{ userId?: string }>();
  const navigate = useNavigate();

  const handleSelectUser = (userId: string) => {
    navigate(`/chat/${userId}`);
  };

  return (
    <Row className="g-0" style={{ height: "100vh" }}>
      <Col md={3} className="h-100">
        <UsersList onSelectUser={handleSelectUser} activeUserId={userId} />
      </Col>
      <Col md={9} className="h-100">
        
        {userId ? (
          <ChatContent selectedUser={userId} />
        ) : (
          <div className="d-flex align-items-center justify-content-center h-100">
            Select a user to start chatting
          </div>
        )}
      </Col>
    </Row>
  );
};

export default MainChat;