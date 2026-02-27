import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSearchUsersQuery } from "../../store/slices/usersSlice";
import { useCreateChatRoomMutation } from "../../store/slices/chatSlice";
import { Bounce, toast } from "react-toastify";
import {
  ArrowLeft,
  Search,
  MessageCircle,
  Users,
  Clock,
  Loader2,
  UserPlus,
} from "lucide-react";

interface User {
  _id: string;
  name: string;
  imageUrls?: string[];
  isOnline?: boolean;
  lastSeen?: string;
}

const NewChat: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [isGroupChat, setIsGroupChat] = useState(false);

  const { data: searchData, isLoading: isSearching } = useSearchUsersQuery(
    { query: searchQuery },
    { skip: searchQuery.length < 2 }
  );
  const [createChatRoom, { isLoading: isCreating }] = useCreateChatRoomMutation();

  const searchResults: User[] = searchData?.data || [];

  const handleSelectUser = (user: User) => {
    if (isGroupChat) {
      setSelectedUsers((prev) =>
        prev.find((u) => u._id === user._id)
          ? prev.filter((u) => u._id !== user._id)
          : [...prev, user]
      );
    } else {
      handleCreateChat([user]);
    }
  };

  const handleCreateChat = async (users: User[]) => {
    try {
      const participantIds = users.map((u) => u._id);
      const result = await createChatRoom({
        participantIds,
        isGroup: participantIds.length > 1,
      }).unwrap();

      const chatId = result?.data?._id;
      if (chatId) {
        navigate(`/chat/${chatId}`);
      } else {
        navigate("/chat");
      }
    } catch (error) {
      toast.error(t("chat.newChat.createError") || "Failed to create chat", {
        position: "top-right",
        autoClose: 3000,
        theme: "dark",
        transition: Bounce,
      });
    }
  };

  const handleCreateGroupChat = () => {
    if (selectedUsers.length < 2) {
      toast.error(t("chat.newChat.selectMoreUsers") || "Select at least 2 users for group chat", {
        position: "top-right",
        autoClose: 3000,
        theme: "dark",
        transition: Bounce,
      });
      return;
    }
    handleCreateChat(selectedUsers);
  };

  const formatLastSeen = (lastSeen?: string) => {
    if (!lastSeen) return "";
    const date = new Date(lastSeen);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return "Recently";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-teal-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-500 to-blue-500 text-white p-6 pb-8">
        <div className="flex items-center gap-4 mb-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">
              {t("chat.newChat.title") || "New Chat"}
            </h1>
            <p className="text-teal-100 text-sm">
              {t("chat.newChat.subtitle") || "Start a conversation"}
            </p>
          </div>
        </div>

        {/* Chat Type Toggle */}
        <div className="flex gap-2 bg-white/20 p-1 rounded-xl mb-4">
          <button
            onClick={() => {
              setIsGroupChat(false);
              setSelectedUsers([]);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-colors ${
              !isGroupChat
                ? "bg-white text-teal-600"
                : "text-white/70 hover:text-white"
            }`}
          >
            <MessageCircle className="w-5 h-5" />
            {t("chat.newChat.directMessage") || "Direct"}
          </button>
          <button
            onClick={() => setIsGroupChat(true)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium transition-colors ${
              isGroupChat
                ? "bg-white text-teal-600"
                : "text-white/70 hover:text-white"
            }`}
          >
            <Users className="w-5 h-5" />
            {t("chat.newChat.groupChat") || "Group"}
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("chat.newChat.searchPlaceholder") || "Search users..."}
            className="w-full pl-12 pr-4 py-3 bg-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:bg-white/30 transition-colors"
          />
        </div>
      </div>

      {/* Selected Users for Group Chat */}
      {isGroupChat && selectedUsers.length > 0 && (
        <div className="px-4 py-3 bg-white border-b">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {selectedUsers.map((user) => (
              <button
                key={user._id}
                onClick={() => handleSelectUser(user)}
                className="flex-shrink-0 flex items-center gap-2 pl-1 pr-3 py-1 bg-teal-100 text-teal-700 rounded-full"
              >
                <div className="w-6 h-6 rounded-full bg-teal-500 overflow-hidden">
                  {user.imageUrls?.[0] ? (
                    <img
                      src={user.imageUrls[0]}
                      alt={user.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-xs">
                      {user.name?.[0]}
                    </div>
                  )}
                </div>
                <span className="text-sm font-medium">{user.name}</span>
                <span className="text-teal-500">×</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="px-4 py-6 max-w-2xl mx-auto">
        {searchQuery.length < 2 ? (
          <div className="text-center py-12">
            <div className="p-4 rounded-full bg-teal-100 w-fit mx-auto mb-4">
              <UserPlus className="w-8 h-8 text-teal-500" />
            </div>
            <p className="text-gray-500">
              {t("chat.newChat.searchHint") || "Search for users to start a chat"}
            </p>
          </div>
        ) : isSearching ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-10 h-10 text-teal-500 animate-spin" />
          </div>
        ) : searchResults.length === 0 ? (
          <div className="text-center py-12">
            <div className="p-4 rounded-full bg-gray-100 w-fit mx-auto mb-4">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500">
              {t("chat.newChat.noResults") || "No users found"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {searchResults.map((user) => {
              const isSelected = selectedUsers.find((u) => u._id === user._id);

              return (
                <button
                  key={user._id}
                  onClick={() => handleSelectUser(user)}
                  disabled={isCreating}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all disabled:opacity-50 ${
                    isSelected
                      ? "bg-teal-50 border-teal-300"
                      : "bg-white/60 backdrop-blur-sm border-white/30 hover:bg-white/80"
                  }`}
                >
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-blue-500 overflow-hidden">
                      {user.imageUrls?.[0] ? (
                        <img
                          src={user.imageUrls[0]}
                          alt={user.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-lg font-bold">
                          {user.name?.[0]}
                        </div>
                      )}
                    </div>
                    {user.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                    )}
                  </div>

                  <div className="flex-1 text-left">
                    <h3 className="font-semibold text-gray-800">{user.name}</h3>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      {user.isOnline ? (
                        <span className="text-green-500">Online</span>
                      ) : (
                        <>
                          <Clock className="w-3 h-3" />
                          {formatLastSeen(user.lastSeen)}
                        </>
                      )}
                    </p>
                  </div>

                  {isGroupChat && (
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        isSelected
                          ? "bg-teal-500 border-teal-500 text-white"
                          : "border-gray-300"
                      }`}
                    >
                      {isSelected && <span className="text-sm">✓</span>}
                    </div>
                  )}

                  {!isGroupChat && (
                    <MessageCircle className="w-5 h-5 text-teal-500" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Group Chat Create Button */}
      {isGroupChat && selectedUsers.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t">
          <div className="max-w-2xl mx-auto">
            <button
              onClick={handleCreateGroupChat}
              disabled={isCreating || selectedUsers.length < 2}
              className="w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-teal-500 to-blue-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
            >
              {isCreating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Users className="w-5 h-5" />
                  {t("chat.newChat.createGroup") || "Create Group"} ({selectedUsers.length})
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewChat;
