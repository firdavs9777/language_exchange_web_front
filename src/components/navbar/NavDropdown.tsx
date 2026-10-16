import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

// One disclosure pattern for every menu in the navbar: a real <button> with
// aria-expanded / aria-haspopup / aria-controls, Enter and Space from the
// button itself, ArrowDown to open and land on the first entry, ArrowUp/Down
// to move between entries, Escape to close and hand focus back, a click
// anywhere outside to close, and a route change to close.
//
// The panel is always in the DOM and toggled with `hidden`, never mounted on
// open: a hidden panel is out of the accessibility tree and out of the tab
// order, and keeping it rendered lets a flag-gated entry be asserted on
// without first simulating the click that reveals it.

interface NavDropdownProps {
  id: string;
  /** Visible content of the trigger (icon, label, avatar…). */
  trigger: React.ReactNode;
  /** Accessible name when the trigger has no text of its own. */
  triggerLabel?: string;
  triggerClassName: string;
  panelClassName: string;
  wrapperClassName?: string;
  testId?: string;
  children: (close: () => void) => React.ReactNode;
}

const FOCUSABLE = "a[href], button:not([disabled])";

const NavDropdown = ({
  id,
  trigger,
  triggerLabel,
  triggerClassName,
  panelClassName,
  wrapperClassName,
  testId,
  children,
}: NavDropdownProps) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const focusFirstOnOpen = useRef(false);
  const location = useLocation();

  const close = useCallback(() => setOpen(false), []);

  // Route change closes the menu, whichever way the navigation happened.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const items = (): HTMLElement[] =>
    panelRef.current ? Array.prototype.slice.call(panelRef.current.querySelectorAll(FOCUSABLE)) : [];

  useEffect(() => {
    if (open && focusFirstOnOpen.current) {
      focusFirstOnOpen.current = false;
      const first = items()[0];
      if (first) first.focus();
    }
  }, [open]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape" && open) {
      e.stopPropagation();
      setOpen(false);
      if (buttonRef.current) buttonRef.current.focus();
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    if (!open) {
      if (e.target === buttonRef.current && e.key === "ArrowDown") {
        e.preventDefault();
        focusFirstOnOpen.current = true;
        setOpen(true);
      }
      return;
    }
    const list = items();
    if (!list.length) return;
    e.preventDefault();
    const at = list.indexOf(document.activeElement as HTMLElement);
    const step = e.key === "ArrowDown" ? 1 : -1;
    const next = at === -1 ? (step === 1 ? 0 : list.length - 1) : (at + step + list.length) % list.length;
    list[next].focus();
  };

  const panelId = `${id}-panel`;
  return (
    <div className={`nav-dropdown ${wrapperClassName || ""}`} ref={wrapperRef} onKeyDown={onKeyDown}>
      <button
        type="button"
        ref={buttonRef}
        className={`${triggerClassName}${open ? " open" : ""}`}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={triggerLabel}
        data-testid={testId}
        onClick={() => setOpen((o) => !o)}
      >
        {trigger}
      </button>
      <div id={panelId} ref={panelRef} className={`dropdown-panel ${panelClassName}`} hidden={!open}>
        {children(close)}
      </div>
    </div>
  );
};

export default NavDropdown;
