import "@testing-library/jest-dom";
import { render, screen, act } from "@testing-library/react";
import Reveal from "./Reveal";
import { useCountUp } from "./useCountUp";

const setReducedMotion = (reduce: boolean) => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: reduce && query.includes("reduce"),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
};

beforeEach(() => setReducedMotion(false));

// The rule that matters most: content is in the DOM whether or not anything animated.
it("renders children immediately, with no observer present", () => {
  render(<Reveal><p>visible content</p></Reveal>);
  expect(screen.getByText("visible content")).toBeInTheDocument();
});

it("does not hide children behind an intersection that may never fire", () => {
  render(<Reveal><p>still here</p></Reveal>);
  expect(screen.getByTestId("reveal")).toContainElement(screen.getByText("still here"));
});

it("drops the transition entirely under reduced motion", () => {
  setReducedMotion(true);
  render(<Reveal><p>x</p></Reveal>);
  expect(screen.getByTestId("reveal").className).not.toContain("duration-");
});

function CountProbe({ to }: { to: number }) {
  const n = useCountUp(to, { durationMs: 100, start: true });
  return <span data-testid="count">{n}</span>;
}

it("counts up to the target and stops there", () => {
  jest.useFakeTimers();
  render(<CountProbe to={137} />);
  act(() => { jest.advanceTimersByTime(200); });
  expect(screen.getByTestId("count")).toHaveTextContent("137");
  jest.useRealTimers();
});

it("returns the target immediately under reduced motion", () => {
  setReducedMotion(true);
  render(<CountProbe to={137} />);
  expect(screen.getByTestId("count")).toHaveTextContent("137");
});
