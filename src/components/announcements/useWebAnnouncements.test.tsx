import { renderHook, act } from "@testing-library/react";
import { useWebAnnouncements } from "./useWebAnnouncements";
import { _resetDismissalsForTests } from "./dismissals";

const mockQuery = jest.fn();
jest.mock("../../store/slices/appConfigSlice", () => ({ useGetAppConfigQuery: (...a: any[]) => mockQuery(...a) }));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ i18n: { language: "ko" } }) }));

const a = (id: string, displayStyle: string, priority = 0) =>
  ({ id, title: id, body: "b", emoji: "🎉", imageUrl: null, buttonLabel: null, buttonUrl: null, priority, displayStyle });

beforeEach(() => { window.localStorage.clear(); _resetDismissalsForTests(); mockQuery.mockReset(); });

test("asks app-config for platform=web in the site language", () => {
  mockQuery.mockReturnValue({ data: { announcements: [] } });
  renderHook(() => useWebAnnouncements());
  expect(mockQuery).toHaveBeenCalledWith({ platform: "web", lang: "ko" });
});

test("first popup and first banner (server order = priority); unknown style is a popup", () => {
  mockQuery.mockReturnValue({ data: { announcements: [a("b1", "banner", 9), a("p1", "weird", 8), a("p2", "popup", 1), a("b2", "banner", 0)] } });
  const { result } = renderHook(() => useWebAnnouncements());
  expect(result.current.popup!.id).toBe("p1");
  expect(result.current.banner!.id).toBe("b1");
});

test("dismissed ones are skipped and dismiss moves to the next", () => {
  mockQuery.mockReturnValue({ data: { announcements: [a("b1", "banner"), a("b2", "banner")] } });
  const { result } = renderHook(() => useWebAnnouncements());
  act(() => result.current.dismiss("b1"));
  expect(result.current.banner!.id).toBe("b2");
});

test("no data or error → nothing", () => {
  mockQuery.mockReturnValue({ data: undefined, isError: true });
  const { result } = renderHook(() => useWebAnnouncements());
  expect(result.current.popup).toBeNull();
  expect(result.current.banner).toBeNull();
});
