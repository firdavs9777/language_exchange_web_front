import React, { useEffect, useRef, useCallback, useState } from "react";
import { ListGroup, Spinner, Alert, Badge, Modal, Button } from "react-bootstrap";
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

  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  
  // Dropdown menu state
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
        return "bg-emerald-500"; // green
      case "away":
        return "bg-amber-500"; // yellow
      case "offline":
      default:
        return "bg-gray-400"; // gray
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "online":
        return "bi-circle-fill text-emerald-500";
      case "away":
        return "bi-clock-fill text-amber-500";
      case "offline":
      default:
        return "bi-circle text-gray-400";
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, user: User) => {
    e.stopPropagation(); // Prevent triggering the user selection
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    
    try {
      // Here you would typically call an API to delete the conversation
      // For now, we'll just simulate the action
      console.log(`Deleting conversation with user: ${userToDelete.name}`);
      
      // You can add your delete API call here
      // await deleteConversation(userToDelete._id);
      
      // Refresh the data after deletion
      refetch();
      
      // Close modal and reset state
      setShowDeleteModal(false);
      setUserToDelete(null);
      
      // Show success message (you can implement toast notification)
      console.log("Conversation deleted successfully");
    } catch (error) {
      console.error("Error deleting conversation:", error);
      // You can show error toast here
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setUserToDelete(null);
  };

  const toggleDropdown = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveDropdown(activeDropdown === userId ? null : userId);
  };

  const handleDropdownAction = (action: string, user: User, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveDropdown(null);
    
    switch (action) {
      case 'delete':
        setUserToDelete(user);
        setShowDeleteModal(true);
        break;
      case 'archive':
        console.log(`Archive conversation with ${user.name}`);
        // Add your archive logic here
        break;
      case 'mute':
        console.log(`Mute conversation with ${user.name}`);
        // Add your mute logic here
        break;
      case 'block':
        console.log(`Block user ${user.name}`);
        // Add your block logic here
        break;
      case 'markUnread':
        console.log(`Mark conversation with ${user.name} as unread`);
        // Add your mark unread logic here
        break;
      case 'pin':
        console.log(`Pin conversation with ${user.name}`);
        // Add your pin logic here
        break;
      default:
        break;
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <div className="mt-3 text-gray-500 text-sm flex items-center justify-center">
            <i className="bi bi-chat-dots mr-2"></i>
            Loading conversations...
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center mb-3">
            <i className="bi bi-exclamation-triangle-fill text-red-500 text-lg mr-2"></i>
            <h6 className="text-red-800 font-semibold mb-0">Connection Error</h6>
          </div>
          <p className="mb-3 text-sm text-red-700">
            {error
              ? (error as any)?.data?.message || "Error loading conversations"
              : "An unexpected error occurred"}
          </p>
          <button
            className="inline-flex items-center px-3 py-1.5 text-sm border border-red-300 text-red-700 bg-white rounded-full hover:bg-red-50 transition-colors"
            onClick={handleReload}
          >
            <i className="bi bi-arrow-clockwise mr-1"></i>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // If we're searching and nothing was found
  if (searchQuery && filteredChatPartners.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
          <i className="bi bi-search text-gray-400 text-2xl"></i>
        </div>
        <h6 className="text-gray-500 mb-1 font-medium flex items-center">
          <i className="bi bi-chat-square-x mr-2"></i>
          No matching conversations
        </h6>
        <p className="text-gray-400 text-sm mb-0">Try adjusting your search terms</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-grow overflow-auto">
        {filteredChatPartners.length > 0 ? (
          <div className="list-group list-group-flush">
            {filteredChatPartners.map((user, index) => (
              <div
                key={user._id}
                className={`
                  cursor-pointer transition-all duration-200 border-0 px-0 py-0
                  ${activeUserId === user._id 
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white' 
                    : 'hover:bg-gray-50'
                  }
                  ${index !== filteredChatPartners.length - 1 ? 'border-b border-gray-100' : ''}
                `}
                onClick={() =>
                  onSelectUser(user._id, user.name, user.imageUrls[0])
                }
              >
                <div className="flex items-center p-3 sm:p-4 relative">
                  {/* Avatar with status indicator */}
                  <div className="relative mr-3 flex-shrink-0">
                    <div
                      className={`
                        w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center overflow-hidden
                        ${user.avatar || user.imageUrls[0] 
                          ? 'bg-transparent' 
                          : 'bg-gradient-to-br from-indigo-500 to-purple-600'
                        }
                      `}
                    >
                      {user.avatar || user.imageUrls[0] ? (
                        <img
                          src={user.avatar || user.imageUrls[0]}
                          alt={user.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-white font-bold text-base sm:text-lg">
                          {user.name?.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div
                      className={`
                        absolute w-3 h-3 sm:w-3.5 sm:h-3.5 rounded-full border-2 border-white
                        bottom-0.5 right-0.5 ${getStatusColor(user.status)} flex items-center justify-center
                      `}
                    >
                      <i className={`${getStatusIcon(user.status)} text-xs`}></i>
                    </div>
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex justify-content-between items-start mb-1">
                      <div className="flex-grow min-w-0">
                        <h6 className="mb-0 truncate font-semibold text-sm sm:text-base flex items-center">
    
                          {user.name}
                          {user.status === 'online' && (
                            <span className="ml-2 inline-flex items-center">
                              <i className="bi bi-lightning-charge-fill text-green-500 text-xs"></i>
                            </span>
                          )}
                        </h6>
                        <p
                          className={`
                            mb-0 truncate text-xs sm:text-sm leading-tight flex items-center mt-1
                            ${activeUserId === user._id 
                              ? 'text-white/80' 
                              : 'text-gray-500'
                            }
                            ${user.unreadCount > 0 ? 'font-medium' : 'font-normal'}
                          `}
                        >
  
                          {user.lastMessage || "No messages yet"}
                        </p>
                      </div>
                      
                     
                      <div className="flex items-center space-x-2 ml-3 flex-shrink-0">
                        {/* Time */}
                        {user.lastMessageTime && (
                          <div className="flex flex-col items-end">
                            <small
                              className={`
                                whitespace-nowrap text-xs font-medium flex items-center
                                ${activeUserId === user._id ? 'text-white/80' : 'text-gray-500'}
                              `}
                            >
                              <i className="bi bi-clock mr-1"></i>
                              {formatTime(user.lastMessageTime)}
                            </small>
                          </div>
                        )}
                        
                        {/* Unread count */}
                        {user.unreadCount > 0 && (
                          <Badge
                            pill
                            bg="primary"
                            className="text-xs font-semibold min-w-5 h-5 flex items-center justify-center"
                          >
                            {user.unreadCount > 99 ? "99+" : user.unreadCount}
                          </Badge>
                        )}
                        
                        {/* Status icons */}
                        <div className="flex items-center space-x-1">
                          {user.status === 'online' && (
                            <i className="bi bi-circle-fill text-green-500 text-xs" title="Online"></i>
                          )}
                         
                        </div>
                        
                        {/* More actions dropdown */}
                        <div className="relative" ref={dropdownRef}>
                          <button
                            onClick={(e) => toggleDropdown(user._id, e)}
                            className={`
                              w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200
                              ${activeUserId === user._id 
                                ? 'hover:bg-white/20 text-white/80' 
                                : 'hover:bg-gray-200 text-gray-500'
                              }
                              ${activeDropdown === user._id ? 'bg-gray-200 text-gray-700' : ''}
                            `}
                            title="More options"
                          >
                            <i className="bi bi-three-dots-vertical text-sm"></i>
                          </button>
                          
                          {/* Dropdown menu */}
                          {activeDropdown === user._id && (
                            <div className="absolute right-0 top-8 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                              <button
                                onClick={(e) => handleDropdownAction('pin', user, e)}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                              >
                                <i className="bi bi-pin-angle mr-3 text-gray-500"></i>
                                Pin conversation
                              </button>
                              <button
                                onClick={(e) => handleDropdownAction('markUnread', user, e)}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                              >
                                <i className="bi bi-envelope mr-3 text-blue-500"></i>
                                Mark as unread
                              </button>
                              <button
                                onClick={(e) => handleDropdownAction('mute', user, e)}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                              >
                                <i className="bi bi-volume-mute mr-3 text-amber-500"></i>
                                Mute notifications
                              </button>
                              <button
                                onClick={(e) => handleDropdownAction('archive', user, e)}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                              >
                                <i className="bi bi-archive mr-3 text-gray-500"></i>
                                Archive conversation
                              </button>
                              <hr className="my-1 border-gray-200" />
                              <button
                                onClick={(e) => handleDropdownAction('block', user, e)}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                              >
                                <i className="bi bi-person-slash mr-3 text-orange-500"></i>
                                Block user
                              </button>
                              <button
                                onClick={(e) => handleDropdownAction('delete', user, e)}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center"
                              >
                                <i className="bi bi-trash3 mr-3 text-red-500"></i>
                                Delete conversation
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center py-12">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mb-3 bg-gradient-to-br from-indigo-500/10 to-purple-600/10">
              <i className="bi bi-chat-square-text text-2xl sm:text-4xl text-indigo-500"></i>
            </div>
            <h6 className="text-gray-500 mb-2 font-medium flex items-center">
              <i className="bi bi-inbox mr-2"></i>
              No conversations yet
            </h6>
            <p className="text-gray-400 text-sm mb-0 px-3 flex items-center justify-center">
              <i className="bi bi-plus-circle mr-1"></i>
              Start a conversation to see it appear here
            </p>
          </div>
        )}
      </div>
      <Modal 
        show={showDeleteModal} 
        onHide={handleDeleteCancel}
        centered
        backdrop="static"
      >
        <Modal.Header closeButton className="border-0 pb-2">
          <Modal.Title className="text-lg font-semibold flex items-center">
            <i className="bi bi-exclamation-triangle-fill text-red-500 mr-2"></i>
            Delete Conversation
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="pt-0">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <i className="bi bi-trash3 text-red-600 text-lg"></i>
              </div>
            </div>
            <div className="flex-grow">
              <p className="text-gray-700 mb-2">
                Are you sure you want to delete your conversation with{" "}
                <span className="font-semibold text-gray-900">
                  {userToDelete?.name}
                </span>
                ?
              </p>
              <p className="text-sm text-gray-500 mb-0">
                <i className="bi bi-info-circle mr-1"></i>
                This action cannot be undone. All messages will be permanently deleted.
              </p>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer className="border-0 pt-0">
          <div className="flex justify-end space-x-2 w-full">
            <Button
              variant="outline-secondary"
              onClick={handleDeleteCancel}
              className="px-4 py-2 text-sm font-medium"
            >
              <i className="bi bi-x-lg mr-1"></i>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteConfirm}
              className="px-4 py-2 text-sm font-medium"
            >
              <i className="bi bi-trash3 mr-1"></i>
              Delete
            </Button>
          </div>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default UsersList;