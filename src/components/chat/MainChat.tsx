import { Col, Row } from "react-bootstrap";
import UsersList from "./UsersList";
import ChatContent from "./ChatContent";
import { useState } from "react";

const MainChat: React.FC = () => {
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  return (
    <Row className="h-100">
      <Col md={3}>
        <UsersList onSelectUser={(userId: string) => setSelectedUser(userId)} />
      </Col>
      <Col md={9}>
        {selectedUser ? (
          <ChatContent selectedUser={selectedUser} />
        ) : (
          <div>Select a user to start chatting</div>
        )}
      </Col>
    </Row>
  );
};

export default MainChat;
