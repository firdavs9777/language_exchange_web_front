import React, { useState, useEffect, useRef } from "react";
import { Button, Form, ListGroup } from "react-bootstrap";
import { useSelector } from "react-redux";
import {
  useCreateMessageMutation,
  useGetConversationQuery,
} from "../../store/slices/chatSlice";
import "./ChatContent.css";

interface ChatContentProps {
  selectedUser: string;
}

const ChatContent: React.FC<ChatContentProps> = ({ selectedUser }) => {
  const userId = useSelector((state: any) => state.auth.userInfo?.user._id);
  const { data, error, isLoading } = useGetConversationQuery({
    senderId: userId,
    receiverId: selectedUser,
  });

  const [createMessage] = useCreateMessageMutation();
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [data]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      await createMessage({
        sender: userId,
        receiver: selectedUser,
        message: newMessage,
      });
      setNewMessage("");
    }
  };

  if (isLoading) return <div>Loading conversation...</div>;
  if (error) return <div>Error loading conversation</div>;

  // Sort messages by timestamp
  const sortedMessages = [...(data?.data || [])].sort((a, b) => {
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  return (
    <div className="chat-content">
      <h4 className="text-center mb-4">Chat with {selectedUser}</h4>
      <ListGroup
        className="mb-3 chat-messages"
        style={{ height: "400px", overflowY: "scroll" }}
      >
        {sortedMessages.map((msg: any) => (
          <ListGroup.Item
            key={msg._id}
            className={`message-item ${
              msg.sender._id === userId ? "my-message" : "other-message"
            }`}
          >
            <div
              className={
                msg.sender._id === userId
                  ? "message-sender"
                  : "message-receiver"
              }
            >
              {msg.sender._id === userId ? (
                <p>{msg.message}</p>
              ) : (
                <p>
                  <img
                    src={
                      msg.sender.imageUrls && msg.sender.imageUrls.length > 0
                        ? msg.sender.imageUrls[0]
                        : "/default-avatar.png"
                    }
                    alt={msg.sender.name}
                    className="avatar"
                  />
                  <strong>{msg.sender.name}:</strong> {msg.message}
                </p>
              )}
            </div>
          </ListGroup.Item>
        ))}
        <div ref={messagesEndRef} />
      </ListGroup>
      <Form onSubmit={handleSendMessage} className="d-flex align-items-center">
        <Form.Group controlId="messageInput" className="flex-grow-1 me-2">
          <Form.Control
            type="text"
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="message-input"
          />
        </Form.Group>
        <Button
          type="submit"
          variant="primary"
          className="send-button"
          disabled={!newMessage.trim()}
        >
          Send
        </Button>
      </Form>
    </div>
  );
};

export default ChatContent;