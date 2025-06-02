import React, { useEffect, useRef, useCallback } from "react";
import { ListGroup, Spinner, Alert, Badge } from "react-bootstrap";
import { useGetUserMessagesQuery } from "../../store/slices/chatSlice";
import { useSelector } from "react-redux";
import { RootState } from "../../store/index";
import io, { Socket } from "socket.io-client";
import { BASE_URL } from "../../constants";

interface User {
  _id: string;
  name: string;
  avatar?: string;
  lastMessage?: string;
  unreadCount?: number;
  lastMessageTime?: Date;
  imageUrls: string[];
  status?: "online" | "offline" | "away";
  lastSeen?: Date;
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
  onSelectUser: (
    userId: string,
    userName: string,
    profilePicture: string
  ) => void;
  activeUserId?: string | null;
  searchQuery?: string;
}

const UsersList: React.FC<UsersListProps> = ({
  onSelectUser,
  activeUserId,
  searchQuery = "",
}) => {
  const currentUser = useSelector(
    (state: RootState) => state.auth.userInfo?.user
  );
  const { data, error, isLoading, isError, refetch } = useGetUserMessagesQuery(
    currentUser?._id
  );
  const token = useSelector((state: RootState) => state.auth.userInfo?.token);

  // Use useRef to maintain socket instance across renders
  const socketRef = useRef<Socket | null>(null);
  const [userStatuses, setUserStatuses] = React.useState<
    Record<string, { status: string; lastSeen?: Date }>
  >({});

  // Initialize socket connection
  const initializeSocket = useCallback(() => {
    if (!token || !currentUser?._id) return;

    const SOCKET_URL = BASE_URL;

    // Disconnect existing socket if any
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    socketRef.current = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket"],
    });

    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("✅ Connected to socket server");
    });

    socket.on(
      "newMessage",
      (data: { message: Message; unreadCount: number }) => {
        console.log("📨 Received new message:", data);
        refetch(); // Refresh the message list
      }
    );

    socket.on(
      "messageSent",
      (data: { message: Message; unreadCount: number }) => {
        console.log("📤 Message sent confirmation:", data);
        refetch(); // Refresh to show the sent message
      }
    );

    socket.on("messagesRead", (data: { readBy: string; count: number }) => {
      console.log("📖 Messages marked as read:", data);
      refetch(); // Refresh to update read status
    });

    socket.on(
      "userStatusUpdate",
      (data: { userId: string; status: string; lastSeen?: Date }) => {
        console.log("🟢 User status update:", data);
        setUserStatuses((prev) => ({
          ...prev,
          [data.userId]: {
            status: data.status,
            lastSeen: data.lastSeen ? new Date(data.lastSeen) : undefined,
          },
        }));
      }
    );

    socket.on("userTyping", (data: { userId: string; isTyping: boolean }) => {
      console.log("⌨️ User typing:", data);
      // You can implement typing indicators here
    });

    socket.on("disconnect", (reason) => {
      console.log("❌ Disconnected from socket server:", reason);
    });

    socket.on("error", (error) => {
      console.error("❌ Socket error:", error);
    });

    return socket;
  }, [token, currentUser?._id, refetch]);

  // Initialize socket on mount and when dependencies change
  useEffect(() => {
    initializeSocket();

    return () => {
      if (socketRef.current) {
        socketRef.current.off();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [initializeSocket]);

  // Mark messages as read when user is selected
  useEffect(() => {
    if (activeUserId && socketRef.current) {
      socketRef.current.emit(
        "markAsRead",
        { senderId: activeUserId },
        (response) => {
          if (response?.status === "success") {
            console.log(`📖 Marked ${response.markedCount} messages as read`);
            refetch(); // Refresh to update unread counts
          }
        }
      );
    }
  }, [activeUserId, refetch]);

  // Extract conversation partners with last message and unread count
  const chatPartners = React.useMemo(() => {
    if (!data?.data || !currentUser) return [];

    const partnersMap = new Map<
      string,
      User & {
        lastMessage?: string;
        unreadCount: number;
        lastMessageTime?: Date;
      }
    >();

    data.data.forEach((message: Message) => {
      // Determine the other user in the conversation
      const otherUser =
        message.sender._id === currentUser._id
          ? message.receiver
          : message.sender;

      const isIncoming = message.sender._id !== currentUser._id;
      const isUnread = isIncoming && !message.read;

      const existingPartner = partnersMap.get(otherUser._id);
      const messageDate = new Date(message.createdAt);

      if (!existingPartner) {
        partnersMap.set(otherUser._id, {
          ...otherUser,
          lastMessage: message.message,
          unreadCount: isUnread ? 1 : 0,
          lastMessageTime: messageDate,
          status: (userStatuses[otherUser._id]?.status as any) || "offline",
          lastSeen: userStatuses[otherUser._id]?.lastSeen,
        });
      } else {
        // Update if this message is newer
        if (
          !existingPartner.lastMessageTime ||
          messageDate > existingPartner.lastMessageTime
        ) {
          existingPartner.lastMessage = message.message;
          existingPartner.lastMessageTime = messageDate;
        }
        if (isUnread) {
          existingPartner.unreadCount += 1;
        }
        // Update status
        existingPartner.status =
          (userStatuses[otherUser._id]?.status as any) || "offline";
        existingPartner.lastSeen = userStatuses[otherUser._id]?.lastSeen;
      }
    });

    return Array.from(partnersMap.values()).sort((a, b) => {
      // Sort by most recent message time
      const aTime = a.lastMessageTime?.getTime() || 0;
      const bTime = b.lastMessageTime?.getTime() || 0;
      return bTime - aTime;
    });
  }, [data, currentUser, userStatuses]);

  // Filter conversations based on search query
  const filteredChatPartners = React.useMemo(() => {
    if (!searchQuery.trim()) return chatPartners;

    const normalizedQuery = searchQuery.toLowerCase().trim();

    return chatPartners.filter((user) => {
      // Search by name
      if (user.name.toLowerCase().includes(normalizedQuery)) return true;

      // Search by message content
      if (user.lastMessage?.toLowerCase().includes(normalizedQuery))
        return true;

      return false;
    });
  }, [chatPartners, searchQuery]);

  // Manual reload function that can be called externally
  const handleReload = React.useCallback(() => {
    console.log("🔄 Manually reloading user messages...");
    refetch();
  }, [refetch]);

  // Expose reload function via ref (optional)
  React.useImperativeHandle(
    React.forwardRef(() => null),
    () => ({
      reload: handleReload,
    })
  );

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffInHours < 168) {
      // 7 days
      return date.toLocaleDateString([], { weekday: "short" });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "online":
        return "#10B981"; // green
      case "away":
        return "#F59E0B"; // yellow
      case "offline":
      default:
        return "#6B7280"; // gray
    }
  };

  if (isLoading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ height: "200px" }}
      >
        <div className="text-center">
          <Spinner
            animation="border"
            variant="primary"
            style={{ width: "2rem", height: "2rem" }}
          />
          <div className="mt-2 text-muted small">Loading conversations...</div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4">
        <Alert variant="danger" className="border-0 shadow-sm">
          <Alert.Heading className="h6 mb-2">
            <i className="bi bi-exclamation-triangle me-2"></i>
            Connection Error
          </Alert.Heading>
          <p className="mb-3 small">
            {error
              ? (error as any)?.data?.message || "Error loading conversations"
              : "An unexpected error occurred"}
          </p>
          <button
            className="btn btn-sm btn-outline-danger rounded-pill px-3"
            onClick={handleReload}
          >
            <i className="bi bi-arrow-clockwise me-1"></i>
            Try Again
          </button>
        </Alert>
      </div>
    );
  }

  // If we're searching and nothing was found
  if (searchQuery && filteredChatPartners.length === 0) {
    return (
      <div className="d-flex flex-column align-items-center justify-content-center text-center py-5">
        <div
          className="rounded-circle bg-light d-flex align-items-center justify-content-center mb-3"
          style={{ width: "64px", height: "64px" }}
        >
          <i
            className="bi bi-search text-muted"
            style={{ fontSize: "24px" }}
          ></i>
        </div>
        <h6 className="text-muted mb-1">No matching conversations</h6>
        <p className="text-muted small mb-0">Try adjusting your search terms</p>
      </div>
    );
  }

  return (
    <div className="h-100 d-flex flex-column">
      <div className="flex-grow-1 overflow-auto">
        {filteredChatPartners.length > 0 ? (
          <div className="list-group list-group-flush">
            {filteredChatPartners.map((user, index) => (
              <div
                key={user._id}
                className={`list-group-item list-group-item-action border-0 px-0 py-0 ${
                  activeUserId === user._id ? "active" : ""
                }`}
                onClick={() =>
                  onSelectUser(user._id, user.name, user.imageUrls[0])
                }
                style={{
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  borderBottom:
                    index === filteredChatPartners.length - 1
                      ? "none"
                      : "1px solid #f0f0f0",
                }}
              >
                <div className="d-flex align-items-center p-3 position-relative">
                  {/* Avatar with status indicator */}
                  <div className="position-relative me-3 flex-shrink-0">
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center overflow-hidden"
                      style={{
                        width: "48px",
                        height: "48px",
                        background: user.avatar
                          ? "transparent"
                          : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      }}
                    >
                      {user.avatar || user.imageUrls[0] ? (
                        <img
                          src={user.avatar || user.imageUrls[0]}
                          alt={user.name}
                          className="w-100 h-100"
                          style={{ objectFit: "cover" }}
                        />
                      ) : (
                        <span
                          className="text-white fw-bold"
                          style={{ fontSize: "18px" }}
                        >
                          {user.name?.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    {/* Status indicator */}
                    <div
                      className="position-absolute rounded-circle border border-2 border-white"
                      style={{
                        width: "14px",
                        height: "14px",
                        bottom: "2px",
                        right: "2px",
                        backgroundColor: getStatusColor(user.status),
                      }}
                    ></div>
                  </div>

                  {/* Content */}
                  <div className="flex-grow-1 min-width-0">
                    <div className="d-flex justify-content-between align-items-start mb-1">
                      <h6
                        className="mb-0 text-truncate fw-semibold"
                        style={{ fontSize: "15px" }}
                      >
                        {user.name}
                      </h6>
                      <div className="d-flex align-items-center ms-2">
                        {user.lastMessageTime && (
                          <small
                            className="text-muted me-2"
                            style={{
                              whiteSpace: "nowrap",
                              fontSize: "12px",
                              fontWeight: "500",
                            }}
                          >
                            {formatTime(user.lastMessageTime)}
                          </small>
                        )}
                        {user.unreadCount > 0 && (
                          <Badge
                            pill
                            bg="primary"
                            style={{
                              fontSize: "11px",
                              fontWeight: "600",
                              minWidth: "20px",
                              height: "20px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {user.unreadCount > 99 ? "99+" : user.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p
                      className="mb-0 text-muted text-truncate small"
                      style={{
                        fontSize: "13px",
                        lineHeight: "1.3",
                        fontWeight: user.unreadCount > 0 ? "500" : "400",
                      }}
                    >
                      {user.lastMessage || "No messages yet"}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="d-flex flex-column align-items-center justify-content-center text-center py-5">
            <div
              className="rounded-circle d-flex align-items-center justify-content-center mb-3"
              style={{
                width: "80px",
                height: "80px",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                opacity: "0.1",
              }}
            >
              <i
                className="bi bi-chat-square-text"
                style={{ fontSize: "32px", color: "#667eea" }}
              ></i>
            </div>
            <h6 className="text-muted mb-2">No conversations yet</h6>
            <p className="text-muted small mb-0 px-3">
              Start a conversation to see it appear here
            </p>
          </div>
        )}
      </div>

      <style jsx>{`
        .list-group-item.active {
          background: linear-gradient(
            135deg,
            #667eea 0%,
            #764ba2 100%
          ) !important;
          border-color: transparent !important;
          color: white !important;
        }

        .list-group-item.active .text-muted {
          color: rgba(255, 255, 255, 0.8) !important;
        }

        .list-group-item:hover:not(.active) {
          background-color: #f8f9fa !important;
        }

        @media (max-width: 768px) {
          .list-group-item .d-flex {
            padding: 0.75rem !important;
          }

          .position-relative.me-3 > div {
            width: 40px !important;
            height: 40px !important;
          }

          .position-relative.me-3 span {
            font-size: 16px !important;
          }

          .position-absolute.rounded-circle {
            width: 12px !important;
            height: 12px !important;
          }
        }

        @media (max-width: 576px) {
          .d-flex.align-items-center.p-3 {
            padding: 0.5rem !important;
          }
        }
      `}</style>
    </div>
  );
};

export default UsersList;
