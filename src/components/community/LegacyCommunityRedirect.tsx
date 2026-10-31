import React from "react";
import { Navigate, useLocation } from "react-router-dom";

/**
 * Old City / Genders / Topics links (pasted, bookmarked, shared by the app)
 * land on the Partners list with the matching chip -- `tab=all`, since a bare
 * /communities opens on Matches -- carrying the city search (`q`) and the
 * topic (`topic`/`topics`) they had. Replaces the history entry.
 */
const LegacyCommunityRedirect: React.FC<{ add?: Record<string, string> }> = ({ add }) => {
  const from = new URLSearchParams(useLocation().search);
  const to = new URLSearchParams({ tab: "all", ...(add || {}) });
  const q = from.get("q") || from.get("search");
  if (q) to.set("q", q);
  const topic = from.get("topic") || from.get("topics");
  if (topic) to.set("topics", topic);
  return <Navigate replace to={`/communities?${to.toString()}`} />;
};

export default LegacyCommunityRedirect;
