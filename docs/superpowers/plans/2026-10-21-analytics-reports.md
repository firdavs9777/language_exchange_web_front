# Website Analytics & Admin Reports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One reliable website analytics pipeline (countries, not IPs) feeding a Day/Week/Month Reports page in the admin console and exactly-once daily/weekly/monthly report emails to every admin.

**Architecture:**
- The website sends page views, time-on-page and a few named events to the existing `POST /api/v1/analytics/events`.
- At ingestion the backend resolves the country offline, derives an anonymous monthly `visitorId`, attaches `userId` for signed-in members, and drops bots and admins.
- A single `buildReport(period, date)` function computes every number. The page, the CSV and the emails all read it, and completed periods are frozen in a snapshot.
- A 5-minute job sends each report exactly once, using a unique `ReportRun` key.

**Tech Stack:**
- Backend: Express, Mongoose, node:test + mongodb-memory-server + supertest; new deps `geoip-lite`, `isbot`.
- Website: React 18, RTK Query, Jest/RTL, the existing admin parts (`LineChart`, `StatCard`, `DataTable`).

**Spec:** `docs/superpowers/specs/2026-10-21-analytics-reports-design.md` (website repo). Read it before any task.

## Global Constraints

- Timezone for every bucket and period edge: `Asia/Seoul` via `lib/reportingTimezone.js` (`REPORTING_TIMEZONE`, `dayKey`, `dayKeyExpr`).
- Periods:
  - day = one KST calendar day;
  - week = Monday 00:00 to Sunday 24:00 KST;
  - month = calendar month in KST.
