import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { Ban, Flag, MessageCircle, MoreHorizontal, Pencil, Settings } from "lucide-react";
import ConfirmDialog from "../../../design/ConfirmDialog";
import useFollowToggle from "../useFollowToggle";
import {
  useBlockUserMutation,
  useReportUserMutation,
} from "../../../store/slices/usersSlice";
import { useCreateChatRoomMutation } from "../../../store/slices/chatSlice";

export interface ProfileActionsProps {
  /** The profile being viewed. */
  userId: string;
  isOwn: boolean;
  /** Used in the block and report confirmations. */
  name?: string;
  /** Follow state from the profile data, owned by the caller. */
  isFollowing?: boolean;
  /** Fired after a follow/unfollow the server accepted, never after a rollback. */
  onFollowChanged?: (nowFollowing: boolean) => void;
  /**
   * Fired after the block succeeded. The page owns the destination: staying on
   * the profile of someone you just blocked is the one thing it must not do.
   */
  onBlocked?: () => void;
}

function messageOf(error: any, fallback: string): string {
  if (!error) return fallback;
  if (error.data && typeof error.data.message === "string") return error.data.message;
  if (typeof error.message === "string") return error.message;
  return fallback;
}

const PRIMARY =
  "inline-flex flex-1 items-center justify-center gap-1.5 rounded-chip bg-brand-deep px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60";
const SECONDARY =
  "inline-flex flex-1 items-center justify-center gap-1.5 rounded-chip border border-line px-4 py-2 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-100 disabled:opacity-60 dark:border-line-dark dark:text-ink-200 dark:hover:bg-ink-800";
const MENU_ITEM =
  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink-700 hover:bg-ink-100 dark:text-ink-200 dark:hover:bg-ink-800";

/**
 * The action row under the header.
 *
 * Own profile: edit and settings. Anyone else: message, follow and an overflow
 * menu carrying block and report — both destructive, both behind the same
 * confirmation the admin console uses.
 *
 * Follow is optimistic: the label flips on the tap and rolls back if the
 * mutation is rejected, because the round trip is long enough that a button
 * which waits reads as a button that did nothing.
 */
