// The two behaviours every overlay in this app owes a keyboard user, in one
// place: Tab stays inside the dialog, and the page behind it does not scroll.
//
// Both were written twice — once in the profile lightbox
// (parts/ProfilePhotos.tsx) and not at all in ConfirmDialog, which is now the
// primitive behind Block, Report, photo deletion and moment deletion. Two
// overlays on the same page behaving differently under Tab is the bug this
// module exists to prevent. DialogShell — the shell every admin modal renders
// through, ConfirmDialog included — calls straight into this too, so there is
// exactly one Tab loop in the codebase.
import React, { useEffect } from "react";

/**
 * What a keyboard can reach inside a dialog, in DOM order. A disabled control
 * is skipped, and so is anything explicitly taken out of the tab order —
 * `querySelectorAll` returns document order, which is the tab order here
 * because nothing in these dialogs sets a positive tabindex.
 */
export const FOCUSABLE = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled])",
  "textarea:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

/**
 * Tab and Shift+Tab wrap inside `container` instead of walking out into the
 * page behind it. Bind it as the dialog's `onKeyDown`.
 *
 * `hidden` and `aria-hidden` nodes are dropped: a collapsed field still
 * matches the selector, and wrapping onto something the moderator cannot see
 * looks exactly like focus having escaped.
 */
export function trapTab(container: HTMLElement | null, event: React.KeyboardEvent): void {
  if (event.key !== "Tab" || !container) return;
  const nodes = Array.prototype.slice
    .call(container.querySelectorAll(FOCUSABLE))
    .filter(
      (node: Element) =>
        !node.hasAttribute("hidden") && node.getAttribute("aria-hidden") !== "true"
    );
  if (nodes.length === 0) return;
  const first = nodes[0] as HTMLElement;
  const last = nodes[nodes.length - 1] as HTMLElement;
  const active = document.activeElement;
  // The container itself counts as "before the first stop": a dialog opened
  // with no field to nominate focuses its own panel (tabIndex -1), and
  // Shift+Tab from there must land on the last control, not on the page.
  if (
    event.shiftKey &&
    (active === first || active === container || !container.contains(active))
  ) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}

/**
 * The page behind the overlay must not scroll under a wheel or trackpad
 * gesture. Touched in an effect, restored to whatever it was on close — never
 * hardcoded back to `""`, because a second overlay may still want it hidden.
 */
export function useBodyScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [active]);
}
