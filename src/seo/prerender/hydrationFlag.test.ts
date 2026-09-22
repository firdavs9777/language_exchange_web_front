import { markPrerendered, isPrerendered, clearPrerendered } from "./hydrationFlag";

afterEach(() => clearPrerendered());

it("is false until the page is known to be prerendered", () => {
  expect(isPrerendered()).toBe(false);
});

it("reports a prerendered page, then stops once hydration has committed", () => {
  markPrerendered();
  expect(isPrerendered()).toBe(true);
  clearPrerendered();
  expect(isPrerendered()).toBe(false);
});
