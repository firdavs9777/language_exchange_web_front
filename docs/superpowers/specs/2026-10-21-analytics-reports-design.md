# Website analytics and admin reports — design

Date: 2026-10-21. Repos: backend `be-integration` (Express + MongoDB), website `language_exchange_web_front` (React).

## Why

The owner wants to manage BananaTalk from numbers: how many people visit the website, from which countries and sources, what they look at, how many become members, and how members use the site, delivered to every admin as daily, weekly and monthly reports, and browsable in the admin console with charts. The reports must be correct and dependable: the same number in the email and on the page, every report sent exactly once.

An audit (2026-10-21) found the current setup cannot deliver this:

- Three counters (first-party events, the legacy visit ping into `WebVisit`, GA4) count the same visits independently and never reconcile. GA4 is off in production.
- No bot filtering. `document.referrer` is repeated on every in-app navigation, inflating "Top referrers". UTM tags on landings are never recorded. The legacy ping sends raw paths, leaking profile and moment ids.
- `WebVisit` stores raw IPs, city and lat/lon for 90 days, geolocated by a synchronous plain-HTTP call to ip-api.com on every page view.
- The daily admin report (`jobs/adminReportJob.js`) and weekly web-visit report (`jobs/webVisitReportJob.js`) email one address (`ADMIN_EMAIL`, defaulting to `bananatalkmain@gmail.com`), not admin accounts. There is no monthly report. They run on drifting `setTimeout` chains, and with roughly 7,600 pm2 restarts recorded, a restart near the send time skips or repeats a run. The "VIP by plan" breakdown reads `vipSubscription.planType`, but the field is `plan`, so it is always empty. `getWeeklyStats` has a duplicate `referrer` key in a `$match`.
- AdSense serves personalized Auto ads to every visitor with no consent prompt, because the consent bar only renders when a GA id is set. The privacy policy says nothing about ads, analytics retention or the first-party event log.

## Goals

1. **One analytics pipeline.** The website sends page views and a few named events to `POST /api/v1/analytics/events`. One collection (`WebEvent`) is the single source of every website number.
2. **Countries without keeping IPs.** The server looks up the visitor's country from the request IP at ingestion, using an offline GeoIP database (no network call). It stores the country code and never the IP.
3. **Anonymous unique visitors without cookies.** The server derives `visitorId = sha256(monthSalt + ip + userAgent)`. `monthSalt` is a random secret per calendar month (KST), stored in the database and generated on first use. This dedupes visitors within a month without storing anything in the browser.
4. **Members' use of the site.** When the request carries a valid access token, the event also stores `userId`. The Reports page then shows how signed-in members use each section. Anonymous visitors are never linked to a person.
5. **Reports page** in the admin console (`/admin/reports`), matching the approved mockup (`.superpowers/brainstorm/…/reports-page.html`):
   - Day / Week / Month switch with a date picker, compared with the previous period, CSV export.
   - Headline numbers: visitors, page views, web sign-ups, active members, pages per visit, average visit duration.
   - Line chart: visitors and page views per day (per day for week and month views; per hour for the day view).
   - Countries, sources (search, social, direct, campaigns), top pages with average time, visitor-to-member funnel, devices and site languages, members' use by section.
   - **App store clicks** (promotion results): iOS and Android taps over time; by button (hero, download page, sticky banner, popup and others); and by the source or campaign that brought the visit. This replaces the Reach page's store-tap tables, and the emails carry a summary.
   - App activity from existing models: all-platform sign-ups, active members, messages, moments, new VIP.
6. **Emailed reports** to every user with `role: 'admin'` that has an email, through the existing Mailgun sender (`utils/sendEmail.js` / `services/emailService.js`):
   - Daily at 09:00 KST for the previous day.
   - Weekly on Monday at 09:00 KST for the previous Monday–Sunday.
   - Monthly on the 1st at 09:00 KST for the previous month.
   - Same numbers as the Reports page, with a button to it. Each admin can switch each report off.
7. **Exactly-once sending** across restarts and multiple processes, with catch-up if the server was down at send time.
8. **Privacy compliance.** Consent for personalized ads, and a privacy policy that matches what is collected.

## Non-goals

