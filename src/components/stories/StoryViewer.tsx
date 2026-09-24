import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  useGetUserStoriesQuery,
  useMarkIndividualStoryViewedMutation,
  useReactToStoryMutation,
  useRemoveReactionMutation,
  useReplyToStoryMutation,
  useVoteOnPollMutation,
  useDeleteIndividualStoryMutation,
  useAnswerQuestionMutation,
} from "../../store/slices/storiesSlice";
import { useTranslation } from "react-i18next";
import {
  FaTimes,
  FaChevronLeft,
  FaChevronRight,
  FaHeart,
  FaComment,
  FaShare,
  FaEllipsisH,
  FaTrash,
} from "react-icons/fa";
import { Check, Eye, MessageCircleQuestion, Send, Share2 } from "lucide-react";
import notify from "../../design/notify";
import StoryViewersSheet from "./StoryViewersSheet";
import QuestionResponsesSheet from "./QuestionResponsesSheet";
import StoryShareSheet from "./StoryShareSheet";
import { Story, STORY_REACTIONS } from "./types";
import "./StoryViewer.scss";

interface RootState {
  auth: {
    userInfo?: {
      user?: {
        _id: string;
        name: string;
        imageUrls?: string[];
      };
      data?: {
        _id: string;
        name: string;
        imageUrls?: string[];
      };
    };
  };
}

/** Which sheet is open, if any. Only ever one at a time. */
type OpenSheet = "viewers" | "responses" | "share" | null;

const PILL =
  "flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-2 text-sm font-medium text-white backdrop-blur transition hover:bg-white/25";