- `periodKey` format: day `2026-10-20`, week `2026-W43` (ISO week of its Monday), month `2026-10`.
- Send time: 09:00 KST. Daily for the previous day, weekly on Monday for the previous week, monthly on the 1st for the previous month. Catch-up up to 3 days late, then skip and log.
- Backend flag `ANALYTICS_REPORTS_ENABLED` (default false). When off, the report endpoints return 404, `analyticsReportJob` doesn't run, and the old `scheduleAdminReport`/`scheduleWebVisitReport` run as today. Ingestion changes ship unflagged.
- Raw IP is never written by analytics code. `visitorId = sha256(monthSalt + ':' + ip + ':' + userAgent)`; `monthSalt` is random per KST month and stored in Mongo.
- Retention: `WebEvent`, `UserActivityDay` and `ReportSnapshot` 400 days; `ReportRun` 400 days.
- Recipients: `User.find({ role: 'admin', email: { $exists: true, $ne: '' } })` filtered by `adminReportPrefs.<daily|weekly|monthly> !== false`. Email via the existing `utils/sendEmail.js`.
- Emails are English only. Website admin strings go under `admin.reports.*` in all 18 locale files (`src/utils/locales/*.json`; the `localeParity` test enforces this).
- Backend repo rules: work in a worktree (`git worktree add /Users/davis/Desktop/Personal/.wt/be-analytics-reports -b feat/analytics-reports main`, symlink `node_modules` from `be-integration`). Update `docs/REMAINING_WORK.md` in every commit. Merge `main` into the branch at the end and **ask the owner before merging to `main`** (merging auto-deploys). Tests: `npm test` on Node 24.
- Website repo: branch `feat/analytics-reports` off `main`, one commit per task, no-ff `Merge:` into `main` at the end. Checks: `CI=true npx react-scripts test --watchAll=false`, `GENERATE_SOURCEMAP=false npx react-scripts build`, `npm run test:budget`.
- No `Co-Authored-By` trailers in commits (owner's rule).

## Review Focus

1. **The first week after launch.** No previous period and no `UserActivityDay` history yet. Every comparison and the retention figure must show "—" (`null` in JSON), never `0%`, `Infinity` or `NaN`.
2. **An event exactly on a period edge** (23:59:59.999 and 00:00:00.000 KST, and a week that starts on the 31st). It must land in exactly one period, and day/week/month totals must agree with each other.
3. **A server restart or crash during a send, or two processes running.** Each admin gets each report once (a duplicate is tolerated only for a recipient left `sending` by a crash). A report missed during downtime is caught up within 3 days.
4. **Hostile or odd event input.** Huge strings, unknown names, negative or absurd `durationMs`, a forged `Authorization`, bot user agents, admins browsing. All must be rejected, clamped or dropped without a 500.
5. **An admin with no email, or an empty recipient list.** The job must still mark the run done, not retry forever.

---

## Backend tasks (worktree `/Users/davis/Desktop/Personal/.wt/be-analytics-reports`)

### Task B1: Ingestion: one event pipeline with countries, visitor ids and members

**Files:**
- Modify: `models/WebEvent.js`, `controllers/webEvents.js`, `routes/analytics.js` (add `optionalAuth` before `recordEvent` on `/events`), `package.json` (add `geoip-lite`, `isbot`)
- Create: `models/AnalyticsSalt.js`, `lib/analyticsIdentity.js`, `lib/trafficSource.js`
- Test: `test/webEvents.test.js` (extend), `test/trafficSource.test.js`

**Interfaces:**
- Produces:
  - `WebEvent` fields (in addition to the existing ones):
    - `name` enum `['page_view','page_leave','store_tap','signup_start']`
    - `landing: Boolean`, `utm: { source, medium, campaign, content, term }` (strings, max 128)
    - `durationMs: Number` (0..1_800_000), `country: String` (ISO-2 or null), `visitorId: String`
    - `userId: ObjectId|null`, `browser: String`
    - `source: { type: 'search'|'social'|'direct'|'referral'|'campaign', name: String }`
  - `ipHash` stays.
  - New indexes: `{ name:1, createdAt:1 }`, `{ userId:1, createdAt:1 }` sparse, `{ visitorId:1, createdAt:1 }`.
  - `lib/analyticsIdentity.js`:
    - `countryFor(ip: string): string|null` (geoip-lite)
    - `visitorIdFor(ip: string, userAgent: string, date: Date): Promise<string>` (salt per KST month from `AnalyticsSalt { monthKey: unique, salt }`, created on first use with `findOneAndUpdate(..., { upsert: true, setOnInsert })`)
  - `lib/trafficSource.js`: `classifySource({ landing, referrer, utm, ownHost }): { type, name } | null`. It returns null for non-landing events. Precedence: utm.campaign/source → `campaign`, then known search hosts → `search`, known social hosts → `social`, own host or empty → `direct`, anything else → `referral` with the host as name.

- [ ] **Step 1: Write failing tests** in `test/webEvents.test.js`:
  - `drops bot user agents with 204 and stores nothing`: UA `Googlebot/2.1` → 204, `WebEvent.countDocuments() === 0`.
  - `never stores a raw IP`: post with `X-Forwarded-For: 203.0.113.9` (app has trust proxy) → `JSON.stringify(doc)` does not contain `203.0.113.9`.
  - `sets country from the IP`: stub `geoip-lite.lookup` → `{ country: 'KR' }` → `doc.country === 'KR'`.
  - `visitorId is stable within a KST month and changes across months`: same IP+UA twice → equal; call `visitorIdFor` with dates `2026-10-31T15:30:00Z` (Nov 1 KST) vs `2026-10-31T14:00:00Z` → different.
  - `attaches userId only with a valid token`: valid JWT → `doc.userId` equals the user's id; garbage token → `null` and still 204.
  - `drops events from admins`: token of a `role:'admin'` user → 204, count 0.
  - `page_leave clamps durationMs`: `-5` → 400; `99999999` → stored `1800000`.
  - `stores landing referrer, utm and classified source only on landing`: `landing:true, referrer:'https://www.google.com/'` → `source {type:'search', name:'google'}`; `landing:false` with a referrer → `referrer === null`, `source === null`.
  - `rejects unknown names and oversize fields without 500`: name `cta_tap` → 400; `utm.campaign` of 5,000 chars → stored length 128.
  - In `test/trafficSource.test.js`: a table of `{input → expected}` for google/naver/bing/daum/yandex (search), instagram/facebook/t.co/youtube/kakao/tiktok/reddit (social), `banatalk.com` (direct), utm wins over referrer (campaign, name = `utm.campaign || utm.source`), unknown host (referral, name = host without `www.`).
- [ ] **Step 2: Run** `node --test test/webEvents.test.js test/trafficSource.test.js`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement** the schema, `lib/analyticsIdentity.js`, `lib/trafficSource.js` and the controller changes:
  - `isbot(ua)` → `res.status(204).end()`.
  - `req.user?.role === 'admin'` → 204 with nothing stored.
  - `browser` from `parseUserAgent`.
  - Keep `analyticsLimiter`.
- [ ] **Step 4: Run** `npm test`. Expected: all PASS, including the existing `webEvents` tests (update an existing assertion only where a field it checks moved).
- [ ] **Step 5: Commit** `feat(analytics): events carry country, monthly visitor id, member id and source; bots, admins and raw IPs never stored` (plus the REMAINING_WORK entry).

### Task B2: Legacy visit ping stops keeping raw IPs

**Files:**
- Modify: `routes/analytics.js` (`/visit` handler), `models/WebVisit.js` (the `ip` field becomes optional; fix the duplicate `referrer` key in `getWeeklyStats`'s `$match` to `{ $nin: [null, ''] }`)
- Test: `test/webVisitIp.test.js` (new)

**Interfaces:**
- Consumes: `countryFor` (B1).

- [ ] **Step 1: Write failing tests:**
  - `visit stores country but no ip, city or coordinates`: post `/visit` from `203.0.113.9` → the doc has `country`, and `ip`, `lat`, `lon` and `city` are undefined.
  - `visit makes no outbound HTTP call`: stub `global.fetch` and the `http` module → not called.
- [ ] **Step 2: Run** the test. Expected: FAIL.
- [ ] **Step 3: Implement.** Remove the ip-api.com call; set `country` from `countryFor`; set `isNewVisitor` from `visitorIdFor` (`WebVisit.exists({ visitorId })`, and store `visitorId` instead of `ip`).
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `fix(analytics): the legacy visit ping keeps only the country, no raw IP or ip-api call`.

### Task B3: Real daily member activity

**Files:**
- Create: `models/UserActivityDay.js`
- Modify: `middleware/activityTracking.js`
- Test: `test/userActivityDay.test.js`

**Interfaces:**
- Produces: `UserActivityDay { userId: ObjectId, day: String 'YYYY-MM-DD' (KST), platform: 'ios'|'android'|'web'|'unknown', createdAt }`, unique `{ userId:1, day:1 }`, index `{ day:1 }`, TTL 400 days. `trackActivity(userId, platform?)` keeps its signature with a new optional second argument.

- [ ] **Step 1: Write failing tests:**
  - `one row per user per KST day`: two `trackActivity` calls 6 min apart (fake `Date.now`) on the same KST day → 1 row.
  - `a new KST day makes a new row`: 23:59 KST and 00:01 KST → 2 rows, keys `2026-10-20` and `2026-10-21`.
  - `debounced calls write nothing`: two calls 1 min apart → `updateOne` called once.
  - `platform recorded`: the middleware reads `detectPlatform(req)` from `validators/authValidator.js` → `'web'` for a browser UA.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** Inside the existing debounce branch, also `UserActivityDay.updateOne({ userId, day: dayKey(new Date()) }, { $setOnInsert: { platform } }, { upsert: true }).catch(() => {})`. Fire-and-forget, as today.
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(analytics): record each member's active days so past DAU/WAU/MAU are real`.

### Task B4: The report service

**Files:**
- Create: `lib/reportPeriods.js`, `lib/analyticsReport.js`
- Modify: `jobs/adminReportJob.js` (export the existing per-section helpers so the report reuses them; fix the `planType` → `plan` grouping)
- Test: `test/reportPeriods.test.js`, `test/analyticsReport.test.js`

**Interfaces:**
- Consumes: `WebEvent` (B1), `UserActivityDay` (B3), `User`, `Message`, `Conversation`, `Moment`, `Story`, call model as used in `adminReportJob.js`.
- Produces:
  - `lib/reportPeriods.js`:
    - `periodFor(period: 'day'|'week'|'month', date: Date|string): { period, periodKey, start: Date, end: Date, label: string }` (end exclusive; label like `Oct 14 – 20, 2026`, `Oct 20, 2026`, `October 2026`)
    - `previousPeriod(p): sameShape`
    - `latestCompleted(period, now: Date): sameShape`
    - `sendTimeFor(p): Date` (09:00 KST on the day after `end - 1ms`'s period ends, i.e. `end` + 9h in KST)
  - `lib/analyticsReport.js`: `buildReport(period, date): Promise<Report>`, where `Report` =
    ```
    { period, periodKey, label, start, end, complete: boolean,
      web: { visitors, pageViews, visits, pagesPerVisit, avgVisitMs,
             series: [{ x, visitors, pageViews }],          // per KST day; per KST hour (x = 'HH:00') for day
             countries: [{ code, count }],                   // top 10 by visitors
             sources: [{ type, name, count }],               // top 10 by visits
             topPages: [{ path, views, avgMs }],             // top 10
             devices: [{ device, count }], languages: [{ language, count }],
             funnel: { visited, signupStarted, signedUp, storeTaps },
             storeTaps: { total, ios, android,
                          byPlacement: [{ placement, ios, android }],    // every placement, sorted by total
                          bySource: [{ type, name, ios, android }],      // source of the visit the tap happened in, top 10
                          series: [{ x, ios, android }] },               // same buckets as web.series
             sections: [{ section, members, avgMs, topPages: [{ path, views }] }] },
      members: { signups, signupsStarted, webSignups, active, totalUsers, completedUsers, retention,
                 breakdowns: { native, learning, country, platform, gender } },   // each [{ key, count }] top 10
      app: { messages, conversations, moments, stories, calls },
      vip: { newVip, activeByPlan: [{ plan, count }], expiringSoon },
      previous: { visitors, pageViews, visits, webSignups, signups, active, storeTaps, iosTaps, androidTaps } | null }
    ```
  - Definitions are exactly the spec's "Report service" bullets. Sections by path prefix: `/chat` chat, `/communities` + `/community` community, `/moments` + `/moment` + `/reels` moments, `/learn` study, `/profile` profile.
  - `retention`: of the users created in `previousPeriod`, the share with a `UserActivityDay` in this period; `null` if that cohort is 0 or no `UserActivityDay` exists before this period's start.
  - `previous` is `null` when no `WebEvent` exists before `start`.

- [ ] **Step 1: Write failing tests:**
  - `test/reportPeriods.test.js`:
    - `periodFor('week','2026-10-21')` → key `2026-W43`, start `2026-10-18T15:00:00Z`, end `2026-10-25T15:00:00Z`.
    - `periodFor('month','2026-10-31T16:00:00Z')` → key `2026-11` (already Nov 1 KST).
    - `latestCompleted('day', 2026-10-21T00:30:00Z)` → key `2026-10-20`.
    - `sendTimeFor(day 2026-10-20)` → `2026-10-21T00:00:00Z` (09:00 KST).
  - `test/analyticsReport.test.js`, with fixtures inserted directly:
    - `counts visitors by distinct visitorId and visits by sessionId`
    - `pages per visit and average visit duration`
    - `edges`: events at 23:59:59.999 and 00:00 KST fall in different days, and the week total equals the sum of its days
    - `countries, sources, top pages ordered and capped at 10`
    - `funnel`: `signedUp` counts only `signupPlatform:'web'` and `isRegistrationComplete:true` users
    - `sections with members and top pages`
    - `active members from UserActivityDay, not lastActive`: a user with `lastActive` today but an activity row yesterday counts for yesterday
    - `previous is null and retention null with no history`
    - `vip activeByPlan groups by plan`
    - `store taps split by platform, by placement, and by the visit's landing source`: a session that landed with `utm_campaign=oct_promo` and tapped iOS on `hero` → `bySource` has `{type:'campaign', name:'oct_promo', ios:1, android:0}` and `byPlacement` has `{placement:'hero', ios:1, android:0}`
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** Use `$facet` over `WebEvent` for the web block, and the reused `adminReportJob` helpers (refactored to take `{ start, end }`) for app/members/vip. Target: a month report over 1M events in < 2 s. Add a test-only benchmark guard skipped unless `REPORT_BENCH=1`.
- [ ] **Step 4: Run** `npm test`. Expected: PASS, including `adminReportCallStats.test.js` and `weeklyReport.test.js` (unchanged behaviour of the old job).
- [ ] **Step 5: Commit** `feat(reports): one buildReport for day, week and month in KST`.

### Task B5: Snapshots, admin endpoints and per-admin email toggles

**Files:**
- Create: `models/ReportSnapshot.js`, `controllers/adminReports.js`
- Modify: `routes/admin.js`, `models/User.js` (add `adminReportPrefs: { daily: {type:Boolean, default:true}, weekly: {…true}, monthly: {…true} }`), `config/limitations.js` (add `ANALYTICS_REPORTS_ENABLED` read as `process.env.ANALYTICS_REPORTS_ENABLED === 'true'`, the same pattern as `STUDY_HUB_ENABLED`)
- Test: `test/adminReports.test.js`

**Interfaces:**
- Consumes: `buildReport`, `periodFor` (B4).
- Produces:
  - `getReport(period, date): Promise<Report>`, exported from `controllers/adminReports.js` for B6. A complete period is read from or written to `ReportSnapshot { period, periodKey (unique together), data, createdAt }`; the current period is cached in memory for 10 min.
  - `GET /api/v1/admin/reports?period=day|week|month&date=YYYY-MM-DD` → `{ success: true, data: Report }`. A bad period or date → 400; flag off → 404.
  - `GET /api/v1/admin/reports/settings` → `{ success, data: { daily, weekly, monthly } }`. `PUT` with any subset of booleans → the same shape. Flag off → 404.

- [ ] **Step 1: Write failing tests:**
  - `404 when the flag is off`
  - `non-admin gets 403`
  - `returns a report and freezes a completed period`: the first call creates a snapshot; insert more events; the second call returns the identical `data`
  - `current period not frozen`
  - `settings default true and PUT updates only the caller`
  - `bad period → 400`
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(reports): admin report and settings endpoints behind ANALYTICS_REPORTS_ENABLED`.

### Task B6: Exactly-once emails

**Files:**
- Create: `models/ReportRun.js`, `jobs/analyticsReportJob.js`, `utils/reportEmailTemplate.js`
- Modify: `jobs/scheduler.js` (when the flag is on: start `analyticsReportJob` every 5 min with `setInterval`, and skip `scheduleAdminReport` and `scheduleWebVisitReport`)
- Test: `test/analyticsReportJob.test.js`, `test/reportEmailTemplate.test.js`

**Interfaces:**
- Consumes: `getReport` (B5), `latestCompleted`, `sendTimeFor` (B4), `utils/sendEmail.js`.
- Produces:
  - `ReportRun { period, periodKey (unique together), recipients: [{ userId, email, state: 'pending'|'sending'|'sent'|'failed', attempts, lastError }], done: Boolean, createdAt }`.
  - `runAnalyticsReports(now = new Date(), { send = sendEmail } = {}): Promise<{ started: string[], resumed: string[], skipped: string[] }>`.
  - `buildReportEmail(report: Report, { siteUrl }): { subject, html, text }`:
    - subject `BananaTalk daily report · Oct 20`, `… weekly report · Oct 14 – 20`, `… monthly report · October 2026`;
    - button href `${siteUrl}/admin/reports?period=<p>&date=<start YYYY-MM-DD>`;
    - comparisons render `—` when `previous` is null;
    - includes an "App store clicks" block: iOS and Android totals with change, plus the top 3 buttons and top 3 sources.

- [ ] **Step 1: Write failing tests** (inject `send` as a stub):
  - `sends once at 09:00 KST`: `now` = 08:59 KST → nothing; 09:05 KST → one call per admin with the toggle on.
  - `two concurrent runs send once`: `Promise.all([run(now), run(now)])` → each admin once (the unique index).
  - `a recipient left sending by a crash is resent; sent ones are not`: seed a ReportRun with one `sent` and one `sending` → only the `sending` one is called.
  - `failed recipients retried up to 3 attempts`: the stub throws → attempts 1, 2, 3, then the next run leaves it `failed` and sets `done`.
  - `catch-up within 3 days, skip after`: `now` = 2 days after the send time → sent; 4 days after → `skipped` contains the key, and no ReportRun is created.
  - `admins without an email and toggled-off admins excluded; an empty list marks the run done`.
  - `monthly sends on the 1st, weekly on Monday` (time travel across a month).
  - `template shows — for missing comparisons and links to the period`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** Order per run: for each period type → `latestCompleted` → if `now >= sendTimeFor` and `now < sendTimeFor + 3 days` → `ReportRun.create` (on E11000, resume instead) → for each recipient: `sending`, then `send`, then `sent`/`failed`. Then resume every `ReportRun` with `done:false` that is younger than 3 days. Tag Mailgun messages through the `sendEmail` `tags` option if supported, otherwise skip.
- [ ] **Step 4: Run** `npm test`. Expected: PASS, including `schedulerFlagTiming.test.js`.
- [ ] **Step 5: Commit** `feat(reports): daily, weekly and monthly emails to every admin, exactly once`.

### Task B7: Finish the backend branch

- [ ] **Step 1:** Update `docs/REMAINING_WORK.md`:
  - ops: set `ANALYTICS_REPORTS_ENABLED=true`, then restart;
  - follow-ups: delete `/admin/analytics/*` after one release with the flag on; owner: AdSense GDPR message.
- [ ] **Step 2:** `git merge main` in the worktree, resolve, then `npm test` (Node 24). Expected: all PASS.
- [ ] **Step 3:** `git -C /Users/davis/Desktop/Personal/be-integration merge-tree --write-tree main feat/analytics-reports` shows no conflicts.
- [ ] **Step 4:** Stop and ask the owner before merging to `main` (auto-deploy).

## Website tasks (repo `language_exchange_web_front`, branch `feat/analytics-reports`)

### Task W1: Tracker sends what the reports need

**Files:**
- Modify: `src/analytics/track.ts`, `src/analytics/usePageView.ts`, `src/components/auth/Register.tsx` (send `signup_start` once on mount)
- Test: `src/analytics/track.test.ts`, `src/analytics/usePageView.test.tsx`

**Interfaces:**
- Produces:
  - `EventName = "page_view" | "page_leave" | "store_tap" | "signup_start"`.
  - `EventData` adds `landing?: boolean; utm?: Record<"source"|"medium"|"campaign"|"content"|"term", string>; durationMs?: number`.
  - `trackEvent` sends `Authorization: Bearer <token>` when `store.getState().auth.userInfo?.token` exists (read via a small `getAuthToken()` in `track.ts` that reads the Redux store module lazily, so there is no import cycle).

- [ ] **Step 1: Write failing tests:**
  - `landing view carries external referrer and utm; later views carry neither`: URL `/?utm_source=ig&utm_campaign=oct`, referrer `https://instagram.com/` → the first payload has both; after navigating, the second payload has neither.
  - `internal referrer dropped`: referrer `https://banatalk.com/x` → `referrer` null.
  - `page_leave with visible duration on route change and on pagehide`: fake timers, 4 s visible, then hidden 10 s, then visible 2 s, then navigate → `durationMs === 6000`; capped at 1,800,000.
  - `new session after 30 min idle`: advance 31 min → a different `sessionId`, and the next view is `landing: true`.
  - `no events under navigator.webdriver or on /admin paths`.
  - `legacy /analytics/visit is no longer called`.
  - `Authorization header sent when signed in`.
  - `signup_start fires once on /register`.
- [ ] **Step 2: Run** `CI=true npx react-scripts test --watchAll=false src/analytics src/components/auth/Register`. Expected: FAIL.
- [ ] **Step 3: Implement.** Store the session's last-activity time beside `bt.sid` in sessionStorage (`bt.sidAt`). Visibility timing via `document.visibilityState`, `visibilitychange` and `pagehide` listeners registered once in `usePageView`.
- [ ] **Step 4: Run** the suite. Expected: PASS. Run `npm run test:budget`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(analytics): landing source and campaigns, time on page, member id; no legacy ping`.

### Task W2: Reports page in the admin console

**Files:**
- Create: `src/components/admin/pages/AdminReports.tsx`, `src/components/admin/reports/{ReportKpis,ReportBars,ReportSections,reportCsv}.tsx|ts`
- Modify:
  - `src/store/slices/adminSlice.ts`
  - `src/components/admin/AdminLayout.tsx` (nav: add `{ to: "/admin/reports", key: "admin.nav.reports", label: "Reports" }` after Overview; hide Reach when the report query succeeded)
  - `src/router/routes.tsx` (`admin/reports`; `admin/reach` renders `<Navigate to="/admin/reports" />` when the report query succeeded, else Reach)
  - `src/components/admin/pages/AdminOverview.tsx` (the visits tile uses `report.web.visitors` vs `previous.visitors` when available)
  - all 18 `src/utils/locales/*.json`
- Test: `src/components/admin/pages/AdminReports.test.tsx`, `src/components/admin/reports/reportCsv.test.ts`

**Interfaces:**
- Consumes: the `Report` JSON (B4), `GET/PUT /admin/reports/settings` (B5).
- Produces: hooks `useGetAdminReportQuery({ period, date? })`, `useGetAdminReportSettingsQuery()`, `useUpdateAdminReportSettingsMutation()`; `toCsv(report: Report): string`.

- [ ] **Step 1: Write failing tests:**
  - `renders KPIs, chart and every block from a fixture report` (use the mockup's numbers)
  - `switching Day/Week/Month and the date requests that period`
  - `comparison shows — when previous is null`
  - `404 shows the not-switched-on state`
  - `section row click shows its top pages`
  - `App store clicks block shows iOS and Android totals, the by-button table and the by-source table`
  - `email toggles call PUT with only the changed key`
  - `toCsv` has a header row per block and escapes commas and quotes in paths
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement**, following the mockup (`.superpowers/brainstorm/87792-1792561076/content/reports-page.html`):
  - Reuse `LineChart` (two series: visitors, page views), `StatCard` and `DataTable`.
  - Flags from country codes via the existing `countryFlag` helper in `community/today/dailyMatchView.ts`.
  - Metric tooltips use the spec's definitions.
  - Add the `admin.reports.*` strings in English, plus translations for the other 17 locales.
- [ ] **Step 4: Run** the full suite, the build and `npm run test:budget`. Expected: PASS (admin is a lazy chunk).
- [ ] **Step 5: Commit** `feat(admin): Reports page — day, week, month, countries, sources, funnel, members, CSV`.

### Task W3: Consent for ads and an honest privacy policy

**Files:**
- Modify:
  - `src/components/growth/ConsentBar.tsx`, `src/components/footer/FooterMain.tsx`, `src/components/settings/PrivacySettings.tsx`: show when `GA_MEASUREMENT_ID || autoAdsEnabled()`
  - `src/components/ads/adsGate.ts`: `requestNonPersonalizedAds = consent === "granted" ? 0 : 1`
  - `src/components/navbar/PrivacyPolicy.tsx`
- Test: the existing `ConsentBar`/`adsGate`/`PrivacyPolicy` tests (update), plus new cases.

- [ ] **Step 1: Write failing tests:**
  - `bar shows with ads on and no GA id`
  - `undecided consent → non-personalized`
  - `granted → personalized`
  - `denied → non-personalized`
  - `policy mentions: country only, IP not stored for analytics, 13 months, AdSense and ad cookies with opt-out, login IPs kept for security, GeoLite2 credit`
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.** Update the policy's "last updated" date to the commit date, and fix the copy that says nothing is collected without GA.
- [ ] **Step 4: Run** the suite and the build. Expected: PASS.
- [ ] **Step 5: Commit** `fix(privacy): ads consent whenever ads run; policy matches what is collected`.

### Task W4: End-to-end proof, then merge

- [ ] **Step 1:** Run the backend worktree locally:
  - `ANALYTICS_REPORTS_ENABLED=true`, a local Mongo, and the real Mailgun keys from `config/config.env`;
  - set `ADMIN_EMAIL` aside, and give one local admin user the owner's chosen test address.
- [ ] **Step 2:** Run the website on `localhost:3000` against it. Browse 10+ pages as a visitor (two sessions, one with `?utm_source=test`) and as a signed-in member.
- [ ] **Step 3:** Call `runAnalyticsReports(<tomorrow 09:05 KST>)` through a one-off script. Confirm one email arrives, and its headline numbers equal `/admin/reports?period=day` for the same day.
- [ ] **Step 4:** Use Playwright to screenshot `/admin/reports` at 1440 px and 390 px (Day, Week, Month), plus the email HTML, into the scratchpad, and show them to the owner.
- [ ] **Step 5:** No-ff merge `feat/analytics-reports` into the website `main` (`Merge: website analytics and admin reports`) and push. Then ask the owner to approve the backend merge (B7 Step 4), and after deploy, to set `ANALYTICS_REPORTS_ENABLED=true`.