- Screen recording or session replay, or any recording of what is typed.
- Storing raw IP addresses for analytics, or identifying anonymous visitors.
- Real-time or live dashboards. Reports cover completed periods; today's partial numbers on the Reports page are fine.
- Changes to the Flutter app's analytics.
- Changes to security logging. Raw IPs in `User.loginHistory`, `refreshTokens` and the audit log are kept for security. Note this in the privacy policy, but do not touch it.
- Enabling GA4.

## Anti-goals (a failure even if it "works")

- The email and the Reports page disagree for the same period.
- A report is missed or arrives twice.
- Bots, crawlers, the prerender build or admins browsing their own console inflate the numbers.
- Tracking slows down page loads or breaks navigation.
- Personal data is kept beyond what the reports need.

## Design

### Events (website → backend)

`src/analytics/track.ts` stays the only sender. It uses `fetch` with `keepalive: true` and sends the `Authorization` header when signed in, so the server can attach `userId`.

| name | when | extra fields |
|---|---|---|
| `page_view` | every route change, including the first (existing `usePageView`) | `path` (route template, existing `routeTemplate.ts`), `landing: true` on the first view of a session, with `referrer` and `utm_source/medium/campaign/content/term` read from the URL only then |
| `page_leave` | when the route changes, on `pagehide`, and when `visibilitychange` goes hidden | `path`, `durationMs` (visible time on that page, capped at 30 min) |
| `store_tap` | existing | existing |
| `signup_start` | `/register` is shown | — |

Completed web sign-ups are not a browser event. They are counted on the server from `User.signupPlatform === 'web'` with `isRegistrationComplete: true`, so an ad blocker can't hide them.

Rules:
- `sessionId` stays per tab in sessionStorage (existing). A session ends after 30 minutes without an event; the next event starts a new session id.
- `referrer` is sent only on the landing view, and only when its host is not our own site.
- No event is sent when `navigator.webdriver` is true, during prerender, or on `/admin/*` paths.
- The legacy `POST /analytics/visit` call in `usePageView.ts` is removed.
- `cta_tap` is dropped from the type (it was never sent).

### Ingestion (backend)

`controllers/webEvents.js` extends to the new names and fields:
- **Validation:** strict allow-lists, lengths and types as today. Values not on an allow-list are dropped, not stored.
- **Bot filtering:** user agents matching a maintained bot list (the `isbot` package) are acknowledged with 204 and not stored.
- **Country:** from `geoip-lite` (offline GeoLite2 data, CC BY-SA, credited in the privacy policy), stored as the ISO code.
- **`visitorId`:** as in Goal 3; the raw IP is never written.
- **`userId`:** set only if a valid access token is present (optional-auth middleware); a missing or invalid token is not an error. Events from users with `role: 'admin'` are not stored.
- **Device, OS and browser family:** from `utils/parseUserAgent.js`. The raw user agent is not stored.
- **`source`:** classified at ingestion into `search | social | direct | referral | campaign` plus a host or campaign name.
- **Retention:** the existing 400-day TTL, so a month can be compared with the same month last year.
- **Indexes:** `{createdAt}`, `{name, createdAt}`, `{userId, createdAt}` (sparse).

The legacy `POST /analytics/visit` endpoint stays for old cached clients but stops storing raw IPs and stops calling ip-api.com (country from `geoip-lite`, IP dropped). `WebVisit` documents age out under their existing 90-day TTL. `jobs/webVisitReportJob.js` is retired when the flag is on.

### Member activity record (backend)

`User.lastActive` is a single timestamp, so it cannot answer "who was active last Tuesday". A new collection fixes that:
- `UserActivityDay { userId, day: 'YYYY-MM-DD' (KST), platform }`, with a unique index on `(userId, day)` and a 400-day TTL.
- It is upserted from `middleware/activityTracking.js` inside the existing 5-minute throttle, so it adds at most one write per user per 5 minutes on the request path, and only when `lastActive` is updated anyway.
- It covers app and web requests alike.
- There is no history before launch. Until a full previous period exists, the Reports page and emails show "—" for comparisons that have no data, never 0%.

### Report service (backend)

One pure-ish function, `buildReport({ period: 'day'|'week'|'month', date })`, computes everything for one period and the previous one, in Asia/Seoul time (existing `lib/reportingTimezone.js`). The Reports page, CSV export and emails all call it, so they cannot disagree.

