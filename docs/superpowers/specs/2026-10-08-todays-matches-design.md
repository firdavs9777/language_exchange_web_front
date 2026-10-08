# Today's matches on the web

**Date:** 2026-10-08
**Status:** Approved in conversation; written for review
**Scope:** Web only (`language_exchange_web_front`). No backend changes.

---

## Why

The app has a **Today's matches** tab: a daily batch of six partners from `GET /api/v1/matching/daily`, with **Say hi / Wave / Skip** on each card. The web has none of it — nothing calls `/matching/daily`. The user flagged it as very important and chose:

- **Placement:** the **first tab** of `/communities`, which signed-in members land on by default.
- **Priority:** build it before the Moments work.

## What already exists, and is live

All verified against the backend code and production `/app-config` on 2026-10-08.

- **`GET /matching/daily`** (`controllers/matching.js` `getDailyMatches`, behind `protect`). When `DAILY_MATCHES_ENABLED` is off it answers **404**. Its payload:

  ```json
  {
    "success": true,
    "date": "2026-10-08",
    "nextRefreshAt": "2026-10-09T00:00:00.000Z",
    "cached": true,
    "matches": [{
      "user": { "_id": "…", "name": "…", "images": ["…"], "native_language": "…",
                "language_to_learn": "…", "location": { "country": "…" }, "intents": ["learn"] },
      "matchReasons": ["reciprocal_pair", "shared_topic:music", "active_today"],
      "reciprocal": true,
      "lastActiveBucket": "today",
      "responseRate": 0.8,
      "boosted": true
    }]
  }
  ```

  Notes on that payload:
  - `cached` is present only on cache hits.
  - `boosted` is present only when the card is boosted.
  - `user` uses the `USER_LIST_FIELDS` projection, so it carries the raw **`images`** array and no `imageUrls`.
  - The batch is the same all day and rolls over at `nextRefreshAt` (midnight UTC).
  - `BATCH_SIZE` is 6. With an extra-matches pool (bought with coins) it can be larger, so the web never assumes 6.

- **`matchReasons` on `/daily` are CODES**, not English. They are produced by `lib/dailyMatches.js` `structuredReasons`: `reciprocal_pair`, `same_target_language`, `shared_topic:<topicId>` (more than one possible), `active_today`, `same_city`.
- **`POST /interactions/skip`** with body `{ targetUserId }` records a skip, and the server leaves skipped people out of future batches.
- **The web already has:**
  - `WaveSheet` (`src/components/community/WaveSheet.tsx`, wired through `handleWaveMember` in `MainCommunity`);
  - chat at `/chat/:userId`;
  - topic labels under `profile.topics.<id>`.
- **Production flags:** `matchesLayoutEnabled: true` and `boostsEnabled: false`. The app shows its "extra matches" coin button only when boosts are on, so it is dormant in production.

## Design

### Data

A new RTK Query endpoint in `communitySlice.ts`:

- `getDailyMatches` → `GET /api/v1/matching/daily`, `keepUnusedDataFor: 60`.
- `skipUser` → `POST /api/v1/interactions/skip` with `{ targetUserId }`.

**A 404 means "this feature is off"**, not an error. Any other failure is a real error state with a retry.

### The tab

- `CommunityUrlTab` / `CommunityNavTab` gain **`today`**, the first entry in the sub-nav. It is rendered in place by the list, like `foryou`.
- **Default tab.** A signed-in member opening `/communities` with no `?tab=` lands on `today`. An explicit `?tab=…` always wins, so existing links keep working.
- **When the feature is off** (404), the tab disappears and a default landing falls back to `all`. A link that says `?tab=today` also shows `all`. The address bar is not rewritten.
- **Before the first answer,** the Today tab shows a skeleton of match cards. It does not switch tabs while loading, so nothing jumps.
- **Signed out:** no Today tab, because the endpoint is behind `protect`. Logged-out visitors keep seeing `PublicCommunities` as today; the prerendered `/communities` page is unaffected.
- **Hidden on the Today tab:** the filter button, search, sort and the highlighted carousel. The batch is the server's choice; filters do not apply to it.

### The header

