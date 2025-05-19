import React, { useState, useEffect, useRef } from "react";
import { Button, Form, Container, Row, Col } from "react-bootstrap";
import { useSelector } from "react-redux";
import {
  useCreateMessageMutation,
  useGetConversationQuery,
} from "../../store/slices/chatSlice";
import io, { Socket } from "socket.io-client";
import "./ChatContent.css";
import { BASE_URL } from "../../constants";

// Define types for Redux state
interface RootState {
  auth: {
    userInfo: {
      user: {
        _id: string;
      };
      token: string;
    };
  };
}

// Define the Socket.IO instance
let socket: Socket | null = null;

interface ChatContentProps {
  selectedUser: string;
  userName: string;
  profilePicture: string;
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
  status?: 'sent' | 'delivered' | 'error';
}

const ChatContent: React.FC<ChatContentProps> = ({
  selectedUser,
  userName,
  profilePicture,
}) => {
  const userId = useSelector((state: RootState) => state.auth.userInfo?.user._id);
  const token = useSelector((state: RootState) => state.auth.userInfo?.token);

  const { data, error, isLoading } = useGetConversationQuery({
    senderId: userId,
    receiverId: selectedUser,
  });

  // const [createMessage] = useCreateMessageMutation();
  const [newMessage, setNewMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  const tempIdRef = useRef<string>();
  const lastMessageId = useRef<string>();

  // Initialize Socket.IO connection when token changes
  useEffect(() => {
    if (!token) return;

    const SOCKET_URL = BASE_URL;

    // Disconnect existing socket if any
    if (socket) {
      socket.disconnect();
    }

    socket = io(SOCKET_URL, {
      auth: {
        token: token,
      },
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      console.log("Connected to socket server");
    });

    socket.on("connect_error", (error: Error) => {
      console.error("Socket connection error:", error);
    });

    return () => {
      if (socket) {
        socket.off();
        socket.disconnect();
        socket = null;
      }
    };
  }, [token]);

  // Load initial messages
  useEffect(() => {
    if (data?.data) {
      setMessages(data.data);
    }
  }, [data]);

  useEffect(() => {
    if (!socket || !selectedUser) return;

    // Handler for new messages
    const handleMessage = (newMsg: Message) => {
      setMessages(prevMessages => {
        console.log(prevMessages)
        if (prevMessages.some(msg => msg._id === newMsg._id)) {
          return prevMessages;
        }
        return [...prevMessages, newMsg];
      });
    };

    // Handler for sent message confirmations
    const handleMessageSent = (confirmedMsg: Message) => {
      console.log(confirmedMsg);
      setMessages(prevMessages => {
        return prevMessages.map(msg => {
          if (msg.isOptimistic && msg.message === confirmedMsg.message) {
            return { ...confirmedMsg, status: 'delivered' };
          }
          return msg;
        });
      });
    };

    // Handler for message errors
    const handleMessageError = (errorData: { message: string, originalMessage: string }) => {
      setMessages(prevMessages => {
        return prevMessages.map(msg => {
          if (msg.isOptimistic && msg.message === errorData.originalMessage) {
            return { ...msg, status: 'error' };
          }
          return msg;
        });
      });
    };

    // Handler for typing indicators from other users
    const handleUserTyping = (data: { user: string }) => {
      if (data.user === selectedUser) {
        setIsTyping(true);
      }
    };

    // Handler for when other users stop typing
    const handleUserStopTyping = (data: { user: string }) => {
      if (data.user === selectedUser) {
        setIsTyping(false);
      }
    };

    socket.on("message", handleMessage);
    socket.on("messageSent", handleMessageSent);
    socket.on("messageError", handleMessageError);
    socket.on("userTyping", handleUserTyping);
    socket.on("userStopTyping", handleUserStopTyping);

    return () => {
      socket?.off("message", handleMessage);
      socket?.off("messageSent", handleMessageSent);
      socket?.off("messageError", handleMessageError);
      socket?.off("userTyping", handleUserTyping);
      socket?.off("userStopTyping", handleUserStopTyping);
    };
  }, [userId, selectedUser]);

  // Handle typing indicator
  const handleTyping = () => {
    if (!socket || !selectedUser) return;
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    socket.emit("typing", { sender: userId, receiver: selectedUser });
    
    typingTimeoutRef.current = setTimeout(() => {
      socket?.emit("stopTyping", { sender: userId, receiver: selectedUser });
    }, 2000);
  };

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
    if (!newMessage.trim() || !socket) return;

    try {
      // Clear typing indicator
      clearTimeout(typingTimeoutRef.current);
      socket.emit("stopTyping", { sender: userId, receiver: selectedUser });

      // Optimistically update UI
      const tempId = `temp-${Date.now()}`;
      tempIdRef.current = tempId;
      const optimisticMessage: Message = {
        _id: tempId,
        message: newMessage,
        sender: { _id: userId, name: userName },
        receiver: selectedUser,
        createdAt: new Date().toISOString(),
        isOptimistic: true,
        status: 'sent'
      };

      setMessages(prev => [...prev, optimisticMessage]);
      setNewMessage("");

      // Send via socket
      socket.emit("sendMessage", {
        sender: userId,
        receiver: selectedUser,
        message: newMessage,
      });

      // Still call API for redundancy
      // await createMessage({
      //   sender: userId,
      //   receiver: selectedUser,
      //   message: newMessage,
      // });

    } catch (error) {
      console.error("Error sending message:", error);
      setMessages(prev => 
        prev.map(msg => 
          msg._id === tempIdRef.current 
            ? { ...msg, status: 'error' } 
            : msg
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

  if (isLoading) return (
    <div className="chat-loading">
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Loading...</span>
      </div>
      <p>Loading conversation...</p>
    </div>
  );

  if (error) return (
    <div className="chat-error alert alert-danger">
      <i className="bi bi-exclamation-triangle-fill me-2"></i>
      Error loading conversation
    </div>
  );

  // Sort messages by timestamp
  const sortedMessages = [...messages].sort((a, b) => {
    
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  const messagesByDate = groupMessagesByDate(sortedMessages);

  return (
    <Container fluid className="chat-content p-0 d-flex flex-column vh-100">
      {/* Chat Header */}
      <div className="chat-header p-3 shadow-sm">
        <Row className="align-items-center g-0">
          <Col xs="auto" className="pe-3">
            <div className="user-avatar">
              <img
                src={profilePicture || "/default-avatar.png"}
                alt={userName}
                className="rounded-circle"
                style={{ width: '40px', height: '40px', objectFit: 'cover' }}
              />
              <span className="status-indicator online"></span>
            </div>
          </Col>
          <Col className="d-flex flex-column">
            <h5 className="mb-0 text-truncate">{userName}</h5>
            <small className="text-muted">
              <i className="bi bi-circle-fill text-success me-1"></i>
              Online
            </small>
          </Col>
          <Col xs="auto" className="d-flex">
            <Button
              variant="outline-secondary"
              size="sm"
              className="rounded-circle d-none d-sm-inline-block"
            >
              <i className="bi bi-telephone"></i>
            </Button>
            <Button
              variant="outline-secondary"
              size="sm"
              className="rounded-circle ms-2 d-none d-sm-inline-block"
            >
              <i className="bi bi-camera-video"></i>
            </Button>
            <Button
              variant="outline-secondary"
              size="sm"
              className="rounded-circle ms-2"
            >
              <i className="bi bi-info-circle"></i>
            </Button>
          </Col>
        </Row>
      </div>

      {/* Chat Messages */}
      <div
        className="chat-messages p-3 flex-grow-1 overflow-auto"
        ref={chatContainerRef}
        style={{ minHeight: 0 }}
      >
        {Object.entries(messagesByDate).map(([date, msgs]) => (
          <div key={date} className="message-date-group">
            <div className="date-divider">
              <span>{date}</span>
            </div>

            {msgs.map((msg: Message) => (
              <div
                key={msg._id}
                className={`message-item ${
                  msg.sender._id === userId ? "my-message" : "other-message"
                } ${msg.status === 'error' ? 'message-error' : ''}`}
              >
                {msg.sender._id !== userId && (
                  <img
                    src={msg.sender.imageUrls?.[0] || "/default-avatar.png"}
                    alt={msg.sender.name}
                    className="message-avatar rounded-circle d-none d-sm-block"
                    style={{ width: '32px', height: '32px', objectFit: 'cover' }}
                  />
                )}
                <div className="message-content">
                  <div className="message-bubble">{msg.message}</div>
                  <div className="message-info d-flex align-items-center">
                    <small className="message-time">
                      {formatTime(msg.createdAt)}
                    </small>
                    {msg.sender._id === userId && (
                      <>
                        {msg.status === 'error' ? (
                          <i className="bi bi-exclamation-triangle text-danger ms-1"></i>
                        ) : msg.isOptimistic ? (
                          <i className="bi bi-check text-secondary ms-1"></i>
                        ) : (
                          <i className="bi bi-check2-all text-primary ms-1"></i>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
        
        {/* Typing indicator */}
        {isTyping && (
          <div className="typing-indicator">
            <span className="typing-dot"></span>
            <span className="typing-dot"></span>
            <span className="typing-dot"></span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="chat-input p-3 border-top">
        <Form onSubmit={handleSendMessage}>
          <Row className="g-2 align-items-center">
            <Col xs="auto" className="d-none d-sm-block">
              <Button variant="light" className="btn-icon rounded-circle">
                <i className="bi bi-plus"></i>
              </Button>
            </Col>
            <Col>
              <Form.Control
                type="text"
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  handleTyping();
                }}
                className="rounded-pill border-0 shadow-sm"
              />
            </Col>
            <Col xs="auto" className="d-flex">
              <Button variant="light" className="btn-icon rounded-circle me-2 d-none d-sm-block">
                <i className="bi bi-emoji-smile"></i>
              </Button>
              <Button
                type="submit"
                variant="primary"
                className="rounded-circle btn-icon"
                disabled={!newMessage.trim()}
              >
                <i className="bi bi-send-fill"></i>
              </Button>
            </Col>
          </Row>
        </Form>
      </div>
    </Container>
  );
};

export default ChatContent;