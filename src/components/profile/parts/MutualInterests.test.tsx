import "@testing-library/jest-dom";
import React from "react";
import { render, screen } from "@testing-library/react";
import MutualInterests, { sharedTopics } from "./MutualInterests";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: () => "", i18n: { language: "en" } }),
}));

it("keeps only the topics both people picked", () => {
  expect(
    sharedTopics({ topics: ["music", "travel", "food"] }, { topics: ["Travel", "hiking", "music"] })
  ).toEqual(["Travel", "music"]);
});

it("reads the object shape a populated topic list uses", () => {
  expect(sharedTopics({ topics: [{ id: "music" }] }, { topics: [{ name: "Music" }] })).toEqual([
    "Music",
  ]);
});

it("renders a chip per shared topic with the count", () => {
  render(
    <MutualInterests
      viewer={{ topics: ["music", "travel"] }}
      user={{ topics: ["travel", "music", "cooking"] }}
    />
  );
  expect(screen.getByTestId("mutual-interests")).toHaveTextContent("2 in common");
  expect(screen.getAllByTestId("mutual-interest-chip")).toHaveLength(2);
});

it("renders nothing when nothing is shared", () => {
  const { container } = render(
    <MutualInterests viewer={{ topics: ["music"] }} user={{ topics: ["hiking"] }} />
  );
  expect(container).toBeEmptyDOMElement();
});

it("renders nothing when either side has no topics at all", () => {
  const { container } = render(<MutualInterests viewer={{ topics: [] }} user={{ topics: ["music"] }} />);
  expect(container).toBeEmptyDOMElement();
});

it("renders nothing to a signed-out visitor", () => {
  const { container } = render(<MutualInterests user={{ topics: ["music"] }} />);
  expect(container).toBeEmptyDOMElement();
});