Definitions, shown as tooltips on the page:
- **Visitors:** distinct `visitorId` in the period. A week that crosses a month boundary can count a visitor twice; this is accepted and noted in the tooltip.
- **Page views:** count of `page_view`.
- **Visits:** distinct `sessionId`. **Pages per visit:** page views ÷ visits. **Average visit duration:** mean over visits of the summed `page_leave.durationMs`.
- **Web sign-ups:** users created in the period with `signupPlatform: 'web'` and `isRegistrationComplete: true`. **All sign-ups:** see Members & VIP below.
- **Active members:** distinct users with a `UserActivityDay` row in the period. Day, week and month give real DAU, WAU and MAU for any past period. `User.lastActive` is not used, because every request overwrites it. *(Builder-check call: real counts, not approximations.)*
- **Members' use by section:** distinct `userId` and mean `durationMs` per section. A section is a path prefix: `/chat` Chat, `/communities` + `/community` Community, `/moments` + `/moment` + `/reels` Moments, `/learn` AI Study, `/profile` Profile.
- **App activity:** reuse the existing counts in `adminReportJob.js` (messages, conversations, moments, stories, calls, new VIP), with the VIP plan field fixed to `plan`.
- **Members & VIP:** everything the current daily admin email carries, so retiring it loses nothing. *(Builder-check call: keep all of it.)*
  - Point-in-time figures, taken when the period ends: total users, completed registrations, active VIP by plan, VIPs expiring in the next 7 days.
  - Breakdowns of the period's sign-ups by native language, learning language, country, platform and gender.
  - Retention: of users who signed up in the period before last, the share with a `UserActivityDay` in the last period. It shows "—" until there is enough activity history.
- **Sign-ups:** the headline counts completed registrations (`isRegistrationComplete: true`, by `createdAt`). Started-but-unfinished registrations are shown next to it. *(Builder-check call.)*
- **Members' use by section** includes each section's top 5 pages, which the page shows when a row is clicked (the drill-down in the mockup). *(Builder-check call: in scope.)*

Results are cached for 10 minutes for the current, incomplete period. Completed periods are stored in `ReportSnapshot { period, periodKey, data, createdAt }` the first time they are built, so a sent email and a later page view show identical numbers.

### Endpoints (admin only, existing `protect` + `authorize('admin')`)

- `GET /api/v1/admin/reports?period=day|week|month&date=YYYY-MM-DD`: the report JSON. `date` is any day inside the wanted period and defaults to the current period.
- `GET /api/v1/admin/reports/settings` / `PUT …`: the signed-in admin's own toggles `{ daily, weekly, monthly }`, stored on `User.adminReportPrefs` (all default `true`).

### Scheduling and sending

A new `jobs/analyticsReportJob.js`, started from the existing scheduler, checks every 5 minutes. For each period type whose latest completed period has passed its 09:00 KST send time, it:
1. Inserts `ReportRun { period, periodKey }` with a unique index on `(period, periodKey)`. A duplicate-key error means another process or an earlier run already took it, so it stops.
2. Builds (or reads) the snapshot, then writes the full recipient list onto the `ReportRun` as `pending` (admins with that toggle on and an email).
3. For each recipient, in order: mark it `sending`, make one Mailgun call (tagged `report:<period>:<periodKey>` for tracing), then mark it `sent` or `failed`.
4. Every check also resumes unfinished runs. `pending` and `failed` recipients are sent, with up to 3 attempts. A recipient left `sending` by a crash is sent again. *(Builder-check call: after a crash at the exact moment of sending, a rare duplicate is accepted over a missed report.)*

Catch-up: a period not yet sent is sent late, up to 3 days after its send time. Older ones are skipped and logged. On the first run the job does not backfill earlier periods.

When the flag is on, `scheduleAdminReport` and `scheduleWebVisitReport` are not started, so admins never get both the old and new emails.

### Flag and rollout

- Backend env `ANALYTICS_REPORTS_ENABLED`, default `false` (the repo rule: merging to `main` auto-deploys). Off: the new ingestion fields are still accepted and stored (harmless), the report endpoints return 404, the new job doesn't run, and the old jobs run as today.
- The website's Reports page shows a "Reports are not switched on yet" state on a 404.
- To launch, set `ANALYTICS_REPORTS_ENABLED=true` on the server and restart.
- Owner action in the AdSense console: Privacy & messaging → create and publish the GDPR (EEA/UK/CH) message.

