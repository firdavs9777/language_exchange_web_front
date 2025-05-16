import React from "react";
import { ListGroup, Spinner, Alert, Badge } from "react-bootstrap";
import { useGetUserMessagesQuery } from "../../store/slices/chatSlice";
import { useSelector } from "react-redux";
import { RootState } from "../../store/store";

interface User {
  _id: string;
  name: string;
  avatar?: string;
  lastMessage?: string;
  unreadCount?: number;
}

interface Message {
  _id: string;
  sender: User;
  content: string;
  createdAt: string;
  read: boolean;
}

interface MessagesResponse {
  data: Message[];
  total: number;
  unreadCount: number;
}

interface UsersListProps {
  onSelectUser: (userId: string) => void;
  activeUserId?: string | null;
}

const UsersList: React.FC<UsersListProps> = ({ onSelectUser, activeUserId }) => {
  const userId = useSelector((state: RootState) => state.auth.userInfo?.user._id);
  const { data, error, isLoading, isError } = useGetUserMessagesQuery(userId);

  // Extract unique senders with latest message and unread count
  const chatUsers = React.useMemo(() => {
    if (!data?.data) return [];

    const usersMap = new Map<string, User & { lastMessage?: string; unreadCount: number }>();

    data.data.forEach((message: Message) => {
      const sender = message.sender;
      if (sender._id === userId) return; // Skip own messages

      const existingUser = usersMap.get(sender._id);
      const isUnread = !message.read && message.sender._id !== userId;

      if (!existingUser) {
        usersMap.set(sender._id, {
          ...sender,
          lastMessage: message.content,
          unreadCount: isUnread ? 1 : 0
        });
      } else {
        // Update with newer message if applicable
        const currentMessageDate = new Date(message.createdAt);
        const existingMessageDate = existingUser.lastMessage 
          ? new Date(existingUser.lastMessage)
          : new Date(0);

        if (currentMessageDate > existingMessageDate) {
          existingUser.lastMessage = message.content;
        }
        if (isUnread) {
          existingUser.unreadCount += 1;
        }
      }
    });

    return Array.from(usersMap.values()).sort((a, b) => {
      // Sort by most recent message (you'll need to implement this properly)
      return new Date(b.lastMessage || 0).getTime() - new Date(a.lastMessage || 0).getTime();
    });
  }, [data, userId]);

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center py-4" aria-busy="true">
        <Spinner animation="border" variant="primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  if (isError) {
    return (
      <Alert variant="danger" className="m-3">
        {error ? (
          (error as any)?.data?.message || "Error loading conversations"
        ) : (
          "An unexpected error occurred"
        )}
      </Alert>
    );
  }

  return (
    <div className="h-100 d-flex flex-column">
      <h5 className="p-3 border-bottom mb-0">Conversations</h5>
      <div className="flex-grow-1 overflow-auto">
        <ListGroup variant="flush" as="ul">
          {chatUsers.length > 0 ? (
            chatUsers.map((user) => (
              <ListGroup.Item
                as="li"
                key={user._id}
                action
                active={activeUserId === user._id}
                onClick={() => onSelectUser(user._id)}
                className="d-flex justify-content-between align-items-center px-3 py-3 border-0 border-bottom"
                aria-current={activeUserId === user._id ? "true" : undefined}
              >
                <div className="d-flex align-items-center">
                  <div 
                    className={`rounded-circle me-3 d-flex align-items-center justify-content-center ${user.avatar ? '' : 'bg-primary text-white'}`}
                    style={{ 
                      width: '40px', 
                      height: '40px',
                      backgroundColor: user.avatar ? 'transparent' : undefined
                    }}
                  >
                    {user.avatar ? (
                      <img 
                        src={user.avatar} 
                        alt={user.name} 
                        className="rounded-circle"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      user?.name?.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <span className="fw-medium d-block">{user.name}</span>
                    <small className="text-muted text-truncate d-block" style={{ maxWidth: '150px' }}>
                      {user.lastMessage || 'No messages yet'}
                    </small>
                  </div>
                </div>
                {user.unreadCount > 0 && (
                  <Badge pill bg="danger">
                    {user.unreadCount}
                  </Badge>
                )}
              </ListGroup.Item>
            ))
          ) : (
            <div className="text-center py-4 text-muted">
              <i className="bi bi-chat-square-text fs-4 d-block mb-2"></i>
              No conversations found
            </div>
          )}
        </ListGroup>
      </div>
    </div>
  );
};

export default UsersList;