- **"Your {{count}} matches today"**, counting the cards still showing — skips decrease it.
- **"Refreshes at {{time}}"**, with `nextRefreshAt` in the reader's local time (`Intl.DateTimeFormat`, hour and minute). If it is missing: "Refreshes at midnight".
- **Rollover:** when the clock passes `nextRefreshAt` while the tab is open, the query refetches once. This is checked on window focus and with one timer set for that moment.

### The card — `src/components/community/MatchCard.tsx`

A row card, not the grid's photo cell, matching the app's layout:

- **Avatar:** `images[0]`. An absolute URL is used as-is; a relative path becomes `${BASE_URL}/uploads/<path>`, the rule `MainNavbar` already uses. No photo means the shared `Avatar` initials fallback.
- **Name,** then the country flag, then a green dot when `lastActiveBucket === 'today'`.
- **Language pair chip:** `<native> → <learning>`, leaving out whichever side is empty.
- **Reason chips,** localized from the codes:

  | Code | Chip |
  |---|---|
  | `reciprocal_pair` | "You're learning each other's language" |
  | `same_target_language` | "Also learning {{language}}", where language is the card user's `language_to_learn` |
  | `shared_topic:<id>` | "Shared interest: {{topic}}", where topic is `t('profile.topics.<id>')`, falling back to the id |
  | `active_today` | "Active today" |
  | `same_city` | "Lives in your city" |

  An unknown code renders nothing. These are codes, so there is no English string to fall back to, and a raw code is never shown.
- **"Replies fast"** when `responseRate >= 0.7`. **"Boosted"** when `boosted`.
- **Actions:**
  - **Say hi** — a link to `/chat/<id>`. It is primary.
  - **Wave** — opens the existing `WaveSheet` for this person.
  - **Skip** — the card leaves at once and `POST /interactions/skip` is sent. If the request fails, the card stays gone and nothing is reported, the same as the app. Skips are kept for the rest of the session so a refetch does not bring the card back.
- **Name or avatar** opens `/community/<id>`.

### Empty state

When every card has been skipped, or the batch is empty:

- "That's everyone for today"
- "Fresh matches tomorrow. Meanwhile, browse all partners."
- A **Browse partners** button that switches to `all`.

### Copy

A new `communityMain.today.*` namespace, in all 18 locales and parity-guarded. The wording follows the app's strings (`matchesTodayTitle`, `matchesRefreshHint`, `matchReason*`, `matchRepliesFast`, `boostedChip`, `matchesEmpty*`, `wave`, `skip`). Where the app's own translation exists in its `.arb` files, it is lifted from there, as was done for intents.

### Left out

- The extra-matches coin button. It is dormant in production, where boosts are off.
- Push-notification priming.
- Interstitial ads.
- Any backend change.

## Testing (Jest + Testing Library)

- **Slice:**
  - `getDailyMatches` requests `GET /api/v1/matching/daily`;
  - `skipUser` posts `{ targetUserId }` to `/api/v1/interactions/skip`.
- **Tab:**
  - a signed-in `/communities` with no tab lands on Today;
  - `?tab=all` still lands on All;
  - a 404 hides the tab and falls back to All;
  - signed out, there is no Today tab;
  - filters, search, sort and the carousel are absent on Today.
- **Header:** the count follows skips; the refresh time is rendered from `nextRefreshAt`; the fallback text appears when it is missing.
- **Card:**
  - every reason code maps to its chip, `shared_topic` uses the topic label, an unknown code renders nothing;
  - the photo URL rule works for absolute and relative paths;
  - the active dot, "Replies fast" (0.7 boundary) and "Boosted" each appear when they should;
  - Say hi links to `/chat/<id>`, Wave opens the sheet, and Skip removes the card and posts the skip;
  - a failed skip keeps the card gone.
- **Empty state** after the last skip, with Browse partners switching to All.
- **Rollover** refetches once after `nextRefreshAt`.
- **Locale parity** for `communityMain.today.*`.
- **Existing suites stay green**, and the mount-request budget in `communityPerf.test.tsx` is updated with its reason. Today is the default tab, so `/matching/daily` replaces the All list's request on first load. The budget changes in composition, not necessarily in count.