### Existing Reach page

`/admin/reach` and its data (`GET /admin/analytics/events|visits`, `controllers/adminAnalytics.js`) are replaced by Reports, so there is only one set of website numbers.
- When the flag is on, the Reach nav item is removed and `/admin/reach` redirects to `/admin/reports`.
- The Overview page's "visits this week" tile reads the week report.
- The old endpoints stay until the flag has been on for one release, then they are deleted in a follow-up. *(Builder-check call.)*

### Website: Reports page

- New route `/admin/reports` and an admin nav item "Reports", using the existing `AdminLayout`, `LineChart` and table parts, with data in `adminSlice`.
- Layout as in the mockup. CSV export builds the file in the browser from the report JSON, one section per block.
- Each admin's own email toggles sit at the top of the page.
- New strings go under `admin.reports.*` in all 18 locales (`localeParity` covers `admin`).

### Email

An HTML template in the style of `utils/emailTemplates.js`, in English only (admin-facing). Subject: `BananaTalk weekly report · Oct 14 – 20` (likewise daily and monthly). Content as in the mockup. The button links to `https://banatalk.com/admin/reports?period=week&date=…`, and the footer says how to turn the email off.

### Privacy and consent (website)

- **Ads consent:** the consent bar shows whenever ads are on (`autoAdsEnabled()`), not only when a GA id is set. Until a visitor says yes, AdSense runs non-personalized (`requestNonPersonalizedAds = 1` while consent is undecided or denied). The footer and Privacy settings "Privacy choices" entry follows the same rule.
- **EEA, UK and Switzerland:** Google requires a certified consent tool (TCF) for personalized ads there, and our own bar is not one. Those visitors are covered by Google's own "Privacy & messaging" GDPR message, which the owner switches on in the AdSense console. No code is needed, and our bar only adds the non-personalized default on top. *(Builder-check call; owner action listed in the rollout.)*
- **Privacy policy** updates: what the website records, that IPs are used only to look up the country and are not stored for analytics, 13-month retention, AdSense and ad cookies with the opt-out, raw IPs kept in login security records, and the GeoLite2 credit.
- **Copy fixes:** fix the copy that claims nothing is collected without GA (`FooterMain.tsx`, `PrivacyPolicy.tsx`).

## Constraints

- Backend tests: `npm test` (node test runner, mongodb-memory-server); run on Node 24 locally (production is Node 20.16, so the new code must not need newer runtime APIs). Website: `CI=true npx react-scripts test`, plus `GENERATE_SOURCEMAP=false npx react-scripts build` as the type-check, plus `npm run test:budget` (the tracking code must stay inside the existing bundle budget).
- Backend work happens in its own worktree off `main`. `main` is checked out in `be-integration` by other sessions. Merge `main` into the branch, then ask the owner before merging to `main`. Update `docs/REMAINING_WORK.md` in every commit.
- Website work: a feature branch, then a no-ff `Merge:` commit into `main`.
- There is one pm2 process today, but the design must not assume it.

## Verification ("100% working")

- Backend unit tests for: ingestion (bot dropped, IP never persisted, country set, `visitorId` stable within a month and different across months, admin events dropped, `userId` only with a valid token); `buildReport` against hand-built fixtures for every metric and both period edges in KST; the exactly-once job (two concurrent runs send once, a restart mid-run doesn't resend, catch-up within 3 days, skip after); recipient selection and toggles.
- Website tests for: event sending (landing-only referrer and UTMs, `page_leave` durations, no events on admin paths or under webdriver), the Reports page rendering a fixture, and CSV export.
- An end-to-end check before launch, run locally against a seeded database:
  - send a day's report to a test address through Mailgun;
  - confirm the email's numbers equal the Reports page for the same period;
  - open the page with Playwright at desktop and phone widths and save screenshots.

## Left to the builder

- Exact component split, chart styling and colours, provided the page reads like the mockup.
- Whether `buildReport` uses one `$facet` aggregation or several queries, as long as a month report returns in under 2 seconds on 1 million events (add a daily rollup collection only if it doesn't).
- The source-classification host lists (search engines, social networks).
