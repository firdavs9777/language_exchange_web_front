import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import DialogShell from "./DialogShell";

it("renders a labelled modal dialog with a backdrop", () => {
  render(
    <DialogShell label="Add user" onClose={jest.fn()}>
      <p>body</p>
    </DialogShell>
  );
  const dialog = screen.getByRole("dialog");
  expect(dialog).toHaveAttribute("aria-modal", "true");
  expect(dialog).toHaveAttribute("aria-label", "Add user");
  expect(dialog).toHaveTextContent("body");
  expect(screen.getByTestId("dialog-shell-backdrop")).toBeInTheDocument();
});

it("closes on a backdrop click", () => {
  const onClose = jest.fn();
  render(
    <DialogShell label="Add user" onClose={onClose}>
      <p>body</p>
    </DialogShell>
  );
  fireEvent.click(screen.getByTestId("dialog-shell-backdrop"));
  expect(onClose).toHaveBeenCalled();
});

it("closes on Escape", () => {
  const onClose = jest.fn();
  render(
    <DialogShell label="Add user" onClose={onClose}>
      <p>body</p>
    </DialogShell>
  );
  fireEvent.keyDown(document, { key: "Escape" });
  expect(onClose).toHaveBeenCalledTimes(1);
});

it("stops listening for Escape once it unmounts", () => {
  const onClose = jest.fn();
  const { unmount } = render(
    <DialogShell label="Add user" onClose={onClose}>
      <p>body</p>
    </DialogShell>
  );
  unmount();
  fireEvent.keyDown(document, { key: "Escape" });
  expect(onClose).not.toHaveBeenCalled();
});

it("takes the testids the caller asks for, so an existing dialog keeps its own", () => {
  render(
    <DialogShell
      label="Confirm"
      onClose={jest.fn()}
      testId="confirm-dialog"
      backdropTestId="confirm-dialog-backdrop"
    >
      <p>body</p>
    </DialogShell>
  );
  expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();
  expect(screen.getByTestId("confirm-dialog-backdrop")).toBeInTheDocument();
});

it("focuses the element the caller nominates, not the panel", () => {
  const Harness: React.FC = () => {
    const ref = React.useRef<HTMLInputElement | null>(null);
    return (
      <DialogShell label="Add user" onClose={jest.fn()} initialFocusRef={ref}>
        <input data-testid="first" ref={ref} />
      </DialogShell>
    );
  };
  render(<Harness />);
  expect(document.activeElement).toBe(screen.getByTestId("first"));
});

it("focuses the panel itself when no element was nominated", () => {
  render(
    <DialogShell label="Add user" onClose={jest.fn()}>
      <p>body</p>
    </DialogShell>
  );
  expect(document.activeElement).toBe(screen.getByRole("dialog"));
});

it("keeps Tab inside the dialog", () => {
  render(
    <DialogShell label="Add user" onClose={jest.fn()}>
      <button data-testid="a">a</button>
      <button data-testid="b">b</button>
    </DialogShell>
  );
  const a = screen.getByTestId("a");
  const b = screen.getByTestId("b");

  b.focus();
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Tab" });
  expect(document.activeElement).toBe(a);

  a.focus();
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Tab", shiftKey: true });
  expect(document.activeElement).toBe(b);
});
