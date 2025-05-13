import React from "react";
import { ListGroup, Spinner, Alert } from "react-bootstrap";
import { useGetUserMessagesQuery } from "../../store/slices/chatSlice";
import { useSelector } from "react-redux";

interface User {
  _id: string;
  name: string;
  // Add other user properties as needed
}

interface Message {
  sender: User;
  // Add other message properties as needed
}

interface ApiResponse {
  data: Message[];
  // Add other response properties as needed
}

interface UsersListProps {
  onSelectUser: (userId: string) => void;
}

const UsersList: React.FC<UsersListProps> = ({ onSelectUser }) => {
  const userId = useSelector((state: any) => state.auth.userInfo?.user._id);
  const { data, error, isLoading } = useGetUserMessagesQuery(userId);

  // Extract unique senders
  const uniqueSenders = React.useMemo(() => {
    const sendersMap = new Map<string, User>();
    
    data?.data.forEach((message: Message) => {
      const sender = message.sender;
      if (sender._id !== userId && !sendersMap.has(sender._id)) {
        sendersMap.set(sender._id, sender);
      }
    });

    return Array.from(sendersMap.values());
  }, [data, userId]);

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center py-4">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger" className="m-3">
        Error loading users
      </Alert>
    );
  }

  return (
    <div className="h-100 d-flex flex-column">
      <h5 className="p-3 border-bottom">Chats</h5>
      <div className="flex-grow-1 overflow-auto">
        <ListGroup variant="flush">
          {uniqueSenders.length > 0 ? (
            uniqueSenders.map((sender) => (
              <ListGroup.Item
                key={sender._id}
                action
                onClick={() => onSelectUser(sender._id)}
                className="d-flex justify-content-between align-items-center px-3 py-3 border-0 border-bottom"
              >
                <div className="d-flex align-items-center">
                  <div className="bg-primary rounded-circle me-3" style={{ width: '40px', height: '40px' }} />
                  <span className="fw-medium">{sender.name}</span>
                </div>
              </ListGroup.Item>
            ))
          ) : (
            <div className="text-center py-4 text-muted">
              No conversations found
            </div>
          )}
        </ListGroup>
      </div>
    </div>
  );
};

export default UsersList;