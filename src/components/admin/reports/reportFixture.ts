import { Report } from "../../../store/slices/adminSlice";

/**
 * A week report with the approved mockup's numbers (Oct 12 – 18 is a real
 * Monday–Sunday in 2026). Shared by the page test and the CSV test.
 */
export const REPORT_FIXTURE: Report = {
  period: "week",
  periodKey: "2026-W42",
  label: "Oct 12 – 18, 2026",
  start: "2026-10-11T15:00:00.000Z",
  end: "2026-10-18T15:00:00.000Z",
  complete: true,
  web: {
    visitors: 4812,
    pageViews: 19340,
    visits: 4835,
    pagesPerVisit: 4,
    avgVisitMs: 220000,
    series: [
      { x: "2026-10-12", visitors: 600, pageViews: 2400 },
      { x: "2026-10-13", visitors: 640, pageViews: 2600 },
      { x: "2026-10-14", visitors: 620, pageViews: 2500 },
      { x: "2026-10-15", visitors: 720, pageViews: 3000 },
      { x: "2026-10-16", visitors: 700, pageViews: 2840 },
      { x: "2026-10-17", visitors: 780, pageViews: 3100 },
      { x: "2026-10-18", visitors: 752, pageViews: 2900 },
    ],
    countries: [
      { code: "KR", count: 1640 },
      { code: "US", count: 850 },
      { code: "JP", count: 610 },
      { code: "UZ", count: 398 },
      { code: "CN", count: 270 },
    ],
    sources: [
      { type: "search", name: "google", count: 1980 },
      { type: "direct", name: "direct", count: 1300 },
      { type: "social", name: "instagram", count: 625 },
      { type: "campaign", name: "oct_promo", count: 433 },
      { type: "referral", name: "news.example", count: 480 },
    ],
    topPages: [
      { path: "/", views: 6120, avgMs: 48000 },
      { path: "/communities", views: 3410, avgMs: 135000 },
      { path: "/moments", views: 2980, avgMs: 182000 },
      { path: "/chat", views: 2140, avgMs: 390000 },
      { path: "/learn", views: 1090, avgMs: 100000 },
    ],
    devices: [
      { device: "mobile", count: 3272 },
      { device: "desktop", count: 1396 },
      { device: "tablet", count: 144 },
    ],
    languages: [
      { language: "ko", count: 1829 },
      { language: "en", count: 1492 },
      { language: "ja", count: 577 },
    ],
    funnel: { visited: 4812, signupStarted: 690, signedUp: 186, storeTaps: 340 },
    storeTaps: {
      total: 340,
      ios: 205,
      android: 131,
      byPlacement: [
        { placement: "hero", ios: 120, android: 70 },
        { placement: "download-page", ios: 50, android: 40 },
        { placement: "sticky-banner", ios: 25, android: 15 },
        { placement: "popup", ios: 10, android: 6 },
      ],
      bySource: [
        { type: "search", name: "google", ios: 90, android: 60 },
        { type: "campaign", name: "oct_promo", ios: 70, android: 41 },
        { type: "direct", name: "direct", ios: 45, android: 30 },
      ],
      series: [
        { x: "2026-10-12", ios: 25, android: 15 },
        { x: "2026-10-13", ios: 28, android: 18 },
        { x: "2026-10-14", ios: 30, android: 20 },
        { x: "2026-10-15", ios: 32, android: 19 },
        { x: "2026-10-16", ios: 30, android: 21 },
        { x: "2026-10-17", ios: 35, android: 20 },
        { x: "2026-10-18", ios: 25, android: 18 },
      ],
    },
    sections: [
      {
        section: "chat",
        members: 720,
        avgMs: 660000,
        topPages: [
          { path: "/chat", views: 2140 },
          { path: "/chat/:id", views: 1800 },
        ],
      },
      {
        section: "community",
        members: 640,
        avgMs: 240000,
        topPages: [
          { path: "/communities", views: 3410 },
          { path: "/community/:id", views: 900 },
        ],
      },
      { section: "moments", members: 510, avgMs: 300000, topPages: [{ path: "/moments", views: 2980 }] },
      { section: "study", members: 190, avgMs: 180000, topPages: [{ path: "/learn", views: 1090 }] },
      { section: "profile", members: 0, avgMs: 0, topPages: [] },
    ],
  },
  members: {
    signups: 412,
    signupsStarted: 57,
    webSignups: 186,
    active: 1204,
    totalUsers: 38211,
    completedUsers: 35002,
    retention: 0.4231,
    appPlatforms: [
      { key: "android", count: 21000 },
      { key: "ios", count: 15000 },
    ],
    breakdowns: {
      native: [{ key: "Korean", count: 150 }],
      learning: [{ key: "English", count: 170 }],
      country: [{ key: "South Korea", count: 140 }],
      platform: [{ key: "ios", count: 200 }],
      gender: [{ key: "female", count: 230 }],
    },
  },
  app: { messages: 52300, conversations: 3100, moments: 1120, stories: 640, calls: 820 },
  vip: { newVip: 14, activeByPlan: [{ plan: "monthly", count: 80 }], expiringSoon: 6 },
  previous: {
    visitors: 4296,
    pageViews: 17907,
    visits: 4300,
    webSignups: 154,
    signups: 380,
    active: 1241,
    storeTaps: 324,
    iosTaps: 190,
    androidTaps: 130,
  },
};
