import "@testing-library/jest-dom";
import { render, screen } from "@testing-library/react";
import Avatar from "./Avatar";

it("renders the image when a src is given", () => {
  render(<Avatar src="https://example.test/a.jpg" name="Yeonwoo" />);
  expect(screen.getByTestId("avatar-image")).toHaveAttribute(
    "src",
    "https://example.test/a.jpg"
  );
  expect(screen.queryByTestId("avatar-initials")).not.toBeInTheDocument();
});

// The behaviour two of the three current implementations forgot.
it("falls back to an initial when there is no photo", () => {
  render(<Avatar name="yeonwoo" />);
  expect(screen.getByTestId("avatar-initials")).toHaveTextContent("Y");
  expect(screen.queryByTestId("avatar-image")).not.toBeInTheDocument();
});

it("renders a placeholder initial for a nameless user", () => {
  render(<Avatar name="" />);
  expect(screen.getByTestId("avatar-initials")).toHaveTextContent("?");
});

it("renders a placeholder initial for a whitespace-only name", () => {
  render(<Avatar name="   " />);
  expect(screen.getByTestId("avatar-initials")).toHaveTextContent("?");
});

it("shows the story ring only when hasStory is true", () => {
  const { rerender } = render(<Avatar name="Yeonwoo" />);
  expect(screen.queryByTestId("avatar-story-ring")).not.toBeInTheDocument();

  rerender(<Avatar name="Yeonwoo" hasStory />);
  expect(screen.getByTestId("avatar-story-ring")).toBeInTheDocument();
  expect(screen.getByTestId("avatar-initials")).toBeInTheDocument();
});

it("shows the online dot only when isOnline is true", () => {
  const { rerender } = render(<Avatar name="Yeonwoo" />);
  expect(screen.queryByTestId("avatar-online-dot")).not.toBeInTheDocument();

  rerender(<Avatar name="Yeonwoo" isOnline />);
  expect(screen.getByTestId("avatar-online-dot")).toBeInTheDocument();
});

it("shows the flag only when one is given", () => {
  const { rerender } = render(<Avatar name="Yeonwoo" />);
  expect(screen.queryByTestId("avatar-flag")).not.toBeInTheDocument();

  rerender(<Avatar name="Yeonwoo" flag="🇰🇷" />);
  expect(screen.getByTestId("avatar-flag")).toHaveTextContent("🇰🇷");
});

it("applies the requested size", () => {
  render(<Avatar name="Yeonwoo" size={72} />);
  expect(screen.getByTestId("avatar")).toHaveStyle({ width: "72px", height: "72px" });
});
