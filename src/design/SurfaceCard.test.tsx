import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import SurfaceCard from "./SurfaceCard";

it("renders its children", () => {
  render(<SurfaceCard>hello</SurfaceCard>);
  expect(screen.getByTestId("surface-card")).toHaveTextContent("hello");
});

it("carries the app's card radius and elevation", () => {
  render(<SurfaceCard>x</SurfaceCard>);
  const el = screen.getByTestId("surface-card");
  expect(el.className).toContain("rounded-card");
  expect(el.className).toContain("shadow-card");
  expect(el.className).toContain("bg-surface");
});

// A shadow on a dark surface reads as grime; the app drops it outright.
it("drops the shadow in dark mode", () => {
  render(<SurfaceCard>x</SurfaceCard>);
  expect(screen.getByTestId("surface-card").className).toContain("dark:shadow-none");
});

it("applies the requested padding", () => {
  const { rerender } = render(<SurfaceCard padding="sm">x</SurfaceCard>);
  expect(screen.getByTestId("surface-card").className).toContain("p-2.5");

  rerender(<SurfaceCard padding="lg">x</SurfaceCard>);
  expect(screen.getByTestId("surface-card").className).toContain("p-5");
});

it("adds hover and press affordances only when interactive", () => {
  const { rerender } = render(<SurfaceCard>x</SurfaceCard>);
  expect(screen.getByTestId("surface-card").className).not.toContain("cursor-pointer");

  rerender(<SurfaceCard interactive>x</SurfaceCard>);
  const el = screen.getByTestId("surface-card");
  expect(el.className).toContain("cursor-pointer");
  expect(el.className).toContain("hover:shadow-raised");
});

it("calls onClick when clicked", () => {
  const onClick = jest.fn();
  render(
    <SurfaceCard interactive onClick={onClick}>
      x
    </SurfaceCard>
  );
  fireEvent.click(screen.getByTestId("surface-card"));
  expect(onClick).toHaveBeenCalledTimes(1);
});

it("merges an extra className", () => {
  render(<SurfaceCard className="mb-2">x</SurfaceCard>);
  expect(screen.getByTestId("surface-card").className).toContain("mb-2");
});
