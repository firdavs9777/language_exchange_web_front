import React, { useEffect, useRef, useState } from "react";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body?: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  /** Ask for a moderation reason; confirm stays disabled until one is typed. */
  requireReason?: boolean;
  /**
   * Ask the moderator to retype this exact string (the user's email for a hard
   * delete). Case-sensitive on purpose: an irreversible action should cost a
   * deliberate keystroke, not a muscle-memory click.
   */
  requireTypedValue?: string;
  /** Red confirm button for destructive actions. */
  danger?: boolean;
  /** The reason is passed through trimmed; `""` when none was asked for. */
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  /** Mutation in flight: confirm is disabled so nothing is sent twice. */
  busy?: boolean;
  /**
   * The failure from the mutation, shown inside the dialog. The dialog stays
   * open on an error and nothing is retried automatically — a moderation call
   * that silently repeats is worse than one that visibly failed.
   */
  error?: React.ReactNode;
  reasonLabel?: string;
  typedLabel?: React.ReactNode;
}

/**
 * The one way the console asks "are you sure?".
 *
 * Every moderation action routes through this so the reason requirement the
 * backend enforces (`POST /users/:id/ban` 400s without one) is enforced in the
 * UI too, before the request is ever built.
 */
const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = "Cancel",
  requireReason = false,
  requireTypedValue,
  danger = false,
  onConfirm,
  onCancel,
  busy = false,
  error,
  reasonLabel = "Reason",
  typedLabel,
}) => {
  const [reason, setReason] = useState("");
  const [typed, setTyped] = useState("");
  const firstFieldRef = useRef<HTMLTextAreaElement | HTMLButtonElement | null>(null);

  // A reopened dialog starts empty: the previous action's reason must never be
  // carried into the next one.
  useEffect(() => {
    if (open) {
      setReason("");
      setTyped("");
    }
  }, [open]);

  // Escape closes. Bound in an effect, never read during render.
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  useEffect(() => {
    if (open && firstFieldRef.current) firstFieldRef.current.focus();
  }, [open]);

  if (!open) return null;

  const reasonOk = !requireReason || reason.trim().length > 0;
  const typedOk = !requireTypedValue || typed === requireTypedValue;
  const canConfirm = reasonOk && typedOk && !busy;

  const fieldClass = [
    "mt-1 w-full rounded-card border border-line bg-surface px-3 py-2 text-sm",
    "text-ink-900 placeholder:text-ink-400",
    "dark:border-line-dark dark:bg-cardbg-dark dark:text-ink-50",
  ].join(" ");

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        data-testid="confirm-dialog-backdrop"
        onClick={onCancel}
        className="absolute inset-0 bg-ink-900/50"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-testid="confirm-dialog"
        className={[
          "relative w-full max-w-md rounded-card border border-line bg-surface p-5 shadow-lg",
          "dark:border-line-dark dark:bg-cardbg-dark",
        ].join(" ")}
      >
        <h2 className="font-display text-base text-ink-900 dark:text-ink-50">{title}</h2>
        {body ? (
          <div className="pt-2 text-sm text-ink-600 dark:text-ink-300">{body}</div>
        ) : null}

        {requireReason ? (
          <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-ink-500 dark:text-ink-400">
            {reasonLabel}
            <textarea
              data-testid="confirm-dialog-reason"
              ref={(node) => {
                firstFieldRef.current = node;
              }}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className={fieldClass}
            />
          </label>
        ) : null}

        {requireTypedValue ? (
          <label className="mt-4 block text-xs font-medium uppercase tracking-wide text-ink-500 dark:text-ink-400">
            {typedLabel || `Type ${requireTypedValue} to confirm`}
            <input
              data-testid="confirm-dialog-typed"
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              className={fieldClass}
            />
          </label>
        ) : null}

        {error ? (
          <div
            data-testid="confirm-dialog-error"
            role="alert"
            className="mt-4 rounded-card border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300"
          >
            {error}
          </div>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            data-testid="confirm-dialog-cancel"
            onClick={onCancel}
            className="rounded-chip border border-line px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-ink-100 dark:border-line-dark dark:text-ink-200 dark:hover:bg-ink-800"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            data-testid="confirm-dialog-confirm"
            ref={(node) => {
              if (!requireReason) firstFieldRef.current = node;
            }}
            onClick={() => {
              if (!canConfirm) return;
              onConfirm(reason.trim());
            }}
            disabled={!canConfirm}
            aria-busy={busy}
            className={[
              "rounded-chip px-3 py-1.5 text-sm font-semibold text-white",
              "disabled:cursor-not-allowed disabled:opacity-50",
              danger ? "bg-red-600 hover:bg-red-700" : "bg-brand-deep hover:bg-brand-dark",
            ].join(" ")}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
