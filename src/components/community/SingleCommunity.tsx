import { useLocation } from "react-router-dom";
import { CommunityMember } from "./MainCommunity"; // or import from your types file

const SingleCommunity = () => {
  const location = useLocation();
  const member = location.state as CommunityMember;

  if (!member) {
    return <div>No member info provided.</div>;
  }

  return (
    <div className="single-community-container">
      <h2>{member.name}'s Profile</h2>
      <img
        src={
          member.imageUrls.length > 0
            ? member.imageUrls[member.imageUrls.length - 1]
            : "/images/default-avatar.jpg"
        }
        alt={member.name}
        className="single-community-image"
      />
      <p>
        <strong>Bio:</strong> {member.bio || "No bio available"}
      </p>
      <p>
        <strong>Speaks:</strong> {member.native_language}
      </p>
      <p>
        <strong>Learning:</strong> {member.language_to_learn}
      </p>
    </div>
  );
};

export default SingleCommunity;
