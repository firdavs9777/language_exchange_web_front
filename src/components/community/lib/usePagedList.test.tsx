import { act, renderHook } from "@testing-library/react";
import { usePagedList, resetPagedListCache } from "./usePagedList";

/**
 * One paging hook for the community lists (audit 2026-10-30): four
 * hand-rolled pagers each had a different bug -- another filter's members
 * stapled onto this one, a whole-page error on a failed page N, and Back
 * losing every page past the first.
 */
type Row = { _id: string };
type Result = {
  currentData?: unknown;
  data?: unknown;
  isFetching: boolean;
  isError: boolean;
  error?: unknown;
  refetch: () => void;
};

const body = (ids: string[], extra: Record<string, unknown> = {}) => ({ data: ids.map((_id) => ({ _id })), ...extra });

/** Fake RTK hook: answers come from `answers[arg]`; unknown args are "fetching". */
function fakeQuery(answers: Record<string, Partial<Result>>, refetch = jest.fn()) {
  return (arg: string, opts: { skip?: boolean }): Result => {
    if (opts.skip) return { isFetching: false, isError: false, refetch };
    return { isFetching: false, isError: false, refetch, ...(answers[arg] ?? { isFetching: true }) };
  };
}

const setup = (key: string, answers: Record<string, Partial<Result>>, refetch = jest.fn()) =>
  renderHook(
    ({ k }: { k: string }) =>
      usePagedList<Row, string>({
        key: k,
        argFor: (page) => `${k}:${page}`,
        useQuery: fakeQuery(answers, refetch),
        items: (d: any) => d.data,
        hasMore: (d: any, page) => (typeof d.hasMore === "boolean" ? d.hasMore : page < (d.pages ?? 1)),
      }),
    { initialProps: { k: key } }
  );

beforeEach(() => resetPagedListCache());

it("a new key starts at page 1 and never mixes in another key's rows", () => {
  const answers: Record<string, Partial<Result>> = {
    "A:1": { currentData: body(["a1"], { pages: 2 }) },
    "A:2": { currentData: body(["a2"], { pages: 2 }) },
    // RTK keeps the last result in `data` across args; only currentData is safe.
    "B:1": { currentData: body(["b1"], { pages: 1 }), data: body(["b1"]) },
  };
  const { result, rerender } = setup("A", answers);
  act(() => result.current.loadMore());
  expect(result.current.items.map((r) => r._id)).toEqual(["a1", "a2"]);
  rerender({ k: "B" });
  expect(result.current.items.map((r) => r._id)).toEqual(["b1"]);
  answers["A:1"] = { currentData: undefined, data: body(["b1"]), isFetching: true };
  rerender({ k: "A" });
  expect(result.current.items.map((r) => r._id)).not.toContain("b1");
});

it("the server's hasMore wins over the page count", () => {
  const { result } = setup("H", { "H:1": { currentData: body(["h1"], { hasMore: false, pages: 5 }) } });
  expect(result.current.hasMore).toBe(false);
});

it("a failed page N keeps the earlier rows and retries that page", () => {
  const refetch = jest.fn();
  const { result } = setup("E", {
    "E:1": { currentData: body(["e1"], { pages: 3 }) },
    "E:2": { isError: true, error: "boom" },
  }, refetch);
  act(() => result.current.loadMore());
  expect(result.current.items.map((r) => r._id)).toEqual(["e1"]);
  expect(result.current.pageError).toBe("boom");
  expect(result.current.firstPageError).toBeUndefined();
  act(() => result.current.retry());
  expect(refetch).toHaveBeenCalled();
});

it("a remount with the same key restores every loaded page at once", () => {
  const answers = {
    "R:1": { currentData: body(["r1"], { pages: 3 }) },
    "R:2": { currentData: body(["r2"], { pages: 3 }) },
  };
  const first = setup("R", answers);
  act(() => first.result.current.loadMore());
  first.unmount();
  const again = setup("R", { "R:2": { isFetching: true } });
  expect(again.result.current.items.map((r) => r._id)).toEqual(["r1", "r2"]);
});
