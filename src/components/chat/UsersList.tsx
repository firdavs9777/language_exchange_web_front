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

  return (
    <ListGroup style={{ overflowY: "scroll" }}>
      {data?.data
        .filter((message: any) => message.sender._id !== userId) // Exclude the current user from the list
        .map((message: any) => (
          <ListGroup.Item
            key={message.sender._id}
            action
            onClick={() => onSelectUser(message.sender._id)}
            className="d-flex justify-content-between align-items-center"
          >
            {message.sender.name}
          </ListGroup.Item>
        ))}
    </ListGroup>
  );
};

export default UsersList;
