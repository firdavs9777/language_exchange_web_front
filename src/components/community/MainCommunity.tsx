import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { useGetCommunityMembersQuery } from "../../store/slices/communitySlice";

// Components
import Message from "../Message";
import Loader from "../Loader";

// Styles
import "./MainCommunity.css";

export interface CommunityMember {
  _id: string;
  name: string;
  bio: string;
  native_language: string;
  language_to_learn: string;
  imageUrls: string[];
}

export interface CommunityResponse {
  success: boolean;
  count: number;
  data: CommunityMember[];
}

const MainCommunity = () => {
  const [filter, setFilter] = useState("");
  const { data, isLoading, error } = useGetCommunityMembersQuery({});
  const userId = useSelector((state: any) => state.auth.userInfo?.user._id);

  const filteredMembers = useMemo(() => {
    if (!data?.data) return [];

    return data.data
      .filter((member: any) => member._id !== userId)
      .filter(
        (member: any) =>
          filter === "" ||
          member.name.toLowerCase().includes(filter.toLowerCase()) ||
          member.native_language.toLowerCase().includes(filter.toLowerCase()) ||
          member.language_to_learn.toLowerCase().includes(filter.toLowerCase())
      );
  }, [data, userId, filter]);

  if (isLoading)
    return (
      <div className="loader-container">
        <Loader />
      </div>
    );
  if (error)
    return (
      <div className="error-container">
        <Message variant="danger">Error loading community members</Message>
      </div>
    );

  return (
    <div className="community-container">
      <div className="community-header">
        <h2>Language Exchange Community</h2>
      </div>

      {filteredMembers.length === 0 ? (
        <div className="empty-state">
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          <p>No community members found</p>
        </div>
      ) : (
        <div className="community-grid">
          {filteredMembers.map((member) => (
            <Link
              to={`/community/${member._id}`}
              key={member._id}
              className="member-link"
            >
              <div className="community-card">
                <div className="community-image-container">
                  <img
                    src={
                      member.imageUrls.length > 0
                        ? member.imageUrls[member.imageUrls.length - 1]
                        : "/images/default-avatar.jpg"
                    }
                    alt={member.name}
                    className="community-image"
                  />
                </div>
                <div className="community-profile">
                  <h3 className="card-title">{member.name}</h3>
                  <p className="card-text bio">
                    {member.bio?.substring(0, 80) || "No bio available"}
                    {member.bio?.length > 80 ? "..." : ""}
                  </p>
                  <div className="language-tags">
                    <span className="native-tag">
                      <span className="tag-label">Speaks:</span>{" "}
                      {member.native_language}
                    </span>
                    <span className="learning-tag">
                      <span className="tag-label">Learning:</span>{" "}
                      {member.language_to_learn}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default MainCommunity;
