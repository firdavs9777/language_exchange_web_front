import {
  ANNOUNCEMENT_LOCALES, emptyForm, fromAnnouncement, toInput, validateForm,
  toLocalInput, fromLocalInput, targetingSummary, AnnouncementForm,
} from "./announcementForm";

const filled = (over: Partial<AnnouncementForm> = {}): AnnouncementForm => ({
  ...emptyForm(),
  translations: { en: { title: "Hello", body: "World", buttonLabel: "" } },
  ...over,
});

it("covers the 19 backend template locales", () => {
  expect(ANNOUNCEMENT_LOCALES).toHaveLength(19);
  expect(ANNOUNCEMENT_LOCALES).toContain("zh_TW");
});

it("an empty form needs title and body in the default language", () => {
  const errors = validateForm(emptyForm());
  expect(errors["translations.en.title"]).toBeTruthy();
  expect(errors["translations.en.body"]).toBeTruthy();
  expect(validateForm(filled())).toEqual({});
});

it("limits mirror the backend: title 100, body 1000, button label 40", () => {
  const long = (n: number) => "x".repeat(n);
  expect(validateForm(filled({ translations: { en: { title: long(101), body: "b", buttonLabel: "" } } }))["translations.en.title"]).toMatch(/100/);
  expect(validateForm(filled({ translations: { en: { title: "t", body: long(1001), buttonLabel: "" } } }))["translations.en.body"]).toMatch(/1000/);
  expect(validateForm(filled({ translations: { en: { title: "t", body: "b", buttonLabel: long(41) } }, buttonUrl: "bananatalk://x" }))["translations.en.buttonLabel"]).toMatch(/40/);
});

it("a second language with any text needs both title and body", () => {
  const errors = validateForm(filled({
    translations: { en: { title: "t", body: "b", buttonLabel: "" }, ko: { title: "제목", body: "", buttonLabel: "" } },
  }));
  expect(errors["translations.ko.body"]).toBeTruthy();
});

it("button link: https or bananatalk:// only; a label needs a link", () => {
  // eslint-disable-next-line no-script-url
  expect(validateForm(filled({ buttonUrl: "javascript:alert(1)" })).buttonUrl).toBeTruthy();
  ["https://banatalk.com", "bananatalk://moment/1"].forEach((url) =>
    expect(validateForm(filled({ buttonUrl: url })).buttonUrl).toBeUndefined());
  ["/study", "//evil.com", "https://", "ftp://x.com"].forEach((url) =>
    expect(validateForm(filled({ buttonUrl: url })).buttonUrl).toBeTruthy());
  expect(validateForm(filled({ translations: { en: { title: "t", body: "b", buttonLabel: "Open" } } })).buttonUrl).toBeTruthy();
});

it("end after start; at least one channel; at least one platform; whole-number priority", () => {
  expect(validateForm(filled({ startsAt: "2030-01-02T10:00", endsAt: "2030-01-02T09:00" })).endsAt).toBeTruthy();
  expect(validateForm(filled({ showInApp: false, notify: false })).channels).toBeTruthy();
  expect(validateForm(filled({ platforms: [] })).platforms).toBeTruthy();
  expect(validateForm(filled({ priority: "1.5" })).priority).toBeTruthy();
});

it("scheduling needs a future start", () => {
  const now = new Date("2030-01-01T00:00:00");
  expect(validateForm(filled(), { schedule: true, now }).startsAt).toBeTruthy();
  expect(validateForm(filled({ startsAt: "2029-12-31T10:00" }), { schedule: true, now }).startsAt).toBeTruthy();
  expect(validateForm(filled({ startsAt: "2030-01-02T10:00" }), { schedule: true, now }).startsAt).toBeUndefined();
});

it("toInput drops empty extra languages, trims, 'all' wins, dates to ISO", () => {
  const input = toInput(filled({
    translations: {
      en: { title: " Hello ", body: "World", buttonLabel: "" },
      ko: { title: "", body: "", buttonLabel: "" },
    },
    platforms: ["all", "ios"],
    startsAt: "2030-01-02T10:00",
    priority: "4",
  }));
  expect(Object.keys(input.translations || {})).toEqual(["en"]);
  expect(input.translations!.en.title).toBe("Hello");
  expect(input.platforms).toEqual(["all"]);
  expect(input.startsAt).toBe(new Date("2030-01-02T10:00").toISOString());
  expect(input.priority).toBe(4);
  expect(input.buttonUrl).toBeNull();
});

it("toInput for a live announcement sends only text, end time and priority", () => {
  expect(Object.keys(toInput(filled(), true)).sort()).toEqual(["endsAt", "priority", "translations"]);
});

it("local datetime round-trips", () => {
  const iso = new Date("2030-05-06T07:08:00").toISOString();
  expect(fromLocalInput(toLocalInput(iso))).toBe(iso);
  expect(toLocalInput(null)).toBe("");
  expect(fromLocalInput("")).toBeNull();
});

it("fromAnnouncement fills the form from a row", () => {
  const form = fromAnnouncement({
    id: "a1", _id: "a1", status: "draft", priority: 2, defaultLocale: "ko",
    translations: { ko: { title: "제목", body: "본문" } },
    emoji: null, imageUrl: null, buttonUrl: null, platforms: ["ios"], languages: ["ko"],
    startsAt: null, endsAt: null, showInApp: true, notify: true, publishedAt: null, endedAt: null,
    delivery: { state: "none", targeted: 0, pushed: 0, listed: 0, failed: 0, startedAt: null, finishedAt: null },
    createdAt: "", updatedAt: "",
  });
  expect(form.translations.ko).toEqual({ title: "제목", body: "본문", buttonLabel: "" });
  expect(form.priority).toBe("2");
  expect(form.notify).toBe(true);
});

it("targeting summary", () => {
  expect(targetingSummary({ platforms: ["all"], languages: [] })).toBe("All platforms · all languages");
  expect(targetingSummary({ platforms: ["ios", "android"], languages: ["ko", "ja"] })).toBe("iOS + Android · ko, ja");
});

it("publishing now: an end time that is already past is caught before the request", () => {
  const now = new Date("2030-01-01T00:00:00");
  // No start time: the effective start is now, so an end at/before now can never be live.
  expect(validateForm(filled({ endsAt: "2029-12-31T10:00" }), { publish: true, now }).endsAt).toBeTruthy();
  expect(validateForm(filled({ endsAt: "2030-01-01T00:00" }), { publish: true, now }).endsAt).toBeTruthy();
  expect(validateForm(filled({ endsAt: "2030-01-02T10:00" }), { publish: true, now }).endsAt).toBeUndefined();
  expect(validateForm(filled(), { publish: true, now }).endsAt).toBeUndefined();
  // Not publishing: a past end on a plain draft save is the server's call.
  expect(validateForm(filled({ endsAt: "2029-12-31T10:00" }), { now }).endsAt).toBeUndefined();
});

it("emoji length is checked on the trimmed value", () => {
  expect(validateForm(filled({ emoji: "  " + "a".repeat(16) + "  " })).emoji).toBeUndefined();
  expect(validateForm(filled({ emoji: "a".repeat(17) })).emoji).toBeTruthy();
});