const ProfileActions: React.FC<ProfileActionsProps> = ({
  userId,
  isOwn,
  name,
  isFollowing,
  onFollowChanged,
  onBlocked,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const viewerId = useSelector(
    (state: any) => state.auth.userInfo?.user?._id || state.auth.userInfo?._id
  );

  const [blockUser, { isLoading: isBlocking }] = useBlockUserMutation();
  const [reportUser, { isLoading: isReporting }] = useReportUserMutation();
  const [createChatRoom, { isLoading: isCreatingChat }] = useCreateChatRoomMutation();

  // Optimistic follow, rollback and the signed-out bounce all live in the
  // hook the list rows use, so the button here and a row in /followersList
  // cannot behave differently.
  const { following, busy: followBusy, toggle: handleFollowToggle } = useFollowToggle(
    userId,
    isFollowing,
    onFollowChanged
  );

  const [menuOpen, setMenuOpen] = useState(false);
  const [dialog, setDialog] = useState<"block" | "report" | null>(null);
  const [dialogError, setDialogError] = useState("");
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Block, report and the chat pre-create all await a round trip, and the
  // block handler navigates away on success — so the component can well be
  // gone by the time the promise settles. Every post-await setState is gated
  // on this rather than firing into a torn-down tree.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Bound in an effect, never read during render.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    const onPointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [menuOpen]);

  const personName = name || t("profile.actions.this_person") || "this person";

  const handleMessage = async (): Promise<void> => {
    if (!viewerId) {
      navigate("/login");
      return;
    }
    try {
      await createChatRoom(userId).unwrap();
    } catch (error) {
      // The chat screen creates the room itself on first send, so a failed
      // pre-create must not strand the user on the profile.
    }
    if (!mounted.current) return;
    navigate(`/chat/${userId}`);
  };

  const openDialog = (which: "block" | "report"): void => {
    setDialogError("");
    setMenuOpen(false);
    setDialog(which);
  };

  const handleConfirm = async (reason: string): Promise<void> => {
    setDialogError("");
    const blocking = dialog === "block";
    try {
      if (blocking) await blockUser(userId).unwrap();
      else await reportUser({ userId, reason }).unwrap();
      if (mounted.current) setDialog(null);
      if (blocking && onBlocked) onBlocked();
    } catch (error) {
      if (!mounted.current) return;
      setDialogError(
        messageOf(error, t("profile.actions.action_failed") || "That didn't work. Try again.")
      );
    }
  };

  if (isOwn) {
    return (
      <div className="flex items-center gap-2">
        <Link to="/profile/edit" data-testid="action-edit-profile" className={PRIMARY}>
          <Pencil className="h-4 w-4" aria-hidden />
          {t("profile.edit_profile") || "Edit profile"}
        </Link>
        <Link to="/settings" data-testid="action-settings" className={SECONDARY}>
          <Settings className="h-4 w-4" aria-hidden />
          {t("profile.actions.settings") || "Settings"}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        data-testid="action-message"
        onClick={handleMessage}
        disabled={isCreatingChat}
        className={PRIMARY}
      >
        <MessageCircle className="h-4 w-4" aria-hidden />
        {t("profile.actions.message") || "Message"}
      </button>

      <button
        type="button"
        data-testid="action-follow"
        onClick={handleFollowToggle}
        disabled={followBusy}
        aria-pressed={following}
        className={SECONDARY}
      >
        {following
          ? t("profile.actions.following") || "Following"
          : t("profile.actions.follow") || "Follow"}
      </button>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          data-testid="action-more"
          onClick={() => setMenuOpen((open) => !open)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label={t("profile.actions.more") || "More options"}
          className="rounded-chip border border-line p-2 text-ink-600 transition-colors hover:bg-ink-100 dark:border-line-dark dark:text-ink-300 dark:hover:bg-ink-800"
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden />
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-card border border-line bg-surface py-1 shadow-float dark:border-line-dark dark:bg-cardbg-dark"
          >
            <button
              type="button"
              role="menuitem"
              data-testid="action-block"
              onClick={() => openDialog("block")}
              className={MENU_ITEM}
            >
              <Ban className="h-4 w-4" aria-hidden />
              {t("profile.actions.block") || "Block"}
            </button>
            <button
              type="button"
              role="menuitem"
              data-testid="action-report"
              onClick={() => openDialog("report")}
              className={MENU_ITEM}
            >
              <Flag className="h-4 w-4" aria-hidden />
              {t("profile.actions.report") || "Report"}
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={dialog === "block"}
        danger
        title={t("profile.block.title", { name: personName }) || `Block ${personName}?`}
        body={
          t("profile.block.body") ||
          "They will not be able to message you or see your profile."
        }
        confirmLabel={t("profile.actions.block") || "Block"}
        cancelLabel={t("profile.actions.cancel") || "Cancel"}
        busy={isBlocking}
        error={dialogError || undefined}
        onConfirm={handleConfirm}
        onCancel={() => setDialog(null)}
      />

      <ConfirmDialog
        open={dialog === "report"}
        danger
        requireReason
        reasonLabel={t("profile.report.reason") || "Reason"}
        title={t("profile.report.title", { name: personName }) || `Report ${personName}?`}
        body={t("profile.report.body") || "Tell us what is wrong. Every report is reviewed."}
        confirmLabel={t("profile.actions.report") || "Report"}
        cancelLabel={t("profile.actions.cancel") || "Cancel"}
        busy={isReporting}
        error={dialogError || undefined}
        onConfirm={handleConfirm}
        onCancel={() => setDialog(null)}
      />
    </div>
  );
};

export default ProfileActions;
