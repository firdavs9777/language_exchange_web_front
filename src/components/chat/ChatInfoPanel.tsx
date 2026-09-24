import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import {
  Ban,
  Bell,
  BellOff,
  ChevronRight,
  Flag,
  Image as ImageIcon,
  Palette,
  ShieldOff,
  Trash2,
  User,
  X,
} from "lucide-react";
import DialogShell from "../../design/DialogShell";
import ConfirmDialog from "../../design/ConfirmDialog";
import Avatar from "../../design/Avatar";
import notify from "../../design/notify";
import {
  useGetConversationsQuery,
  useMuteConversationMutation,
  useUnmuteConversationMutation,
  useDeleteConversationMutation,
} from "../../store/slices/chatSlice";
import {
  useGetBlockStatusQuery,
  useBlockUserMutation,
  useUnblockUserMutation,
  useReportUserMutation,
} from "../../store/slices/usersSlice";

export interface ChatInfoPanelProps {
  /** The OTHER person — every route under /chat is keyed by their user id. */
  userId: string;
  userName: string;
  profilePicture?: string;
  onClose: () => void;
}

/**
 * The reasons `models/Report.js` will accept. Anything else is a 400 from
 * mongoose, so the picker offers these and nothing else; the free text the
 * reader types is the `description`.
 */
export const REPORT_REASONS = [
  "spam",
  "harassment",
  "hate_speech",
  "violence",
  "nudity",
  "false_information",
  "copyright",
  "other",
];

const REASON_FALLBACK: { [key: string]: string } = {
  spam: "Spam",
  harassment: "Harassment or bullying",
  hate_speech: "Hate speech",
  violence: "Violence or threats",
  nudity: "Nudity or sexual content",
  false_information: "False information",
  copyright: "Copyright",
  other: "Something else",
};

const ROW =
  "flex w-full items-center gap-3 rounded-card px-3 py-3 text-left text-sm text-ink-700 transition-colors hover:bg-ink-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-ink-200 dark:hover:bg-ink-800";
const ROW_DANGER =
  "flex w-full items-center gap-3 rounded-card px-3 py-3 text-left text-sm text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-500/10";
const HINT = "block text-xs font-normal text-ink-400 dark:text-ink-500";
const FIELD = [
  "mt-1 w-full rounded-card border border-line bg-surface px-3 py-2 text-sm",
  "text-ink-900 placeholder:text-ink-400",
  "dark:border-line-dark dark:bg-cardbg-dark dark:text-ink-50",
].join(" ");

function messageOf(error: any, fallback: string): string {
  if (!error) return fallback;
  if (error.data && typeof error.data.message === "string") return error.data.message;
  if (error.data && typeof error.data.error === "string") return error.data.error;
  if (typeof error.message === "string") return error.message;
  return fallback;
}

/**
 * What the app's "⋯" opens: profile, shared media, notifications, wallpaper,
 * block, report and delete, for the person on the other side of this chat.
 *
 * A right-hand drawer from 1024px and a bottom sheet below it — the same shell
 * every other dialog in the app uses, so Escape, the backdrop, the Tab loop,
 * the scroll lock and focus restore are not written a second time here.
 *
 * The conversation id is NOT in the URL and not in the message thread either:
 * `/chat/:userId` is keyed by the other user, and
 * `GET /messages/conversation/:senderId/:receiverId` answers with messages, no
 * conversation document. So mute and delete resolve it the way UsersList
 * already does — find the conversation in `GET /conversations` whose other
 * participant is this user. Until two people have a conversation document
 * there is nothing to mute or delete, and both rows say so.
 */
