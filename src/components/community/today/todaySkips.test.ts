import { loadSkips, addSkip } from "./todaySkips";

beforeEach(() => window.sessionStorage.clear());

describe("todaySkips", () => {
  it("remembers skips for the batch's date", () => {
    expect(loadSkips("2026-10-08")).toEqual([]);
    addSkip("2026-10-08", "u1");
    expect(addSkip("2026-10-08", "u2")).toEqual(["u1", "u2"]);
    expect(loadSkips("2026-10-08")).toEqual(["u1", "u2"]);
  });
  it("does not repeat an id", () => {
    addSkip("2026-10-08", "u1");
    expect(addSkip("2026-10-08", "u1")).toEqual(["u1"]);
  });
  it("a new date starts clean", () => {
    addSkip("2026-10-08", "u1");
    expect(loadSkips("2026-10-09")).toEqual([]);
  });
  it("storage that throws: no crash, the skip still counts for this call", () => {
    const get = jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    const set = jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    expect(loadSkips("2026-10-08")).toEqual([]);
    expect(addSkip("2026-10-08", "u1")).toEqual(["u1"]);
    get.mockRestore();
    set.mockRestore();
  });
  it("ignores a corrupt stored value", () => {
    window.sessionStorage.setItem("bt.todaySkips.2026-10-08", "{not json");
    expect(loadSkips("2026-10-08")).toEqual([]);
  });
});
