import React from "react";

import { ListGroup } from "react-bootstrap";
import { useGetUserMessagesQuery } from "../../store/slices/chatSlice";
import { useSelector } from "react-redux";

interface UsersListProps {
  onSelectUser: (userId: string) => void;
}

const UsersList: React.FC<UsersListProps> = ({ onSelectUser }) => {
  const userId = useSelector((state: any) => state.auth.userInfo?.user._id);
  const { data, error, isLoading } = useGetUserMessagesQuery(userId); // Replace with actual user ID

  if (isLoading) return <div>Loading users...</div>;
  if (error) return <div>Error loading users</div>;


  const uniqueSendersMap = new Map();

data?.data.forEach((message: any) => {
  const sender = message.sender;
  if (sender._id !== userId && !uniqueSendersMap.has(sender._id)) {
    uniqueSendersMap.set(sender._id, sender);
  }
});

const uniqueSenders = Array.from(uniqueSendersMap.values());
  return (
  <ListGroup style={{ overflowY: "scroll" }}>
  {uniqueSenders.map((sender: any) => (
    <ListGroup.Item
      key={sender._id}
      action
      onClick={() => onSelectUser(sender._id)}
      className="d-flex justify-content-between align-items-center"
    >
      {sender.name}
    </ListGroup.Item>
  ))}
</ListGroup>

  );
};

export default UsersList;
