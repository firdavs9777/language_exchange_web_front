import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ProfileAbout from "./ProfileAbout";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: () => "", i18n: { language: "en" } }),
}));

const LONG_BIO = "a".repeat(300);

it("renders the bio in full when it is short", () => {
  render(<ProfileAbout user={{ bio: "Hi, I teach Korean." }} />);
  expect(screen.getByTestId("about-bio")).toHaveTextContent("Hi, I teach Korean.");
  expect(screen.queryByTestId("about-bio-toggle")).not.toBeInTheDocument();
});

it("collapses a bio past 240 characters behind a Read more control", () => {
  render(<ProfileAbout user={{ bio: LONG_BIO }} />);
  const bio = screen.getByTestId("about-bio");
  expect(bio.textContent && bio.textContent.length).toBeLessThan(300);
  expect(screen.getByTestId("about-bio-toggle")).toBeInTheDocument();
});

it("expands and collapses the bio again on the toggle", () => {
  render(<ProfileAbout user={{ bio: LONG_BIO }} />);
  fireEvent.click(screen.getByTestId("about-bio-toggle"));
  expect(screen.getByTestId("about-bio")).toHaveTextContent(LONG_BIO);
  fireEvent.click(screen.getByTestId("about-bio-toggle"));
  expect(screen.getByTestId("about-bio").textContent).not.toEqual(LONG_BIO);
});

it("shows occupation and school when present", () => {
  render(<ProfileAbout user={{ occupation: "Barista", school: "Yonsei" }} />);
  expect(screen.getByTestId("about-occupation")).toHaveTextContent("Barista");
  expect(screen.getByTestId("about-school")).toHaveTextContent("Yonsei");
});

it("renders one chip per topic and drops the blank ones", () => {
  render(<ProfileAbout user={{ topics: ["Music", "  ", "Travel"] }} />);
  expect(screen.getAllByTestId("about-topic")).toHaveLength(2);
  expect(screen.getByText("Music")).toBeInTheDocument();
});

it("shows MBTI and blood type as small facts", () => {
  render(<ProfileAbout user={{ mbti: "INFJ", bloodType: "O" }} />);
  expect(screen.getByTestId("about-mbti")).toHaveTextContent("INFJ");
  expect(screen.getByTestId("about-blood")).toHaveTextContent("O");
});

it("omits the rows the profile has no value for", () => {
  render(<ProfileAbout user={{ occupation: "Barista" }} />);
  expect(screen.getByTestId("about-occupation")).toBeInTheDocument();
  expect(screen.queryByTestId("about-school")).not.toBeInTheDocument();
  expect(screen.queryByTestId("about-bio")).not.toBeInTheDocument();
  expect(screen.queryByTestId("about-mbti")).not.toBeInTheDocument();
});

it("renders nothing at all when every field is empty", () => {
  const { container } = render(
    <ProfileAbout
      user={{ bio: "   ", occupation: "", school: null, topics: [], mbti: "", bloodType: "" }}
    />
  );
  expect(container).toBeEmptyDOMElement();
});

it("renders nothing without a user", () => {
  const { container } = render(<ProfileAbout />);
  expect(container).toBeEmptyDOMElement();
});
