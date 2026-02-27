import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button, Form, Container, Row, Col } from "react-bootstrap";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import {
  useCreateMessageMutation,
  useGetConversationQuery,
  useMarkConversationReadMutation,
} from "../../store/slices/chatSlice";
import io, { Socket } from "socket.io-client";
import "./ChatContent.css";
import { BASE_URL } from "../../constants";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

// Define types for Redux state
interface RootState {
  auth: {
    userInfo: {
      user: {
        _id: string;
        name?: string;
        imageUrls?: string[];
      };
      token: string;
    };
  };
}

// Socket instance is now stored in a ref inside the component

interface ChatContentProps {
  selectedUser: string;
  userName: string;
  profilePicture: string;
  initialIsOnline?: boolean;
  initialLastSeen?: string;
}

interface Message {
  _id: string;
  message: string;
  sender: {
    _id: string;
    name: string;
    imageUrls?: string[];
  };
  receiver: string;
  createdAt: string;
  isOptimistic?: boolean;
  status?: "sent" | "delivered" | "error";
}

const ChatContent: React.FC<ChatContentProps> = ({
  selectedUser,
  userName,
  profilePicture,
  initialIsOnline = false,
  initialLastSeen = "",
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const userId = useSelector(
    (state: RootState) => state.auth.userInfo?.user?._id
  );
  const token = useSelector((state: RootState) => state.auth.userInfo?.token);
  const currentUserName = useSelector(
    (state: RootState) => state.auth.userInfo?.user?.name
  );

  const { data, error, isLoading, refetch } = useGetConversationQuery(
    {
      senderId: userId,
      receiverId: selectedUser,
    },
    {
      skip: !userId || !selectedUser,
    }
  );

  const [createMessage] = useCreateMessageMutation();
  const [markConversationRead] = useMarkConversationReadMutation();

  const [newMessage, setNewMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [isOnline, setIsOnline] = useState(initialIsOnline);
  const [lastSeen, setLastSeen] = useState<string>(initialLastSeen);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const tempIdRef = useRef<string>();
  const lastMessageId = useRef<string>();
  const socketRef = useRef<Socket | null>(null);

  // Update online status when initial props change (new user selected)
  useEffect(() => {
    setIsOnline(initialIsOnline);
    setLastSeen(initialLastSeen);
  }, [initialIsOnline, initialLastSeen, selectedUser]);

  // Initialize Socket.IO connection when token changes
  useEffect(() => {
    if (!token) return;

    const SOCKET_URL = BASE_URL;

    // Disconnect existing socket if any
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    socketRef.current = io(SOCKET_URL, {
      auth: {
        token: token,
      },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    const socket = socketRef.current;

    socket.on("connect", () => {
      console.log("Connected to socket server");

      // Request initial user status when socket connects
      if (selectedUser) {
        socket.emit("getUserStatus", { userId: selectedUser }, (response: any) => {
          if (response?.status === "success" && response?.data) {
            setIsOnline(response.data.status === "online");
            if (response.data.lastSeen) {
              setLastSeen(response.data.lastSeen);
            }
          }
        });
      }
    });

    socket.on("connect_error", (error: Error) => {
      console.error("Socket connection error:", error);
    });

    // Enhanced online status listeners
    socket.on("userOnline", (data: { userId: string }) => {
      if (data.userId === selectedUser) {
        setIsOnline(true);
        setLastSeen("");
      }
    });

    socket.on("userOffline", (data: { userId: string; lastSeen: string }) => {
      if (data.userId === selectedUser) {
        setIsOnline(false);
        setLastSeen(data.lastSeen);
      }
    });

    // Handle user status updates
    socket.on("userStatusUpdate", (data: { userId: string; status: string; lastSeen?: string }) => {
      if (data.userId === selectedUser) {
        setIsOnline(data.status === 'online');
        if (data.lastSeen) {
          setLastSeen(data.lastSeen);
        }
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.off();
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [token, selectedUser]);

  // Load initial messages and mark as read
  useEffect(() => {
    if (data?.data) {
      setMessages(data.data);

      // Mark messages as read when conversation is opened
      const socket = socketRef.current;
      if (socket?.connected) {
        socket.emit("markAsRead", { senderId: selectedUser }, (response: any) => {
          if (response?.status === "success") {
            console.log(`Marked ${response.markedCount} messages as read`);
          }
        });
      }
    }
  }, [data, selectedUser]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !selectedUser) return;

    // Handler for new messages - Updated to match server event name
    const handleNewMessage = (notificationData: {
      message: Message;
      unreadCount: number;
      isNewConversation: boolean;
      senderId?: string;
    }) => {
      const newMsg = notificationData.message;
      console.log("Received new message:", newMsg);

      // Only add message if it's from the current conversation partner
      const isFromCurrentConversation =
        newMsg.sender._id === selectedUser ||
        newMsg.receiver === selectedUser ||
        notificationData.senderId === selectedUser;

      if (isFromCurrentConversation) {
        setMessages((prevMessages) => {
          if (prevMessages.some((msg) => msg._id === newMsg._id)) {
            return prevMessages;
          }
          return [...prevMessages, newMsg];
        });
      }
    };

    // Handler for message errors
    const handleMessageError = (errorData: {
      message: string;
      error: string;
    }) => {
      console.error("Message error:", errorData);
      setMessages((prevMessages) => {
        return prevMessages.map((msg) => {
          if (msg.isOptimistic && msg._id === tempIdRef.current) {
            return { ...msg, status: "error" };
          }
          return msg;
        });
      });
    };

    // Handler for typing indicators - Updated to match server event
    const handleUserTyping = (data: { userId: string; isTyping: boolean }) => {
      if (data.userId === selectedUser) {
        setIsTyping(data.isTyping);
        // Auto-clear typing after 3 seconds
        if (data.isTyping) {
          setTimeout(() => setIsTyping(false), 3000);
        }
      }
    };

    // Register event listeners with correct event names
    socket.on("newMessage", handleNewMessage);
    socket.on("messageError", handleMessageError);
    socket.on("userTyping", handleUserTyping);

    return () => {
      socket?.off("newMessage", handleNewMessage);
      socket?.off("messageError", handleMessageError);
      socket?.off("userTyping", handleUserTyping);
    };
  }, [userId, selectedUser]);

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    const socket = socketRef.current;
    if (!socket?.connected || !selectedUser) return;

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Send typing event with correct format
    socket.emit("typing", { receiver: selectedUser });

    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit("stopTyping", { receiver: selectedUser });
    }, 2000);
  }, [selectedUser]);

  // Auto-scroll to bottom only when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      const currentLastId = messages[messages.length - 1]._id;
      if (lastMessageId.current !== currentLastId) {
        scrollToBottom();
        lastMessageId.current = currentLastId;
      }
    }
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    const socket = socketRef.current;
    const messageToSend = newMessage.trim();

    // Create optimistic message
    const tempId = `temp-${Date.now()}`;
    tempIdRef.current = tempId;
    const optimisticMessage: Message = {
      _id: tempId,
      message: messageToSend,
      sender: { _id: userId, name: currentUserName || userName },
      receiver: selectedUser,
      createdAt: new Date().toISOString(),
      isOptimistic: true,
      status: "sent",
    };

    // Immediately show the message
    setMessages((prev) => [...prev, optimisticMessage]);
    setNewMessage("");
    setIsSending(true);

    // Clear typing indicator
    if (socket?.connected) {
      socket.emit("stopTyping", { receiver: selectedUser });
    }

    try {
      // Try socket first if connected
      if (socket?.connected) {
        socket.emit(
          "sendMessage",
          {
            receiver: selectedUser,
            message: messageToSend,
          },
          (response: any) => {
            setIsSending(false);
            if (response?.status === "success" && response?.message) {
              console.log("Message sent via socket:", response);
              // Update the optimistic message with the real one
              setMessages((prevMessages) => {
                return prevMessages.map((msg) => {
                  if (msg._id === tempId) {
                    return { ...response.message, status: "delivered" };
                  }
                  return msg;
                });
              });
            } else {
              console.warn("Socket response not successful, trying REST API...");
              // Fallback to REST API
              sendViaRestApi(tempId, messageToSend);
            }
          }
        );

        // Timeout fallback - if no response in 5 seconds, use REST API
        setTimeout(() => {
          setMessages((prevMessages) => {
            const msg = prevMessages.find((m) => m._id === tempId);
            if (msg?.isOptimistic && msg?.status === "sent") {
              console.warn("Socket timeout, falling back to REST API");
              sendViaRestApi(tempId, messageToSend);
            }
            return prevMessages;
          });
        }, 5000);
      } else {
        // Socket not connected, use REST API directly
        console.log("Socket not connected, using REST API");
        await sendViaRestApi(tempId, messageToSend);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setIsSending(false);
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === tempId ? { ...msg, status: "error" } : msg
        )
      );
    }
  };

  // REST API fallback for sending messages
  const sendViaRestApi = async (tempId: string, messageText: string) => {
    try {
      const result = await createMessage({
        sender: userId,
        receiver: selectedUser,
        message: messageText,
        type: 'text',
      }).unwrap();

      console.log("Message sent via REST API:", result);

      // Update the optimistic message with the real one
      setMessages((prevMessages) => {
        return prevMessages.map((msg) => {
          if (msg._id === tempId) {
            return {
              ...result.data || result,
              status: "delivered",
            };
          }
          return msg;
        });
      });
      setIsSending(false);
    } catch (error) {
      console.error("REST API send failed:", error);
      setIsSending(false);
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === tempId ? { ...msg, status: "error" } : msg
        )
      );
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const formatLastSeen = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return t("chatPage.justNow");
    if (diffInMinutes < 60) return t("chatPage.minutesAgo", { count: diffInMinutes });
    if (diffInMinutes < 1440) return t("chatPage.hoursAgo", { count: Math.floor(diffInMinutes / 60) });
    return date.toLocaleDateString();
  };

  // Group messages by date
  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [date: string]: Message[] } = {};

    messages.forEach((msg) => {
      const dateStr = formatDate(msg.createdAt);
      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      groups[dateStr].push(msg);
    });

    return groups;
  };

  if (isLoading)
    return (
      <div className="chat-loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
        <p className="loading-text">{t("chatPage.loadingConversation")}</p>
      </div>
    );

  if (error)
    return (
      <div className="chat-error">
        <div className="error-icon">⚠️</div>
        <p>{t("chatPage.errorLoading")}</p>
      </div>
    );

  // Sort messages by timestamp
  const sortedMessages = [...messages].sort((a, b) => {
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  const messagesByDate = groupMessagesByDate(sortedMessages);

  return (
    <Container fluid className="modern-chat-container">
      {/* Enhanced Chat Header */}
      <div className="modern-chat-header">
        <div className="header-content">
          <div className="user-info-section">
            {/* Back button for mobile */}
            <button
              className="back-btn"
              onClick={() => navigate("/chat")}
              aria-label="Back to conversations"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="profile-avatar-container">
              <img
                src={profilePicture || "/default-avatar.png"}
                alt={userName}
                className="profile-avatar"
              />
              <div
                className={`status-pulse ${isOnline ? "online" : "offline"}`}
              >
                <div className="pulse-ring"></div>
                <div className="pulse-dot"></div>
              </div>
            </div>
            <div className="user-details">
              <h3 className="user-name">{userName}</h3>
              <div className="status-info">
                {isOnline ? (
                  <span className="online-status">
                    <span className="status-dot online"></span>
                    {t("chatPage.online")}
                  </span>
                ) : (
                  <span className="offline-status">
                    <span className="status-dot offline"></span>
                    {lastSeen
                      ? `${t("chatPage.lastSeen")} ${formatLastSeen(lastSeen)}`
                      : t("chatPage.offline")}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="header-actions">
            <button className="action-btn call-btn" title="Voice call">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </button>
            <button className="action-btn video-btn" title="Video call">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            </button>
            <button
              className="action-btn gallery-btn"
              title="Shared media"
              onClick={() => navigate(`/chat/${selectedUser}/media`)}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </button>
            <button className="action-btn info-btn" title="Chat info">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Chat Messages */}
      <div className="modern-chat-messages" ref={chatContainerRef}>
        {Object.entries(messagesByDate).map(([date, msgs]) => (
          <div key={date} className="message-date-group">
            <div className="date-separator">
              <span className="date-text">{date}</span>
            </div>

            {msgs.map((msg: Message) => (
              <div
                key={msg._id}
                className={`modern-message ${
                  msg.sender._id === userId ? "sent" : "received"
                } ${msg.status === "error" ? "error" : ""}`}
              >
                {msg.sender._id !== userId && (
                  <div className="message-avatar">
                    <img
                      src={msg.sender.imageUrls?.[0] || "/default-avatar.png"}
                      alt={msg.sender.name}
                    />
                  </div>
                )}

                <div className="message-wrapper">
                  <div className="message-bubble">
                    <p className="message-text">{msg.message}</p>
                    <div className="message-meta">
                      <span className="message-time">
                        {formatTime(msg.createdAt)}
                      </span>
                      {msg.sender._id === userId && (
                        <div className="message-status">
                          {msg.status === "error" ? (
                            <svg
                              className="status-icon error"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                            </svg>
                          ) : msg.isOptimistic ? (
                            <svg
                              className="status-icon sent"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                            </svg>
                          ) : (
                            <svg
                              className="status-icon delivered"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z" />
                            </svg>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}

        {/* Enhanced Typing Indicator */}
        {isTyping && (
          <div className="modern-message received">
            <div className="message-avatar">
              <img
                src={profilePicture || "/default-avatar.png"}
                alt={userName}
              />
            </div>
            <div className="message-wrapper">
              <div className="typing-indicator-bubble">
                <div className="typing-animation">
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                  <div className="typing-dot"></div>
                </div>
                <span className="typing-text">{userName} {t("chatPage.typing")}</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Enhanced Message Input */}
      <div className="modern-chat-input">
        <Form onSubmit={handleSendMessage} className="input-form">
          <div className="input-container">
            <button type="button" className="attachment-btn">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
            </button>

            <div className="text-input-wrapper">
              <Form.Control
                type="text"
                placeholder={t("chatPage.messagePlaceholder")}
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  handleTyping();
                }}
                className="modern-text-input "
              />
              <button type="button" className="emoji-btn">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                  <line x1="9" y1="9" x2="9.01" y2="9" />
                  <line x1="15" y1="9" x2="15.01" y2="9" />
                </svg>
              </button>
            </div>

            <button
              type="submit"
              className={`send-btn ${newMessage.trim() && !isSending ? "active" : ""}`}
              disabled={!newMessage.trim() || isSending}
            >
              {isSending ? (
                <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }}></div>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22,2 15,22 11,13 2,9 22,2" />
                </svg>
              )}
            </button>
          </div>
        </Form>
      </div>

    </Container>
  );
};

export default ChatContent;
