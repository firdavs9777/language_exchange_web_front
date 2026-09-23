import "@testing-library/jest-dom";
import React from "react";
import { render, screen } from "@testing-library/react";
import ProfileLanguages from "./ProfileLanguages";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: () => "", i18n: { language: "en" } }),
}));

it("renders the exchange pill for a native and a learning language", () => {
  render(
    <ProfileLanguages
      user={{ native_language: "Korean", language_to_learn: "English" }}
    />
  );
  expect(screen.getByTestId("profile-languages")).toBeInTheDocument();
  expect(screen.getByTestId("language-pill")).toBeInTheDocument();
  expect(screen.getByTestId("language-pill-native")).toHaveTextContent("KO");
  expect(screen.getByTestId("language-pill-learning")).toHaveTextContent("EN");
});

it("names both languages in full beside the pill", () => {
  render(
    <ProfileLanguages
      user={{ native_language: "Korean", language_to_learn: "English" }}
    />
  );
  expect(screen.getByTestId("language-native")).toHaveTextContent("Korean");
  expect(screen.getByTestId("language-learning")).toHaveTextContent("English");
});

it("shows the CEFR level and its dots when the profile has one", () => {
  render(
    <ProfileLanguages
      user={{
        native_language: "Korean",
        language_to_learn: "English",
        languageLevel: "B2",
      }}
    />
  );
  expect(screen.getByTestId("language-level")).toHaveTextContent("B2");
  expect(screen.getAllByTestId("language-pill-dot")).toHaveLength(3);
});

it("renders no level and no dots when the level is unknown", () => {
  render(
    <ProfileLanguages
      user={{ native_language: "Korean", language_to_learn: "English" }}
    />
  );
  expect(screen.queryByTestId("language-level")).not.toBeInTheDocument();
  expect(screen.queryAllByTestId("language-pill-dot")).toHaveLength(0);
});

it("renders the pill from the native side alone", () => {
  render(<ProfileLanguages user={{ native_language: "Korean" }} />);
  expect(screen.getByTestId("profile-languages")).toBeInTheDocument();
  expect(screen.queryByTestId("language-learning")).not.toBeInTheDocument();
});

it("lists extra learning languages as strings", () => {
  render(
    <ProfileLanguages
      user={{
        native_language: "Korean",
        language_to_learn: "English",
        learningLanguages: ["Japanese", "Spanish"],
      }}
    />
  );
  const extras = screen.getAllByTestId("language-extra");
  expect(extras).toHaveLength(2);
  expect(extras[0]).toHaveTextContent("Japanese");
  expect(extras[1]).toHaveTextContent("Spanish");
});

it("lists extra learning languages given as objects, with their level", () => {
  render(
    <ProfileLanguages
      user={{
        native_language: "Korean",
        language_to_learn: "English",
        learningLanguages: [{ language: "Japanese", level: "A2" }],
      }}
    />
  );
  expect(screen.getByTestId("language-extra")).toHaveTextContent("Japanese");
  expect(screen.getByTestId("language-extra")).toHaveTextContent("A2");
});

it("does not repeat the primary learning language among the extras", () => {
  render(
    <ProfileLanguages
      user={{
        native_language: "Korean",
        language_to_learn: "English",
        learningLanguages: ["english", "Japanese"],
      }}
    />
  );
  expect(screen.getAllByTestId("language-extra")).toHaveLength(1);
  expect(screen.getByTestId("language-extra")).toHaveTextContent("Japanese");
});

it("renders nothing when the profile has no languages", () => {
  const { container } = render(<ProfileLanguages user={{}} />);
  expect(container).toBeEmptyDOMElement();
});

it("renders nothing without a user", () => {
  const { container } = render(<ProfileLanguages />);
  expect(container).toBeEmptyDOMElement();
});
