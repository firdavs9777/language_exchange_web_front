import { renderHook } from "@testing-library/react";
import { useTargetLanguage } from "./useTargetLanguage";

let mockLanguage = "en";

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string) => k,
    i18n: { language: mockLanguage, changeLanguage: jest.fn() },
  }),
}));

describe("useTargetLanguage", () => {
  afterEach(() => {
    mockLanguage = "en";
  });

  it("returns 'en' for the English UI language", () => {
    mockLanguage = "en";
    const { result } = renderHook(() => useTargetLanguage());
    expect(result.current).toBe("en");
  });

  it("returns 'ko' for the Korean UI language (i18n resource key for kor.json)", () => {
    mockLanguage = "ko";
    const { result } = renderHook(() => useTargetLanguage());
    expect(result.current).toBe("ko");
  });

  it("returns 'zh-TW' for the underscore-spelled zh_TW resource key", () => {
    mockLanguage = "zh_TW";
    const { result } = renderHook(() => useTargetLanguage());
    expect(result.current).toBe("zh-TW");
  });

  it("returns 'zh-TW' for the hyphen spelling too, instead of collapsing to bare 'zh'", () => {
    mockLanguage = "zh-TW";
    const { result } = renderHook(() => useTargetLanguage());
    expect(result.current).toBe("zh-TW");
  });

  it("returns bare 'zh' for Simplified Chinese", () => {
    mockLanguage = "zh";
    const { result } = renderHook(() => useTargetLanguage());
    expect(result.current).toBe("zh");
  });

  it("falls back to 'en' for an unmappable/empty language", () => {
    mockLanguage = "";
    const { result } = renderHook(() => useTargetLanguage());
    expect(result.current).toBe("en");
  });
});
