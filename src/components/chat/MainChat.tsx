import { Col, Row } from "react-bootstrap";
import UsersList from "./UsersList";
import ChatContent from "./ChatContent";
import { useState } from "react";

const MainChat: React.FC = () => {
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  return (
    <Row className="g-0" style={{ height: "100vh" }}>
      <Col md={3} className="h-100">
        <UsersList onSelectUser={(userId: string) => setSelectedUser(userId)} />
      </Col>
      <Col md={9} className="h-100">
        {selectedUser ? (
          <ChatContent selectedUser={selectedUser} />
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