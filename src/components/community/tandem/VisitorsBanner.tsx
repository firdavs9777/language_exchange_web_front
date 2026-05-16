import React from "react";
import { Link } from "react-router-dom";

interface VisitorAvatar {
  _id: string;
  name?: string;
  imageUrls?: string[];
  photo?: string;
}

interface VisitorsBannerProps {
  visitors: VisitorAvatar[];
  totalCount: number;
}

const VisitorsBanner: React.FC<VisitorsBannerProps> = ({ visitors, totalCount }) => {
  if (!visitors.length || totalCount === 0) return null;

  const featuredName = visitors[0]?.name || "Someone";
  const otherCount = Math.max(totalCount - 1, 0);
  const previewAvatars = visitors.slice(0, 3);
  const remaining = Math.max(totalCount - previewAvatars.length, 0);

  return (
    <div className="visitors-banner">
      <h3>
        {otherCount > 0
          ? `${featuredName} and ${otherCount} others visited your profile!`
          : `${featuredName} visited your profile!`}
      </h3>
      <div className="visitors-banner__bottom">
        <div className="visitors-banner__members">
          <div className="visitors-banner__avatars">
            {previewAvatars.map((visitor) => (
              <img
                key={visitor._id}
                src={visitor.imageUrls?.[0] || visitor.photo || "/default-avatar.png"}
                alt={visitor.name || "Visitor's Profile"}
                loading="lazy"
              />
            ))}
          </div>
          {remaining > 0 && <p>+{remaining}</p>}
        </div>
        <Link to="/visitors" className="visitors-banner__see-all">
          See all
        </Link>
      </div>
    </div>
  );
};

export default VisitorsBanner;
