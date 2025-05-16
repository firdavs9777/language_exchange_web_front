import React, { useState, useEffect, useRef } from "react";
import { Button, Form, Container, Row, Col } from "react-bootstrap";
import { useSelector } from "react-redux";
import {
  useCreateMessageMutation,
  useGetConversationQuery,
} from "../../store/slices/chatSlice";
import io from "socket.io-client";
import "./ChatContent.css";
import { BASE_URL } from "../../constants";

// Define the Socket.IO instance outside the component to prevent reconnections on re-renders
let socket: any;

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
}

const ChatContent: React.FC<ChatContentProps> = ({ selectedUser, userName, profilePicture}) => {
  const userId = useSelector((state: any) => state.auth.userInfo?.user._id);
  const { data, error, isLoading } = useGetConversationQuery({
    senderId: userId,
    receiverId: selectedUser,
  });

  const [createMessage] = useCreateMessageMutation();
  const [newMessage, setNewMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Initialize Socket.IO connection
  useEffect(() => {
    // Connect to the Socket.IO server with auth token if available
    const token = localStorage.getItem('token');
    const SOCKET_URL = BASE_URL;
    
    socket = io(SOCKET_URL, {
      auth: {
        token: token
      }
    });

    // Listen for connection events
    socket.on('connect', () => {
      console.log('Connected to socket server');
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    // Clean up on component unmount
    return () => {
      socket.disconnect();
    };
  }, []);

  // Load initial messages and subscribe to new ones
  useEffect(() => {
    if (data?.data) {
      setMessages(data.data);
    }

    // Listen for new messages from socket
    socket.on('message', (newMsg: Message) => {
      // Only add message if it's part of current conversation
      if (
        (newMsg.sender._id === userId && newMsg.receiver === selectedUser) ||
        (newMsg.sender._id === selectedUser && newMsg.receiver === userId)
      ) {
        setMessages((prevMessages) => [...prevMessages, newMsg]);
      }
    });

    return () => {
      socket.off('message');
    };
  }, [data, userId, selectedUser]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      // Send message to socket server
      socket.emit('sendMessage', {
        sender: userId,
        receiver: selectedUser,
        message: newMessage
      });

      // Also send through API for backup/persistence
      await createMessage({
        sender: userId,
        receiver: selectedUser,
        message: newMessage,
      });
      
      setNewMessage("");
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Group messages by date
  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [date: string]: Message[] } = {};
    
    messages.forEach(msg => {
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
    <Container fluid className="chat-content p-0 d-flex flex-column">
      {/* Chat Header */}
      <div className="chat-header p-3 shadow-sm">
        <Row className="align-items-center">
          <Col xs="auto">
            <div className="user-avatar">
              <img
                src={
                  profilePicture !== '' 
                    ? profilePicture
                    : "/default-avatar.png"
                }
                alt={userName}
                className="rounded-circle"
              />
              <span className="status-indicator online"></span>
            </div>
          </Col>
          <Col>
            <h5 className="mb-0">{userName}</h5>
            <small className="text-muted">
              <i className="bi bi-circle-fill text-success me-1"></i>
              Online
            </small>
          </Col>
          <Col xs="auto">
            <Button variant="outline-secondary" size="sm" className="rounded-circle">
              <i className="bi bi-telephone"></i>
            </Button>
            <Button variant="outline-secondary" size="sm" className="rounded-circle ms-2">
              <i className="bi bi-camera-video"></i>
            </Button>
            <Button variant="outline-secondary" size="sm" className="rounded-circle ms-2">
              <i className="bi bi-info-circle"></i>
            </Button>
          </Col>
        </Row>
      </div>

      {/* Chat Messages */}
      <div 
        className="chat-messages p-3 flex-grow-1 overflow-auto"
        ref={chatContainerRef}
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
                }`}
              >
                {msg.sender._id !== userId && (
                  <img
                    src={
                      msg.sender.imageUrls && msg.sender.imageUrls.length > 0
                        ? msg.sender.imageUrls[0]
                        : "/default-avatar.png"
                    }
                    alt={msg.sender.name}
                    className="message-avatar rounded-circle"
                  />
                )}
                <div className="message-content">
                  <div className="message-bubble">
                    {msg.message}
                  </div>
                  <div className="message-info">
                    <small className="message-time">
                      {formatTime(msg.createdAt)}
                    </small>
                    {msg.sender._id === userId && (
                      <i className="bi bi-check2-all text-primary ms-1"></i>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="chat-input p-3 border-top">
        <Form onSubmit={handleSendMessage}>
          <Row className="g-2 align-items-center">
            <Col xs="auto">
              <Button variant="light" className="btn-icon rounded-circle">
                <i className="bi bi-plus"></i>
              </Button>
            </Col>
            <Col>
              <Form.Control
                type="text"
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="rounded-pill border-0 shadow-sm"
              />
            </Col>
            <Col xs="auto">
              <Button variant="light" className="btn-icon rounded-circle me-2">
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