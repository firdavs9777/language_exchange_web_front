import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Spinner, Alert } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import { useGetUserByIdQuery } from "../../store/slices/usersSlice";
import CommunityDetail from "../community/CommunityDetail";

// Public, read-only profile route: /profile/:userId
//
// This MUST work for logged-out visitors (no auth wall) so shared
// "banatalk.com/profile/:userId" links resolve for anyone. It is
// intentionally separate from the owner's `/profile` route (Profile.tsx),
// which always renders the logged-in user's own editable profile.
//
// Rather than rebuild profile markup, this reuses the existing
// `CommunityDetail` view — the component the app already uses to render a
// read-only view of another user's profile (it already hides owner-only
// actions like follow/chat when the viewer IS the profile owner, and it
// hits the same `auth/users/:userId` endpoint via useGetUserByIdQuery /
// useGetCommunityDetailsQuery).
const PublicProfile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Fetch here (in addition to CommunityDetail's own fetch) so this route
  // owns its own loading/error/not-found states per the userId path param,
  // using the confirmed hook for GET auth/users/:userId.
  const { data, isLoading, error } = useGetUserByIdQuery(userId as string, {
    skip: !userId,
  });

  if (!userId) {
    return (
      <div className="container py-5 text-center">
        <Alert variant="danger" className="rounded-4 d-inline-block">
          {t("communityDetail.errors.invalidProfileId", "Invalid profile link.")}
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <div className="container py-5 text-center">
        <div className="display-1 mb-3">🔍</div>
        <h3 className="fw-bold">
          {t("communityDetail.errors.profileNotFound", "Profile not found")}
        </h3>
        <p className="text-muted mb-4">
          {t(
            "communityDetail.errors.profileNotFoundDesc",
            "This profile doesn't exist or is no longer available."
          )}
        </p>
        <button
          className="btn btn-outline-primary rounded-3"
          onClick={() => navigate("/")}
        >
          {t("common.backHome", "Back to home")}
        </button>
      </div>
    );
  }

  // Reuse the existing read-only profile view. `readOnly` forces owner-only
  // actions (follow, start chat, practice CTA) to stay hidden for every
  // visitor to this public route — logged out or logged in as someone else —
  // regardless of auth state. `hideCommunityChrome` drops the "Back to
  // Community" nav since this is reached via a shared profile link, not the
  // community browse flow.
  return <CommunityDetail userId={userId} hideCommunityChrome readOnly />;
};

export default PublicProfile;
