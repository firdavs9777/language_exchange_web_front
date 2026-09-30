import React from "react";
import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import MemberCard, { CommunityMemberCard } from "./MemberCard";

const baseUser: CommunityMemberCard = {
  _id: "user-1",
  name: "Alice",
  bio: "Love hiking and coffee",
  native_language: "English",
  language_to_learn: "Korean",
  imageUrls: ["https://example.com/alice.jpg"],
  birth_year: "1996",
  gender: "female",
  createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
  isVIP: true,
  languageLevel: "B2",
  location: { city: "Seoul", country: "South Korea" },
  lastActive: new Date().toISOString(),
  hasActiveStory: false,
  isOnline: true,
  followersCount: 12,
};

describe("MemberCard", () => {
  it("renders VIP badge, CEFR level, name, and online dot for a fixture user", () => {
    render(<MemberCard user={baseUser} onWave={jest.fn()} onOpen={jest.fn()} />);

    expect(screen.getByTestId("member-card-name")).toHaveTextContent("Alice");
    expect(screen.getByText("B2")).toBeInTheDocument();
    expect(screen.getByTestId("member-card-vip-badge")).toBeInTheDocument();
    expect(screen.getByTestId("member-card-online-dot")).toBeInTheDocument();
  });

  it("renders a story ring when hasActiveStory is true", () => {
    render(
      <MemberCard
        user={{ ...baseUser, hasActiveStory: true }}
        onWave={jest.fn()}
        onOpen={jest.fn()}
      />
    );

    expect(screen.getByTestId("member-card-story-ring")).toBeInTheDocument();
  });

  it("does not render a story ring when hasActiveStory is false", () => {
    render(
      <MemberCard
        user={{ ...baseUser, hasActiveStory: false }}
        onWave={jest.fn()}
        onOpen={jest.fn()}
      />
    );

    expect(screen.queryByTestId("member-card-story-ring")).not.toBeInTheDocument();
  });

  it("does not render an online dot when isOnline is false", () => {
    render(
      <MemberCard
        user={{ ...baseUser, isOnline: false }}
        onWave={jest.fn()}
        onOpen={jest.fn()}
      />
    );

    expect(screen.queryByTestId("member-card-online-dot")).not.toBeInTheDocument();
  });

  it("calls onWave (and not onOpen) when the wave button is clicked", () => {
    const onWave = jest.fn();
    const onOpen = jest.fn();
    render(<MemberCard user={baseUser} onWave={onWave} onOpen={onOpen} />);

    fireEvent.click(screen.getByTestId("member-card-wave"));

    expect(onWave).toHaveBeenCalledWith(baseUser);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it("calls onOpen when the card body is clicked", () => {
    const onOpen = jest.fn();
    render(<MemberCard user={baseUser} onWave={jest.fn()} onOpen={onOpen} />);

    fireEvent.click(screen.getByTestId("member-card-root"));

    expect(onOpen).toHaveBeenCalledWith(baseUser);
  });

  it("shows NEW badge for a recently created user", () => {
    render(<MemberCard user={baseUser} onWave={jest.fn()} onOpen={jest.fn()} />);
    // baseUser.createdAt is 30 days ago -> no NEW badge
    expect(screen.queryByTestId("member-card-new-badge")).not.toBeInTheDocument();
  });

  it("shows NEW badge when createdAt is within 7 days", () => {
    render(
      <MemberCard
        user={{ ...baseUser, createdAt: new Date().toISOString() }}
        onWave={jest.fn()}
        onOpen={jest.fn()}
      />
    );
    expect(screen.getByTestId("member-card-new-badge")).toBeInTheDocument();
  });

  it("shows NEW badge when isNew flag is true regardless of createdAt", () => {
    render(
      <MemberCard
        user={{ ...baseUser, isNew: true }}
        onWave={jest.fn()}
        onOpen={jest.fn()}
      />
    );
    expect(screen.getByTestId("member-card-new-badge")).toBeInTheDocument();
  });

  it("degrades gracefully when optional fields are absent", () => {
    const minimalUser: CommunityMemberCard = {
      _id: "user-2",
      name: "Bob",
      bio: "",
      native_language: "French",
      language_to_learn: "Spanish",
      imageUrls: [],
    };

    render(<MemberCard user={minimalUser} onWave={jest.fn()} onOpen={jest.fn()} />);

    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.queryByTestId("member-card-vip-badge")).not.toBeInTheDocument();
    expect(screen.queryByTestId("member-card-online-dot")).not.toBeInTheDocument();
    expect(screen.queryByTestId("member-card-story-ring")).not.toBeInTheDocument();
    expect(screen.queryByTestId("member-card-new-badge")).not.toBeInTheDocument();
    expect(screen.queryByTestId("member-card-location")).not.toBeInTheDocument();
    expect(screen.queryByTestId("member-card-level-badge")).not.toBeInTheDocument();
  });

  it("renders location when present", () => {
    render(<MemberCard user={baseUser} onWave={jest.fn()} onOpen={jest.fn()} />);
    expect(screen.getByTestId("member-card-location")).toHaveTextContent("Seoul");
    expect(screen.getByTestId("member-card-location")).toHaveTextContent("South Korea");
  });

  // The card is the row's primary control. Before this it was a bare
  // <div onClick>, so the member list and the suggestion strip on a profile
  // were reachable by pointer only.
  it("is reachable and operable from the keyboard", () => {
    const onOpen = jest.fn();
    render(<MemberCard user={baseUser} onWave={jest.fn()} onOpen={onOpen} />);

    const card = screen.getByTestId("member-card-root");
    expect(card).toHaveAttribute("role", "button");
    expect(card).toHaveAttribute("tabindex", "0");

    fireEvent.keyDown(card, { key: "Enter" });
    expect(onOpen).toHaveBeenCalledWith(baseUser);

    fireEvent.keyDown(card, { key: " " });
    expect(onOpen).toHaveBeenCalledTimes(2);
  });

  it("ignores other keys, and keys pressed on the wave button inside it", () => {
    const onOpen = jest.fn();
    render(<MemberCard user={baseUser} onWave={jest.fn()} onOpen={onOpen} />);

    fireEvent.keyDown(screen.getByTestId("member-card-root"), { key: "a" });
    // A key pressed on the nested button bubbles to the card; opening the
    // profile from it would be the wrong answer to "wave at Alice".
    fireEvent.keyDown(screen.getByTestId("member-card-wave"), { key: "Enter" });

    expect(onOpen).not.toHaveBeenCalled();
  });

  it("renders the age from birth_year", () => {
    render(<MemberCard user={baseUser} onWave={jest.fn()} onOpen={jest.fn()} />);
    const currentYear = new Date().getFullYear();
    const expectedAge = currentYear - 1996;
    expect(screen.getByTestId("member-card-name")).toHaveTextContent(`, ${expectedAge}`);
  });

  it("stacks the card: photo above the details, not beside them", () => {
    const { container } = render(
      <MemberCard user={baseUser} onWave={jest.fn()} onOpen={jest.fn()} />
    );
    const root = screen.getByTestId("member-card-root");
    expect(root.className).toContain("flex-col");
    expect(root.className).not.toContain("items-center");
    expect(container.querySelector("[data-testid='member-card-photo']")).toBeInTheDocument();
  });

  it("gives the photo a reserved 16:10 box so the grid does not reflow", () => {
    render(<MemberCard user={baseUser} onWave={jest.fn()} onOpen={jest.fn()} />);
    const img = screen.getByAltText("Alice") as HTMLImageElement;
    expect(img).toHaveAttribute("width", "320");
    expect(img).toHaveAttribute("height", "200");
    expect(img).toHaveAttribute("loading", "lazy");
    expect(img).toHaveAttribute("decoding", "async");
  });

  it("fills the photo box with an initial when the member has no picture", () => {
    render(
      <MemberCard user={{ ...baseUser, imageUrls: [] }} onWave={jest.fn()} onOpen={jest.fn()} />
    );
    const placeholder = screen.getByTestId("member-card-photo-placeholder");
    expect(placeholder).toHaveTextContent("A");
    expect(placeholder.className).toContain("w-full");
    expect(placeholder.className).toContain("h-full");
  });

  it("keeps the story ring on the photo corner, not across the middle", () => {
    render(
      <MemberCard
        user={{ ...baseUser, hasActiveStory: true }}
        onWave={jest.fn()}
        onOpen={jest.fn()}
      />
    );
    const ring = screen.getByTestId("member-card-story-ring");
    expect(ring.className).toContain("absolute");
  });

  it("does not let a long name widen its column", () => {
    render(
      <MemberCard
        user={{ ...baseUser, name: "안녕하세요반갑습니다저는한국어를배우고있어요" }}
        onWave={jest.fn()}
        onOpen={jest.fn()}
      />
    );
    expect(screen.getByTestId("member-card-name").className).toContain("truncate");
  });

  it("gives the wave button the full width of the card foot", () => {
    render(<MemberCard user={baseUser} onWave={jest.fn()} onOpen={jest.fn()} />);
    const wave = screen.getByTestId("member-card-wave");
    expect(wave.className).toContain("w-full");
  });
});
