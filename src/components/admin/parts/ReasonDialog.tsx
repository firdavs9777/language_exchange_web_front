import React from "react";

export interface ReasonDialogProps {
  open: boolean;
  title: string;
  confirmLabel: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  busy?: boolean;
  error?: string;
}

/**
 * A reason prompt for a moderation action (archive/restore/cancel/ban/…).
 *
 * Deliberately minimal and standalone: `ConfirmDialog` (the users page's
 * generic yes/no dialog) is being written elsewhere at the same time this was
 * written, so this owns its own reason field rather than share a component
 * mid-edit. Confirm stays disabled until the reason is non-empty, and the
 * field resets every time the dialog reopens so a stale reason from a
 * previous row can never be resubmitted by mistake.
 */
const ReasonDialog: React.FC<ReasonDialogProps> = ({
  open,
  title,
  confirmLabel,
  onConfirm,
  onCancel,
  busy = false,
  error,
}) => {
  const [reason, setReason] = React.useState("");

  React.useEffect(() => {
    if (open) setReason("");
  }, [open]);

  if (!open) return null;

  const trimmed = reason.trim();

  return (
    <div
      data-testid="reason-dialog"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 px-4"
    >
      <div className="w-full max-w-sm rounded-card bg-surface p-5 shadow-raised dark:bg-cardbg-dark">
        <h2 className="font-display text-base text-ink-900 dark:text-ink-50">{title}</h2>
        <textarea
          data-testid="reason-input"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={busy}
          rows={3}
          className="mt-3 w-full rounded-chip border border-line bg-transparent px-3 py-2 text-sm text-ink-800 focus:outline-none focus:ring-2 focus:ring-brand-deep dark:border-line-dark dark:text-ink-100"
        />
        {error ? (
          <p data-testid="reason-error" className="mt-2 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : null}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            data-testid="reason-cancel"
            onClick={onCancel}
            disabled={busy}
            className="rounded-chip border border-line px-3 py-1.5 text-sm font-medium text-ink-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-line-dark dark:text-ink-200"
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="reason-confirm"
            onClick={() => onConfirm(trimmed)}
            disabled={busy || trimmed.length === 0}
            className="rounded-chip bg-brand-deep px-3 py-1.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReasonDialog;
