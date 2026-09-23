import "@testing-library/jest-dom";
import React from "react";
import { render, screen } from "@testing-library/react";
import ProfileLearning from "./ProfileLearning";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: () => "", i18n: { language: "en" } }),
}));

it("shows streak, XP and level from learningStats", () => {
  render(
    <ProfileLearning
      user={{ learningStats: { currentStreak: 12, totalXP: 3400, level: 7 } }}
    />
  );
  expect(screen.getByTestId("profile-learning")).toBeInTheDocument();
  expect(screen.getByTestId("learning-streak")).toHaveTextContent("12");
  expect(screen.getByTestId("learning-xp")).toHaveTextContent("3,400");
  expect(screen.getByTestId("learning-level")).toHaveTextContent("7");
});

it("falls back to the top-level streak and XP fields", () => {
  render(<ProfileLearning user={{ streakDays: 4, totalXp: 120 }} />);
  expect(screen.getByTestId("learning-streak")).toHaveTextContent("4");
  expect(screen.getByTestId("learning-xp")).toHaveTextContent("120");
  expect(screen.queryByTestId("learning-level")).not.toBeInTheDocument();
});

it("omits a tile whose metric is absent rather than showing a zero", () => {
  render(<ProfileLearning user={{ learningStats: { totalXP: 900 } }} />);
  expect(screen.getByTestId("learning-xp")).toBeInTheDocument();
  expect(screen.queryByTestId("learning-streak")).not.toBeInTheDocument();
  expect(screen.queryByTestId("learning-level")).not.toBeInTheDocument();
});

it("renders nothing when learningStats is absent", () => {
  const { container } = render(<ProfileLearning user={{ name: "Mina" }} />);
  expect(container).toBeEmptyDOMElement();
});

it("renders nothing for a brand new account carrying only schema defaults", () => {
  const { container } = render(
    <ProfileLearning
      user={{ learningStats: { currentStreak: 0, totalXP: 0, level: 1 } }}
    />
  );
  expect(container).toBeEmptyDOMElement();
});

it("renders nothing without a user", () => {
  const { container } = render(<ProfileLearning />);
  expect(container).toBeEmptyDOMElement();
});