const ChatInfoPanel: React.FC<ChatInfoPanelProps> = ({
  userId,
  userName,
  profilePicture,
  onClose,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const viewerId = useSelector(
    (state: any) => state.auth.userInfo?.user?._id || state.auth.userInfo?._id
  );

  const { data: conversationsData } = useGetConversationsQuery({});
  const conversation = useMemo(() => {
    const list = conversationsData?.data;
    if (!Array.isArray(list)) return null;
    return (
      list.find((c: any) =>
        (c.participants || []).some((p: any) => (p?._id || p) === userId)
      ) || null
    );
  }, [conversationsData, userId]);
  const conversationId: string = conversation?._id || "";
  const isMuted = Boolean(conversation?.isMuted);

  const { data: blockStatus } = useGetBlockStatusQuery(
    { userId: viewerId, targetUserId: userId },
    { skip: !viewerId }
  );
  const isBlocked = Boolean(blockStatus?.data?.isBlocked);

  const [muteConversation, { isLoading: isMuting }] = useMuteConversationMutation();
  const [unmuteConversation, { isLoading: isUnmuting }] = useUnmuteConversationMutation();
  const [deleteConversation, { isLoading: isDeleting }] = useDeleteConversationMutation();
  const [blockUser, { isLoading: isBlocking }] = useBlockUserMutation();
  const [unblockUser, { isLoading: isUnblocking }] = useUnblockUserMutation();
  const [reportUser, { isLoading: isReporting }] = useReportUserMutation();

  const [dialog, setDialog] = useState<"block" | "delete" | "report" | null>(null);
  const [dialogError, setDialogError] = useState("");
  const [reason, setReason] = useState("other");
  const [description, setDescription] = useState("");
  const reasonRef = useRef<HTMLSelectElement | null>(null);

  // Block, report and delete all await a round trip and two of them navigate
  // away on success, so the panel can be gone before the promise settles.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const closeDialog = (): void => {
    setDialogError("");
    setDialog(null);
  };

  const handleMute = async (): Promise<void> => {
    if (!conversationId) return;
    try {
      if (isMuted) await unmuteConversation(conversationId).unwrap();
      else await muteConversation({ conversationId }).unwrap();
      notify.success(
        isMuted
          ? t("chatPage.info.unmuted") || "Notifications are back on"
          : t("chatPage.info.muted") || "Notifications muted"
      );
    } catch (error) {
      notify.error(
        messageOf(
          error,
          t("chatPage.info.muteFailed") || "Couldn't update notifications"
        )
      );
    }
  };

  const handleBlockConfirm = async (): Promise<void> => {
    setDialogError("");
    try {
      if (isBlocked) {
        await unblockUser(userId).unwrap();
        if (mounted.current) closeDialog();
        notify.success(t("chatPage.info.unblocked") || "Unblocked");
        return;
      }
      await blockUser(userId).unwrap();
      if (mounted.current) closeDialog();
      notify.success(t("chatPage.info.blocked") || "Blocked");
      // Sitting in the thread of someone you just blocked is the one place
      // this must not leave you.
      onClose();
      navigate("/chat");
    } catch (error) {
      if (!mounted.current) return;
      setDialogError(
        messageOf(error, t("chatPage.info.blockFailed") || "That didn't work. Try again.")
      );
    }
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    setDialogError("");
    if (!conversationId) return;
    try {
      await deleteConversation(conversationId).unwrap();
      if (mounted.current) closeDialog();
      notify.success(t("chatPage.actions.deleted") || "Conversation deleted");
      onClose();
      navigate("/chat");
    } catch (error) {
      if (!mounted.current) return;
      setDialogError(
        messageOf(
          error,
          t("chatPage.actions.deleteFailed") || "Couldn't delete the conversation"
        )
      );
    }
  };

  const handleReportSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setDialogError("");
    try {
      await reportUser({
        type: "user",
        reportedUser: userId,
        reason,
        description,
      }).unwrap();
      if (mounted.current) {
        closeDialog();
        setDescription("");
        setReason("other");
      }
      notify.success(
        t("chatPage.info.reported") || "Thanks — moderators will take a look"
      );
    } catch (error) {
      if (!mounted.current) return;
      setDialogError(
        messageOf(error, t("chatPage.info.reportFailed") || "Couldn't send the report")
      );
    }
  };

  const noConversationHint = conversationId
    ? null
    : t("chatPage.info.noConversationYet") || "Say something first";

  return (
    <React.Fragment>
      <DialogShell
        labelledBy="chat-info-title"
        onClose={onClose}
        testId="chat-info-panel"
        backdropTestId="chat-info-backdrop"
        // A dialog opened from the panel owns Escape and the backdrop until
        // it is answered; otherwise one Escape would close both.
        dismissible={dialog === null}
        containerClassName="fixed inset-0 z-[70] flex items-end justify-center lg:items-stretch lg:justify-end"
        panelClassName={[
          "relative flex max-h-[85vh] w-full flex-col overflow-y-auto rounded-t-card border border-line",
          "bg-surface p-4 shadow-lg",
          "lg:h-full lg:max-h-none lg:w-[22rem] lg:rounded-none lg:border-y-0 lg:border-r-0",
          "dark:border-line-dark dark:bg-cardbg-dark",
        ].join(" ")}
      >
        <div className="flex items-start justify-between gap-2">
          <h2
            id="chat-info-title"
            className="font-display text-base text-ink-900 dark:text-ink-50"
          >
            {t("chatPage.info.title") || "Chat info"}
          </h2>
          <button
            type="button"
            data-testid="chat-info-close"
            onClick={onClose}
            aria-label={t("chatPage.info.close") || "Close"}
            className="rounded-chip p-1.5 text-ink-500 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="flex flex-col items-center gap-2 py-4">
          <Avatar src={profilePicture} name={userName} size={72} />
          <p className="font-display text-base text-ink-900 dark:text-ink-50">
            {userName}
          </p>
        </div>

        <nav className="flex flex-col gap-0.5">
          <Link to={`/community/${userId}`} data-testid="chat-info-profile" className={ROW}>
            <User className="h-4 w-4 shrink-0" aria-hidden />
            <span className="flex-1">{t("chatPage.info.viewProfile") || "View profile"}</span>
            <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
          </Link>

          <Link to={`/chat/${userId}/media`} data-testid="chat-info-media" className={ROW}>
            <ImageIcon className="h-4 w-4 shrink-0" aria-hidden />
            <span className="flex-1">{t("chatPage.info.media") || "Shared media"}</span>
            <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
          </Link>

          <button
            type="button"
            data-testid="chat-info-mute"
            onClick={handleMute}
            disabled={!conversationId || isMuting || isUnmuting}
            className={ROW}
          >
            {isMuted ? (
              <BellOff className="h-4 w-4 shrink-0" aria-hidden />
            ) : (
              <Bell className="h-4 w-4 shrink-0" aria-hidden />
            )}
            <span className="flex-1">
              {isMuted
                ? t("chatPage.info.unmute") || "Unmute notifications"
                : t("chatPage.info.mute") || "Mute notifications"}
              {noConversationHint ? <span className={HINT}>{noConversationHint}</span> : null}
            </span>
          </button>

          {/* Wired in Task H3, which brings the per-conversation wallpapers
              and the tokens they paint with. Shown disabled rather than
              omitted so the entry the app has keeps its place. */}
          <button type="button" data-testid="chat-info-wallpaper" disabled className={ROW}>
            <Palette className="h-4 w-4 shrink-0" aria-hidden />
            <span className="flex-1">
              {t("chatPage.info.wallpaper") || "Wallpaper"}
              <span className={HINT}>{t("chatPage.info.comingSoon") || "Coming soon"}</span>
            </span>
          </button>

          <button
            type="button"
            data-testid="chat-info-block"
            onClick={() => setDialog("block")}
            disabled={isBlocking || isUnblocking}
            className={ROW}
          >
            {isBlocked ? (
              <ShieldOff className="h-4 w-4 shrink-0" aria-hidden />
            ) : (
              <Ban className="h-4 w-4 shrink-0" aria-hidden />
            )}
            <span className="flex-1">
              {isBlocked
                ? t("chatPage.info.unblock") || "Unblock"
                : t("chatPage.info.block") || "Block"}
            </span>
          </button>

          <button
            type="button"
            data-testid="chat-info-report"
            onClick={() => setDialog("report")}
            className={ROW}
          >
            <Flag className="h-4 w-4 shrink-0" aria-hidden />
            <span className="flex-1">{t("chatPage.info.report") || "Report"}</span>
          </button>

          <button
            type="button"
            data-testid="chat-info-delete"
            onClick={() => setDialog("delete")}
            disabled={!conversationId || isDeleting}
            className={ROW_DANGER}
          >
            <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
            <span className="flex-1">
              {t("chatPage.info.delete") || "Delete conversation"}
              {noConversationHint ? <span className={HINT}>{noConversationHint}</span> : null}
            </span>
          </button>
        </nav>
      </DialogShell>

      <ConfirmDialog
        open={dialog === "block"}
        danger={!isBlocked}
        title={
          isBlocked
            ? t("chatPage.info.unblockTitle", { name: userName }) || `Unblock ${userName}?`
            : t("chatPage.info.blockTitle", { name: userName }) || `Block ${userName}?`
        }
        body={
          isBlocked
            ? t("chatPage.info.unblockBody") ||
              "They will be able to message you again."
            : t("chatPage.info.blockBody") ||
              "They will not be able to message you or see your profile."
        }
        confirmLabel={
          isBlocked
            ? t("chatPage.info.unblock") || "Unblock"
            : t("chatPage.info.block") || "Block"
        }
        cancelLabel={t("chatPage.info.cancel") || "Cancel"}
        busy={isBlocking || isUnblocking}
        error={dialogError || undefined}
        onConfirm={handleBlockConfirm}
        onCancel={closeDialog}
      />

      <ConfirmDialog
        open={dialog === "delete"}
        danger
        title={t("chatPage.deleteModal.title") || "Delete conversation"}
        body={
          t("chatPage.deleteModal.body", { name: userName }) ||
          `Delete your conversation with ${userName}?`
        }
        confirmLabel={t("chatPage.deleteModal.confirm") || "Delete"}
        cancelLabel={t("chatPage.deleteModal.cancel") || "Cancel"}
        busy={isDeleting}
        error={dialogError || undefined}
        onConfirm={handleDeleteConfirm}
        onCancel={closeDialog}
      />

      {dialog === "report" ? (
        <DialogShell
          labelledBy="chat-report-title"
          onClose={closeDialog}
          testId="chat-report-dialog"
          backdropTestId="chat-report-backdrop"
          initialFocusRef={reasonRef}
          dismissible={!isReporting}
        >
          <h2
            id="chat-report-title"
            className="font-display text-base text-ink-900 dark:text-ink-50"
          >
            {t("chatPage.info.reportTitle", { name: userName }) || `Report ${userName}`}
          </h2>
          <p className="pt-2 text-sm text-ink-600 dark:text-ink-300">
            {t("chatPage.info.reportBody") ||
              "Tell us what is wrong. Every report is reviewed."}
          </p>

          <form data-testid="chat-report-form" onSubmit={handleReportSubmit}>
            <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-ink-500 dark:text-ink-400">
              {t("chatPage.info.reportReason") || "Reason"}
              <select
                data-testid="chat-report-reason"
                ref={reasonRef}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={FIELD}
              >
                {REPORT_REASONS.map((value) => (
                  <option key={value} value={value}>
                    {t(`chatPage.reportReasons.${value}`) || REASON_FALLBACK[value]}
                  </option>
                ))}
              </select>
            </label>

            <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-ink-500 dark:text-ink-400">
              {t("chatPage.info.reportDescription") || "Details (optional)"}
              <textarea
                data-testid="chat-report-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={500}
                className={FIELD}
              />
            </label>

            {dialogError ? (
              <div
                data-testid="chat-report-error"
                role="alert"
                className="mt-4 rounded-card border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300"
              >
                {dialogError}
              </div>
            ) : null}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                data-testid="chat-report-cancel"
                onClick={closeDialog}
                disabled={isReporting}
                className="rounded-chip border border-line px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-ink-100 disabled:opacity-50 dark:border-line-dark dark:text-ink-200 dark:hover:bg-ink-800"
              >
                {t("chatPage.info.cancel") || "Cancel"}
              </button>
              <button
                type="submit"
                data-testid="chat-report-submit"
                disabled={isReporting}
                aria-busy={isReporting}
                className="rounded-chip bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {t("chatPage.info.reportSubmit") || "Send report"}
              </button>
            </div>
          </form>
        </DialogShell>
      ) : null}
    </React.Fragment>
  );
};

export default ChatInfoPanel;
