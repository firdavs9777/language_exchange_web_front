import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ReasonDialog from "./ReasonDialog";

const noop = () => undefined;

it("renders nothing when closed", () => {
  const { container } = render(
    <ReasonDialog
      open={false}
      title="Archive club"
      confirmLabel="Archive"
      onConfirm={noop}
      onCancel={noop}
    />
  );
  expect(container).toBeEmptyDOMElement();
});

it("shows the title and confirm label when open", () => {
  render(
    <ReasonDialog
      open
      title="Archive club"
      confirmLabel="Archive"
      onConfirm={noop}
      onCancel={noop}
    />
  );
  expect(screen.getByRole("dialog")).toHaveTextContent("Archive club");
  expect(screen.getByTestId("reason-confirm")).toHaveTextContent("Archive");
});

it("disables confirm until a reason is entered", () => {
  render(
    <ReasonDialog
      open
      title="Archive club"
      confirmLabel="Archive"
      onConfirm={noop}
      onCancel={noop}
    />
  );
  expect(screen.getByTestId("reason-confirm")).toBeDisabled();
  fireEvent.change(screen.getByTestId("reason-input"), { target: { value: "  " } });
  expect(screen.getByTestId("reason-confirm")).toBeDisabled();
  fireEvent.change(screen.getByTestId("reason-input"), { target: { value: "spam" } });
  expect(screen.getByTestId("reason-confirm")).not.toBeDisabled();
});

it("calls onConfirm with the trimmed reason", () => {
  const onConfirm = jest.fn();
  render(
    <ReasonDialog
      open
      title="Archive club"
      confirmLabel="Archive"
      onConfirm={onConfirm}
      onCancel={noop}
    />
  );
  fireEvent.change(screen.getByTestId("reason-input"), { target: { value: "  spam  " } });
  fireEvent.click(screen.getByTestId("reason-confirm"));
  expect(onConfirm).toHaveBeenCalledWith("spam");
});

it("calls onCancel from the cancel button", () => {
  const onCancel = jest.fn();
  render(
    <ReasonDialog
      open
      title="Archive club"
      confirmLabel="Archive"
      onConfirm={noop}
      onCancel={onCancel}
    />
  );
  fireEvent.click(screen.getByTestId("reason-cancel"));
  expect(onCancel).toHaveBeenCalled();
});

it("resets the reason each time it is reopened", () => {
  const { rerender } = render(
    <ReasonDialog
      open
      title="Archive club"
      confirmLabel="Archive"
      onConfirm={noop}
      onCancel={noop}
    />
  );
  fireEvent.change(screen.getByTestId("reason-input"), { target: { value: "spam" } });
  rerender(
    <ReasonDialog
      open={false}
      title="Archive club"
      confirmLabel="Archive"
      onConfirm={noop}
      onCancel={noop}
    />
  );
  rerender(
    <ReasonDialog
      open
      title="Archive club"
      confirmLabel="Archive"
      onConfirm={noop}
      onCancel={noop}
    />
  );
  expect(screen.getByTestId("reason-input")).toHaveValue("");
});

it("disables the buttons while busy", () => {
  render(
    <ReasonDialog
      open
      title="Archive club"
      confirmLabel="Archive"
      onConfirm={noop}
      onCancel={noop}
      busy
    />
  );
  expect(screen.getByTestId("reason-cancel")).toBeDisabled();
  expect(screen.getByTestId("reason-confirm")).toBeDisabled();
});

it("shows an error message when given one", () => {
  render(
    <ReasonDialog
      open
      title="Archive club"
      confirmLabel="Archive"
      onConfirm={noop}
      onCancel={noop}
      error="Something went wrong."
    />
  );
  expect(screen.getByTestId("reason-error")).toHaveTextContent("Something went wrong.");
});
