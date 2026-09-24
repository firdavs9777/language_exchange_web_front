import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  useFollowUserMutation,
  useUnFollowUserMutation,
} from "../../store/slices/usersSlice";

export interface FollowToggle {
  /** What the button should say right now, optimistic flip included. */
  following: boolean;
  /** A mutation is in flight; the caller disables its control. */
  busy: boolean;
  toggle: () => Promise<void>;
}

/**
 * One follow/unfollow control's behaviour, shared by the profile action row
 * and every row of the followers / following / visitors lists.
 *
 * Optimistic on purpose: the round trip is long enough that a button which
 * waits for it reads as a button that did nothing. The flip is rolled back if
 * the mutation is rejected, and `onChanged` fires only for a change the server
 * accepted — a caller must never record a follow that did not happen.
 *
 * `isFollowing` stays the caller's: it comes from the RTK Query cache, and the
 * local state only holds the optimistic flip until the query behind it catches
 * up (hence the effect re-syncing on every change).
 */
export default function useFollowToggle(
  targetId: string,
  isFollowing?: boolean,
  onChanged?: (nowFollowing: boolean) => void
): FollowToggle {
  const navigate = useNavigate();
  const viewerId = useSelector(
    (state: any) => state.auth.userInfo?.user?._id || state.auth.userInfo?._id
  );

  const [followUser, { isLoading: isFollowLoading }] = useFollowUserMutation();
  const [unFollowUser, { isLoading: isUnfollowLoading }] = useUnFollowUserMutation();
  const busy = isFollowLoading || isUnfollowLoading;

  const [following, setFollowing] = useState(Boolean(isFollowing));

  useEffect(() => {
    setFollowing(Boolean(isFollowing));
  }, [isFollowing]);

  const toggle = useCallback(async (): Promise<void> => {
    if (!viewerId) {
      navigate("/login");
      return;
    }
    if (!targetId || busy) return;

    const next = !following;
    setFollowing(next);
    try {
      if (next) await followUser({ userId: viewerId, targetUserId: targetId }).unwrap();
      else await unFollowUser({ userId: viewerId, targetUserId: targetId }).unwrap();
      if (onChanged) onChanged(next);
    } catch (error) {
      setFollowing(!next);
    }
  }, [viewerId, targetId, busy, following, followUser, unFollowUser, onChanged, navigate]);

  return { following, busy, toggle };
}
