import React from "react";
import {
  useFollowUserMutation,
  useUnFollowUserMutation,
} from "../store/slices/usersSlice";

export interface FollowButtonProps {
  /** The viewer. Both mutations take { userId, targetUserId }. */
  userId: string;
  /** The person being followed. */
  targetUserId: string;
  /**
   * Current follow state, owned by the caller and read from the RTK Query
   * cache -- NOT local state. Two cards by the same author in one feed would
   * otherwise disagree after a tap.
   */
  isFollowing: boolean;
  onToggled?: (nowFollowing: boolean) => void;
}

const FollowButton: React.FC<FollowButtonProps> = ({
  userId,
  targetUserId,
  isFollowing,
  onToggled,
}) => {
  const [followUser, { isLoading: following }] = useFollowUserMutation();
  const [unFollowUser, { isLoading: unfollowing }] = useUnFollowUserMutation();
  const busy = following || unfollowing;

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (busy) return;
    try {
      if (isFollowing) await unFollowUser({ userId, targetUserId }).unwrap();
      else await followUser({ userId, targetUserId }).unwrap();
      onToggled?.(!isFollowing);
    } catch {
      // The mutation's own error handling surfaces this; the button simply
      // stays in whatever state the cache reports.
    }
  };

  return (
    <button
      type="button"
      data-testid="follow-button"
      onClick={handleClick}
      disabled={busy}
      aria-pressed={isFollowing}
      className={`rounded-full border px-3 py-1 text-xs font-bold transition-colors disabled:opacity-60 ${
        isFollowing
          ? "border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-300"
          : "border-brand text-brand-dark hover:bg-brand/[0.08] dark:text-brand-light"
      }`}
    >
      {isFollowing ? "Following" : "Follow"}
    </button>
  );
};

export default FollowButton;
