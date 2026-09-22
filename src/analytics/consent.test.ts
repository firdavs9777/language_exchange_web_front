import { readConsent, writeConsent } from "./consent";

beforeEach(() => window.localStorage.clear());

it("is undecided by default and round-trips a decision", () => {
  expect(readConsent()).toBeNull();
  writeConsent("granted");
  expect(readConsent()).toBe("granted");
  writeConsent("denied");
  expect(readConsent()).toBe("denied");
});

it("treats junk and throwing storage as undecided", () => {
  window.localStorage.setItem("bt.consent", "maybe");
  expect(readConsent()).toBeNull();
  const spy = jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
  expect(readConsent()).toBeNull();
  spy.mockRestore();
});
