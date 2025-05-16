import React, { useState } from "react";
import { Col, Row, Container, Card } from "react-bootstrap";
import UsersList from "./UsersList";
import ChatContent from "./ChatContent";
import { useNavigate, useParams } from "react-router-dom";
import { profile } from "console";

const MainChat: React.FC = () => {
  const { userId } = useParams<{ userId?: string }>();
  const [userName, setUserName] = useState<string>("");
   const [profilePicture, setProfilePicture] = useState<string>("");
  const navigate = useNavigate();

  const handleSelectUser = (userId: string, userName: string, profilePicture: string) => {
    navigate(`/chat/${userId}`);
    setUserName(userName);
    setProfilePicture(profilePicture)

  };

  return (
    <Container fluid className="p-0">
      <Row className="g-0 vh-100">
        {/* Left sidebar - Users list */}
        <Col md={3} lg={3} xl={2} className="border-end shadow-sm bg-white">
          <div className="d-flex flex-column h-100">
            <div className="p-3 border-bottom bg-light">
              <h5 className="mb-0 fw-bold text-primary">
                <i className="bi bi-chat-dots-fill me-2"></i>
                Messages
              </h5>
            </div>
            <div className="flex-grow-1 overflow-auto">
              <UsersList onSelectUser={handleSelectUser} activeUserId={userId} />
            </div>
          </div>
        </Col>
        
        {/* Right side - Chat content */}
        <Col md={9} lg={9} xl={10} className="bg-light">
          {userId ? (
            <ChatContent selectedUser={userId} userName={userName} profilePicture={profilePicture} />
          ) : (
            <div className="d-flex align-items-center justify-content-center h-100 flex-column text-center p-4">
              <div className="mb-4">
                <div className="bg-white rounded-circle p-4 shadow-sm d-inline-flex align-items-center justify-content-center" style={{ width: "120px", height: "120px" }}>
                  <i className="bi bi-chat-text text-primary" style={{ fontSize: "3rem" }}></i>
                </div>
              </div>
              <Card className="border-0 shadow-sm" style={{ maxWidth: "400px" }}>
                <Card.Body>
                  <h4 className="mb-3">Welcome to Chat</h4>
                  <p className="text-muted mb-4">
                    Select a conversation from the list to start chatting or search for a user to begin a new conversation.
                  </p>
                  <div className="d-grid">
                    <button className="btn btn-primary rounded-pill">
                      <i className="bi bi-plus-circle me-2"></i>
                      Start New Chat
                    </button>
                  </div>
                </Card.Body>
              </Card>
            </div>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default MainChat;