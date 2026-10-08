import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import DialogShell from "../../../design/DialogShell";
import notify from "../../../design/notify";
import { useReportUserMutation } from "../../../store/slices/usersSlice";

/** The Report model's reasons, in the order the dialog lists them. */
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

const ENGLISH: Record<string, string> = {
  spam: "Spam",
  harassment: "Harassment",
  hate_speech: "Hate speech",
  violence: "Violence",
  nudity: "Nudity",
  false_information: "False information",
  copyright: "Copyright",
  other: "Something else",
};

const MAX_DESCRIPTION = 500;

interface Props {
  momentId: string;
  authorId: string;
  onClose: () => void;
}

const isAlreadyReported = (error: any) => {
  const message = (error && error.data && (error.data.error || error.data.message)) || "";
  return error && error.status === 400 && /already reported/i.test(String(message));
};

/**
 * Reports a moment through the canonical POST /reports, so it reaches the
 * moderators' desk with the same handling as every other report.
 */
const ReportMomentDialog: React.FC<Props> = ({ momentId, authorId, onClose }) => {
  const { t } = useTranslation();
  const tr = (key: string, fallback: string) => t(key) || fallback;
  const [reportUser, { isLoading }] = useReportUserMutation();
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [already, setAlready] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!reason || isLoading) return;
    try {
      await reportUser({
        type: "moment",
        reportId: momentId,
        reportedUser: authorId,
        reason,
        description: description.trim(),
      }).unwrap();
      notify.success(tr("moments_section.report.sent", "Thanks — our moderators will review it."));
      onClose();
    } catch (error) {
      if (isAlreadyReported(error)) {
        setAlready(true);
        return;
      }
      notify.error(tr("moments_section.report.failed", "Couldn't send the report. Try again."));
    }
  };

  return (
    <DialogShell labelledBy="report-moment-title" onClose={onClose} dismissible={!isLoading}>
      <form onSubmit={submit}>
        <h2 id="report-moment-title" className="text-lg font-semibold text-ink-900 dark:text-ink-50">
          {tr("moments_section.report.title", "Report this moment")}
        </h2>
        {already ? (
          <p role="status" className="mt-3 text-sm text-ink-600 dark:text-ink-300">
            {tr("moments_section.report.already", "You've already reported this moment.")}
          </p>
        ) : (
          <>
            <fieldset className="mt-3">
              <legend className="mb-2 text-sm text-ink-600 dark:text-ink-300">
                {tr("moments_section.report.reasonLabel", "Why are you reporting it?")}
              </legend>
              <div className="space-y-1.5">
                {REPORT_REASONS.map((value) => (
                  <label key={value} className="flex items-center gap-2 text-sm text-ink-800 dark:text-ink-100">
                    <input
                      type="radio"
                      name="report-reason"
                      value={value}
                      checked={reason === value}
                      onChange={() => setReason(value)}
                    />
                    <span>{tr(`moments_section.report.reasons.${value}`, ENGLISH[value])}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="mt-3 block text-sm text-ink-600 dark:text-ink-300">
              <span>{tr("moments_section.report.descriptionLabel", "Anything else? (optional)")}</span>
              <textarea
                value={description}
                maxLength={MAX_DESCRIPTION}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-chip border border-line bg-surface px-3 py-2 text-sm dark:border-line-dark dark:bg-cardbg-dark"
              />
            </label>
          </>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-full px-4 py-2 text-sm text-ink-600 hover:bg-ink-50 dark:text-ink-300"
          >
            {tr("moments_section.report.cancel", "Cancel")}
          </button>
          {!already && (
            <button
              type="submit"
              disabled={!reason || isLoading}
              className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {tr("moments_section.report.submit", "Send report")}
            </button>
          )}
        </div>
      </form>
    </DialogShell>
  );
};

export default ReportMomentDialog;