const StoryViewer: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const startIndex = (location.state as any)?.startIndex || 0;

  const currentUserId = useSelector(
    (state: RootState) =>
      state.auth.userInfo?.user?._id || state.auth.userInfo?.data?._id || null
  );

  const [currentStoryIndex, setCurrentStoryIndex] = useState(startIndex);
  const [progress, setProgress] = useState(0);
  const [isHeld, setIsHeld] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [userReaction, setUserReaction] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  // Question sticker: the inline answer box, its anonymous toggle, and the
  // "sent" state that replaces both afterwards.
  const [showAnswerBox, setShowAnswerBox] = useState(false);
  const [answerText, setAnswerText] = useState("");
  const [answerAnonymously, setAnswerAnonymously] = useState(false);
  const [answerSent, setAnswerSent] = useState(false);
  const [openSheet, setOpenSheet] = useState<OpenSheet>(null);

  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const storyRef = useRef<HTMLDivElement>(null);

  // Fetch user's stories
  const {
    data: storiesData,
    isLoading,
    error,
  } = useGetUserStoriesQuery(userId || "", { skip: !userId });

  const [markViewed] = useMarkIndividualStoryViewedMutation();
  const [reactToStory] = useReactToStoryMutation();
  const [removeReaction] = useRemoveReactionMutation();
  const [replyToStory] = useReplyToStoryMutation();
  const [voteOnPoll] = useVoteOnPollMutation();
  const [deleteStory] = useDeleteIndividualStoryMutation();
  const [answerQuestion] = useAnswerQuestionMutation();

  const stories = useMemo(() => {
    if (!storiesData) return [];
    const response = storiesData as { success?: boolean; data?: Story[]; count?: number };
    return Array.isArray(response) ? response : response.data || [];
  }, [storiesData]);

  const currentStory = stories[currentStoryIndex];
  const isOwner = currentStory?.user._id === currentUserId;

  // Three reasons to stand still: a finger held on the story, an answer being
  // typed, or a sheet covering it. Anything that takes the reader's attention
  // off the picture stops the clock, or the story they come back to is not
  // the one they left.
  const isPaused = isHeld || showAnswerBox || openSheet !== null;

  // Progress bar animation
  useEffect(() => {
    if (!currentStory || isPaused || currentStory.mediaType === "text") {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
      return;
    }

    const duration = 5000; // 5 seconds per story
    const interval = 100; // Update every 100ms
    const increment = (interval / duration) * 100;

    progressIntervalRef.current = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          handleNextStory();
          return 0;
        }
        return prev + increment;
      });
    }, interval);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, [currentStory, isPaused]);

  // Mark story as viewed
  useEffect(() => {
    if (currentStory && !isOwner) {
      markViewed(currentStory._id);
    }
  }, [currentStory?._id, isOwner]);

  // Check user's reaction
  useEffect(() => {
    if (currentStory && currentUserId) {
      const reaction = (currentStory.reactions || []).find(
        (r) => r.user._id === currentUserId
      );
      setUserReaction(reaction?.emoji || null);
    } else {
      setUserReaction(null);
    }
  }, [currentStory, currentUserId]);

  // Everything below belongs to one story and nothing else: a half-typed
  // answer must not follow the reader to the next one, and "sent" must not
  // make the next question sticker look already answered.
  useEffect(() => {
    setShowAnswerBox(false);
    setAnswerText("");
    setAnswerAnonymously(false);
    setAnswerSent(false);
    setOpenSheet(null);
    setShowReactions(false);
    setShowMenu(false);
  }, [currentStory?._id]);

  const handleNextStory = useCallback(() => {
    if (currentStoryIndex < stories.length - 1) {
      setCurrentStoryIndex(currentStoryIndex + 1);
      setProgress(0);
    } else {
      handleClose();
    }
  }, [currentStoryIndex, stories.length]);

  const handlePrevStory = useCallback(() => {
    if (currentStoryIndex > 0) {
      setCurrentStoryIndex(currentStoryIndex - 1);
      setProgress(0);
    }
  }, [currentStoryIndex]);

  const handleClose = () => {
    navigate("/stories");
  };

  const handleReaction = async (emoji: string) => {
    if (!currentStory) return;
    const storyId = currentStory._id;

    try {
      if (userReaction === emoji) {
        // DELETE, not another POST. `POST /:id/react` REPLACES the viewer's
        // reaction with the emoji it is given — it does not toggle — so
        // re-posting the same emoji left the reaction on the story while the
        // UI cleared it: the reader thought they had taken it back and the
        // owner still saw it.
        await removeReaction({ storyId, emoji }).unwrap();
        setUserReaction(null);
      } else {
        await reactToStory({ storyId, emoji }).unwrap();
        setUserReaction(emoji);
      }
    } catch (err) {
      notify.error(t("stories.reaction_failed") || "Couldn't save your reaction");
    }
    setShowReactions(false);
  };

  const handleReply = async () => {
    if (!currentStory || !replyText.trim()) return;

    try {
      await replyToStory({
        storyId: currentStory._id,
        message: replyText,
      }).unwrap();
      setReplyText("");
      setShowReplyInput(false);
    } catch (error) {
      console.error("Failed to send reply:", error);
    }
  };

  /**
   * The question sticker's own endpoint — `POST /:id/question/answer` — and
   * not the DM reply the "Answer" button used to open. An answer belongs to
   * the sticker: the owner reads it in the responses sheet, and it can be
   * sent anonymously, which a DM never can.
   */
  const handleAnswerQuestion = async () => {
    const text = answerText.trim();
    if (!currentStory || !text) return;

    try {
      await answerQuestion({
        id: currentStory._id,
        text,
        isAnonymous: answerAnonymously,
      }).unwrap();
      setAnswerText("");
      setShowAnswerBox(false);
      setAnswerSent(true);
      notify.success(t("stories.answer_sent") || "Answer sent");
    } catch (err) {
      notify.error(t("stories.answer_failed") || "Couldn't send your answer");
    }
  };

  const handlePollVote = async (optionIndex: number) => {
    if (!currentStory?.poll) return;

    try {
      await voteOnPoll({
        storyId: currentStory._id,
        optionIndex,
      }).unwrap();
    } catch (error) {
      console.error("Failed to vote:", error);
    }
  };

  const handleDeleteStory = async () => {
    if (!currentStory || !isOwner) return;

    if (window.confirm(t("stories.delete_story") || "Delete this story?")) {
      try {
        await deleteStory(currentStory._id).unwrap();
        if (stories.length === 1) {
          handleClose();
        } else {
          handleNextStory();
        }
      } catch (error) {
        console.error("Failed to delete story:", error);
      }
    }
    setShowMenu(false);
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    // While an answer is being typed or a sheet is open the keyboard belongs
    // to them: arrows move the caret, and Escape closes the dialog (which
    // DialogShell handles itself) rather than the whole viewer.
    if (showAnswerBox || openSheet !== null) return;
    if (e.key === "ArrowLeft") handlePrevStory();
    if (e.key === "ArrowRight") handleNextStory();
    if (e.key === "Escape") handleClose();
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyPress as any);
    return () => window.removeEventListener("keydown", handleKeyPress as any);
  }, [currentStoryIndex, stories.length, showAnswerBox, openSheet]);

  if (isLoading) {
    return (
      <div className="story-viewer">
        <div className="story-viewer-loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (error || !stories.length || !currentStory) {
    return (
      <div className="story-viewer">
        <div className="story-viewer-error">
          <button className="close-btn" onClick={handleClose}>
            <FaTimes />
          </button>
          <p>{t("stories.error_loading") || "Error loading story"}</p>
        </div>
      </div>
    );
  }

  const userImage =
    currentStory.user.imageUrls?.[0] ||
    currentStory.user.images?.[0] ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(currentStory.user.name)}&background=667eea&color=fff&size=200`;

  return (
    <>
      <div
        className="story-viewer"
        data-testid="story-viewer"
        data-paused={isPaused ? "true" : "false"}
        ref={storyRef}
        onMouseDown={() => setIsHeld(true)}
        onMouseUp={() => setIsHeld(false)}
        onTouchStart={() => setIsHeld(true)}
        onTouchEnd={() => setIsHeld(false)}
      >
        {/* Progress Bars */}
        <div className="story-progress-bars">
          {stories.map((_, index) => (
            <div key={index} className="progress-bar-container">
              <div
                className={`progress-bar ${
                  index < currentStoryIndex ? "completed" : ""
                }`}
                style={{
                  width:
                    index === currentStoryIndex
                      ? `${progress}%`
                      : index < currentStoryIndex
                      ? "100%"
                      : "0%",
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="story-header">
          <div className="story-user-info">
            <img src={userImage} alt={currentStory.user.name} />
            <span>{currentStory.user.name}</span>
            <span className="story-time">
              {new Date(currentStory.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <div className="story-header-actions">
            {isOwner && (
              <button
                className="menu-btn"
                onClick={() => setShowMenu(!showMenu)}
              >
                <FaEllipsisH />
              </button>
            )}
            <button className="close-btn" onClick={handleClose}>
              <FaTimes />
            </button>
          </div>
        </div>

        {/* Story Content */}
        <div className="story-content">
          {currentStory.mediaType === "text" ? (
            <div
              className="story-text"
              style={{
                backgroundColor: currentStory.backgroundColor || "#000",
                color: currentStory.textColor || "#fff",
              }}
            >
              <p>{currentStory.text}</p>
            </div>
          ) : currentStory.mediaType === "video" ||
            /\.(mp4|webm|mov|m4v|ogg)$/i.test(
              currentStory.mediaUrls?.[0] || currentStory.mediaUrl || ""
            ) ? (
            <video
              src={currentStory.mediaUrls?.[0] || currentStory.mediaUrl}
              className="story-media"
              controls
              playsInline
            />
          ) : (
            <img
              src={currentStory.mediaUrls?.[0] || currentStory.mediaUrl}
              alt="Story"
              className="story-media"
            />
          )}

          {/* Poll Overlay */}
          {currentStory.poll && (
            <div className="story-poll-overlay">
              <h3>{currentStory.poll.question}</h3>
              {currentStory.poll.options.map((option, index) => {
                const percentage = currentStory.poll!.options.reduce(
                  (sum, opt) => sum + opt.voteCount,
                  0
                ) > 0
                  ? (option.voteCount /
                      currentStory.poll!.options.reduce(
                        (sum, opt) => sum + opt.voteCount,
                        0
                      )) *
                    100
                  : 0;
                const hasVoted = (option.votes || []).includes(currentUserId || "");

                return (
                  <button
                    key={index}
                    className={`poll-option ${hasVoted ? "voted" : ""}`}
                    onClick={() => !hasVoted && handlePollVote(index)}
                    disabled={hasVoted}
                  >
                    <span>{option.text}</span>
                    {hasVoted && (
                      <span className="poll-percentage">{percentage.toFixed(0)}%</span>
                    )}
                    {hasVoted && (
                      <div
                        className="poll-progress"
                        style={{ width: `${percentage}%` }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Question Box Overlay */}
          {currentStory.questionBox && !isOwner && (
            <div className="story-question-overlay">
              <p>{currentStory.questionBox.prompt}</p>

              {answerSent ? (
                <p
                  data-testid="story-answer-sent"
                  className="flex items-center justify-center gap-1.5 text-sm font-medium text-white"
                >
                  <Check size={16} aria-hidden />
                  {t("stories.answer_sent") || "Answer sent"}
                </p>
              ) : showAnswerBox ? (
                <div data-testid="story-answer-form" className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      data-testid="story-answer-input"
                      value={answerText}
                      onChange={(e) => setAnswerText(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") handleAnswerQuestion();
                      }}
                      placeholder={t("stories.answer_placeholder") || "Type your answer…"}
                      aria-label={t("stories.answer_question") || "Answer Question"}
                      autoFocus
                      className="min-w-0 flex-1 rounded-full bg-white/20 px-4 py-2 text-sm text-white outline-none placeholder:text-white/60"
                    />
                    <button
                      type="button"
                      data-testid="story-answer-submit"
                      onClick={handleAnswerQuestion}
                      aria-label={t("stories.send_reply") || "Send"}
                      className="rounded-full bg-white/20 p-2 text-white transition hover:bg-white/30"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2 text-xs text-white/90">
                      <input
                        type="checkbox"
                        data-testid="story-answer-anonymous"
                        checked={answerAnonymously}
                        onChange={(e) => setAnswerAnonymously(e.target.checked)}
                      />
                      {t("stories.answer_anonymously") || "Answer anonymously"}
                    </label>
                    <button
                      type="button"
                      data-testid="story-answer-cancel"
                      onClick={() => {
                        setShowAnswerBox(false);
                        setAnswerText("");
                      }}
                      className="text-xs text-white/70 underline"
                    >
                      {t("stories.cancel") || "Cancel"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  data-testid="story-question-answer"
                  onClick={() => setShowAnswerBox(true)}
                >
                  {t("stories.answer_question") || "Answer Question"}
                </button>
              )}
            </div>
          )}

          {/* Link Sticker */}
          {currentStory.link && (
            <div className="story-link-overlay">
              <button
                className="link-sticker"
                onClick={() => window.open(currentStory.link!.url, "_blank")}
              >
                <span>{currentStory.link.displayText}</span>
              </button>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="story-navigation">
          <button
            className="nav-btn prev"
            onClick={handlePrevStory}
            disabled={currentStoryIndex === 0}
          >
            <FaChevronLeft />
          </button>
          <button
            className="nav-btn next"
            onClick={handleNextStory}
            disabled={currentStoryIndex === stories.length - 1}
          >
            <FaChevronRight />
          </button>
        </div>

        {/* Bottom Actions */}
        <div className="story-actions">
          {isOwner ? (
            // Tools, not a reply box: there is nobody to DM on your own story.
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                data-testid="story-viewers-button"
                onClick={() => setOpenSheet("viewers")}
                className={PILL}
              >
                <Eye size={16} aria-hidden />
                {t("stories.viewers") || "Viewers"}
                <span className="opacity-80">{currentStory.viewCount || 0}</span>
              </button>

              {currentStory.questionBox && (
                <button
                  type="button"
                  data-testid="story-responses-button"
                  onClick={() => setOpenSheet("responses")}
                  className={PILL}
                >
                  <MessageCircleQuestion size={16} aria-hidden />
                  {t("stories.responses") || "Responses"}
                </button>
              )}

              <button
                type="button"
                data-testid="story-share-button"
                onClick={() => setOpenSheet("share")}
                className={PILL}
              >
                <Share2 size={16} aria-hidden />
                {t("stories.share_story") || "Share"}
              </button>
            </div>
          ) : showReplyInput ? (
            <div className="reply-input-container">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={t("stories.reply_placeholder") || "Send a message..."}
                onKeyPress={(e) => e.key === "Enter" && handleReply()}
                autoFocus
              />
              <button onClick={handleReply}>
                {t("stories.send_reply") || "Send"}
              </button>
              <button onClick={() => setShowReplyInput(false)}>
                <FaTimes />
              </button>
            </div>
          ) : (
            <>
              <input
                type="text"
                placeholder={t("stories.reply_placeholder") || "Send a message..."}
                onFocus={() => setShowReplyInput(true)}
                readOnly
              />
              <div className="action-buttons">
                <button
                  className={`reaction-btn ${userReaction ? "active" : ""}`}
                  data-testid="story-reaction-toggle"
                  onClick={() => setShowReactions(!showReactions)}
                  aria-label={t("stories.react") || "React"}
                >
                  <FaHeart />
                  {userReaction && <span className="reaction-emoji">{userReaction}</span>}
                </button>
                <button
                  onClick={() => setShowReplyInput(true)}
                  aria-label={t("stories.reply_placeholder") || "Send a message..."}
                >
                  <FaComment />
                </button>
                <button
                  data-testid="story-share-button"
                  onClick={() => setOpenSheet("share")}
                  aria-label={t("stories.share_story") || "Share"}
                >
                  <FaShare />
                </button>
              </div>
            </>
          )}

          {/* Reaction Picker */}
          {showReactions && (
            <div className="reaction-picker">
              {STORY_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  className={`reaction-option ${userReaction === emoji ? "active" : ""}`}
                  data-testid={`story-reaction-${emoji}`}
                  onClick={() => handleReaction(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Menu (Owner Only) */}
        {showMenu && isOwner && (
          <div className="story-menu">
            <button onClick={handleDeleteStory}>
              <FaTrash /> {t("stories.delete_story") || "Delete Story"}
            </button>
          </div>
        )}
      </div>

      {/* The sheets sit outside the story surface so that a click inside a
          dialog never reaches the hold-to-pause handlers on it. */}
      {openSheet === "viewers" && isOwner && (
        <StoryViewersSheet
          storyId={currentStory._id}
          onClose={() => setOpenSheet(null)}
        />
      )}
      {openSheet === "responses" && isOwner && (
        <QuestionResponsesSheet
          storyId={currentStory._id}
          onClose={() => setOpenSheet(null)}
        />
      )}
      {openSheet === "share" && (
        <StoryShareSheet
          storyId={currentStory._id}
          currentUserId={currentUserId}
          onClose={() => setOpenSheet(null)}
        />
      )}
    </>
  );
};

export default StoryViewer;
