import React, { useEffect, useRef } from "react";

export interface DialogShellProps {
  /** Accessible name for the dialog. */
  label: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Testid for the panel. Defaults keep a caller's existing ids available. */
  testId?: string;
  backdropTestId?: string;
  panelClassName?: string;
  containerClassName?: string;
  /** Focused on open; without one the panel takes focus. */
  initialFocusRef?: { current: HTMLElement | null };
}

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

const DEFAULT_PANEL = [
  "relative w-full max-w-md rounded-card border border-line bg-surface p-5 shadow-lg",
  "dark:border-line-dark dark:bg-cardbg-dark",
].join(" ");

const DEFAULT_CONTAINER =
  "fixed inset-0 z-[70] flex items-center justify-center p-4";

/**
 * The shell every modal in the console shares: backdrop, Escape, initial
 * focus, and a Tab loop that cannot wander out to the page behind.
 *
 * Rendered only while the dialog is open — there is no `open` prop, so mount
 * and unmount are the whole lifecycle and the Escape listener cannot outlive
 * a closed dialog. Extracted from `ConfirmDialog`, which still renders exactly
 * the same markup through it (its testids are passed in, not defaulted).
 */
const DialogShell: React.FC<DialogShellProps> = ({
  label,
  onClose,
  children,
  testId = "dialog-shell",
  backdropTestId = "dialog-shell-backdrop",
  panelClassName = DEFAULT_PANEL,
  containerClassName = DEFAULT_CONTAINER,
  initialFocusRef,
}) => {
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Escape closes. Bound in an effect, never read during render.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // The keyboard follows the eye: focus lands inside the dialog on open.
  useEffect(() => {
    const nominated = initialFocusRef && initialFocusRef.current;
    if (nominated) nominated.focus();
    else if (panelRef.current) panelRef.current.focus();
    // Once, on open: a later re-render must not steal focus back from
    // whatever the moderator has tabbed to.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Tab stays inside. Without this the next Tab out of the last field lands on
   * the page behind the backdrop, where a click does nothing and the moderator
   * cannot see what is focused.
   */
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== "Tab" || !panelRef.current) return;
    const items = Array.prototype.slice
      .call(panelRef.current.querySelectorAll(FOCUSABLE))
      .filter(
        (node: any) =>
          !node.hasAttribute("hidden") && node.getAttribute("aria-hidden") !== "true"
      );
    if (items.length === 0) return;

    const first = items[0] as HTMLElement;
    const last = items[items.length - 1] as HTMLElement;
    const active = document.activeElement;

    if (event.shiftKey && (active === first || active === panelRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className={containerClassName}>
      <div
        data-testid={backdropTestId}
        onClick={onClose}
        className="absolute inset-0 bg-ink-900/50"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        data-testid={testId}
        onKeyDown={onKeyDown}
        className={`${panelClassName} outline-none`}
      >
        {children}
      </div>
    </div>
  );
};

export default DialogShell;
