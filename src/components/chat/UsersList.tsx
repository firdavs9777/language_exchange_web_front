import React from "react";
import { ListGroup, Spinner, Alert, Badge } from "react-bootstrap";
import { useGetUserMessagesQuery } from "../../store/slices/chatSlice";
import { useSelector } from "react-redux";
import { RootState } from "../../store/index";

interface User {
  _id: string;
  name: string;
  avatar?: string;
  lastMessage?: string;
  unreadCount?: number;
  lastMessageTime?: Date;
  imageUrls: string[]
}

interface Message {
  _id: string;
  sender: User;
  receiver: User;
  message: string;
  createdAt: string;
  read: boolean;
}

interface UsersListProps {
  onSelectUser: (userId: string, userName: string, profilePicture: string) => void;
  activeUserId?: string | null;
  searchQuery?: string;
}

const UsersList: React.FC<UsersListProps> = ({ onSelectUser, activeUserId, searchQuery = "" }) => {
  const currentUser = useSelector((state: RootState) => state.auth.userInfo?.user);
  const { data, error, isLoading, isError } = useGetUserMessagesQuery(currentUser?._id);

  console.log(data)
  // Extract conversation partners with last message and unread count
  const chatPartners = React.useMemo(() => {
    if (!data?.data || !currentUser) return [];

    const partnersMap = new Map<string, User & { 
      lastMessage?: string; 
      unreadCount: number;
      lastMessageTime?: Date;
    }>();

    data.data.forEach((message: Message) => {
      console.log(message)
      // Determine the other user in the conversation
      const otherUser = message.sender._id === currentUser._id 
        ? message.receiver 
        : message.sender;

      const isIncoming = message.sender._id !== currentUser._id;
      const isUnread = isIncoming && !message.read;

      const existingPartner = partnersMap.get(otherUser._id);
      console.log(existingPartner)
      const messageDate = new Date(message.createdAt);

      if (!existingPartner) {
        partnersMap.set(otherUser._id, {
          ...otherUser,
          lastMessage: message.message,
          unreadCount: isUnread ? 1 : 0,
          lastMessageTime: messageDate
        });
      } else {
        // Update if this message is newer
        if (existingPartner.lastMessageTime && messageDate > existingPartner.lastMessageTime) {
          existingPartner.lastMessage = message.message;
          existingPartner.lastMessageTime = messageDate;
        }
        if (isUnread) {
          existingPartner.unreadCount += 1;
        }
      }
    });

    return Array.from(partnersMap.values()).sort((a, b) => {
      // Sort by most recent message time
      const aTime = a.lastMessageTime?.getTime() || 0;
      const bTime = b.lastMessageTime?.getTime() || 0;
      return bTime - aTime;
    });
  }, [data, currentUser]);

  // Filter conversations based on search query
  const filteredChatPartners = React.useMemo(() => {
    if (!searchQuery.trim()) return chatPartners;
    
    const normalizedQuery = searchQuery.toLowerCase().trim();
    
    return chatPartners.filter(user => {
      // Search by name
      if (user.name.toLowerCase().includes(normalizedQuery)) return true;
      
      // Search by message content
      if (user.lastMessage?.toLowerCase().includes(normalizedQuery)) return true;
      
      return false;
    });
  }, [chatPartners, searchQuery]);

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

  // If we're searching and nothing was found
  if (searchQuery && filteredChatPartners.length === 0) {
    return (
      <div className="text-center py-4 text-muted">
        <i className="bi bi-search fs-4 d-block mb-2"></i>
        No matching conversations found
      </div>
    );
  }

  return (
    <div className="h-100 d-flex flex-column">
      <div className="flex-grow-1 overflow-auto">
        <ListGroup variant="flush" as="ul">
          {filteredChatPartners.length > 0 ? (
            filteredChatPartners.map((user) => (
              <ListGroup.Item
                as="li"
                key={user._id}
                action
                active={activeUserId === user._id}
                onClick={() => onSelectUser(user._id, user.name, user.imageUrls[0])}
                className="d-flex justify-content-between align-items-center px-3 py-3 border-0 border-bottom"
                aria-current={activeUserId === user._id ? "true" : undefined}
              >
                <div className="d-flex align-items-center flex-grow-1 overflow-hidden">
                  <div 
                    className="rounded-circle me-3 d-flex align-items-center justify-content-center bg-light"
                    style={{ 
                      width: '40px', 
                      height: '40px',
                      flexShrink: 0
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
                      <span className="text-dark fw-bold">
                        {user.name?.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-grow-1 overflow-hidden">
                    <div className="d-flex justify-content-between">
                      <span className="fw-medium text-truncate">{user.name}</span>
                      {user.lastMessageTime && (
                        <small className="text-muted ms-2" style={{ whiteSpace: 'nowrap' }}>
                          {new Date(user.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </small>
                      )}
                    </div>
                    <small className="text-muted text-truncate d-block">
                      {user.lastMessage || 'No messages yet'}
                    </small>
                  </div>
                </div>
                {user.unreadCount > 0 && (
                  <Badge pill bg="danger" className="ms-2">
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