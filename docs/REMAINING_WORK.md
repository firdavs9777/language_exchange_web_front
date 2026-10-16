# Remaining work — web

Last updated: 2026-10-16. Tick items off in the same commit that finishes them.

See also: app `bananatalk_app/docs/REMAINING_WORK.md` (release, store consoles, device QA) ·
backend `language_exchange_backend_application/docs/REMAINING_WORK.md` (server env, prod DB, flags, ops).

## 1. Status

- **`main` 2ce0c93 is DEPLOYED (2026-10-13)**: admin announcements console with the 2026-10-13 audit fixes,
  delivery status incl. "Stopped at end time" / "Ended by admin", and the `/moments/:id` → `/moment/:id` redirect.
- Backend a9a0b6e (deployed) has everything the console needs. App 2.7.0 is not released yet.
- `public/.well-known/assetlinks.json` still holds `TODO_SHA256_*`, so Android App Links verify nothing.

## 2. Owner — manual steps (in order)

1. Paste the **upload-key** and **Play app-signing** SHA-256 (Play Console → App integrity → App signing) into
   `public/.well-known/assetlinks.json`, deploy (app handoff `2.7.0-handoff.md` §5; device check is in the app file).
2. Optional: apply `deploy/nginx.snippet.conf` on the droplet (serves the Apple association file as `application/json`, real 404s).
3. Phase 5: apply the link-preview locations in `deploy/nginx.snippet.conf` (they must sit above the `nginx.routes.conf` include), `nginx -t`, reload, then run the two `curl` checks in README "Link previews". Previews in KakaoTalk / Telegram / WhatsApp are rows in the app's `docs/qa/regression-suite.csv` (Web area).

## 3. Production QA

- [ ] `curl https://banatalk.com/.well-known/assetlinks.json` returns the real fingerprints after step 1.
- [ ] First real announcement end-to-end: publish → push → notifications list → in-app pop-up (rows in the app's `docs/qa/onboarding-matrix.md`); the delivery panel shows state, attempts and counts.
- [ ] An old `https://banatalk.com/moments/<id>` share link lands on `/moment/<id>`.

## 4. Code work — open

Web announcements (plan 2026-10-13)
- [x] Data layer: app-config `platform`/`lang` args, `webTargetFor` link mapping, dismissals storage, `useWebAnnouncements` hook.
- [x] Popup component + banner component (`AnnouncementModal` hero card, `AnnouncementBanner` floating card, `useAnnouncementActions`, 5 `announcements.*` strings in 18 locales); not yet mounted.
- [x] Mount in the app shell (`AnnouncementSurfaces`: every page except /admin, pop-up once per page load, takes turns with consent bar / download pop-up / sticky banner).
- [x] Route `/announcement/:id` if the link mapper's target needs a page.
- [x] Admin console: Web platform, Pop-up/Banner display style, notify switched off when the app can't be reached, website previews use the real components.
- [x] Final-review fixes: modal image reset + max-height, "Show in app and on website" label/preview, one banner per load, no pop-up/banner on auth routes or over its own page, page Back fallback, stale-id content.
- [ ] Localize any fixed strings; live QA against a deployed backend announcement (web-only + banner).

Announcements console
- [ ] "Retry delivery" button for an exhausted `failed` send — needs the backend endpoint first (backend file). S
- [ ] Server-side search + paging — needs backend support (today the console searches the newest 200 client-side). S
- [ ] Optional "Duplicate" / archive for ended rows — needs backend. S
- [ ] Drop or reword the editor's "language targeting can't reach 2.6.1" hint once 2.7.x is the majority build. S

Localization
- [ ] Admin announcement strings are English fallbacks (`t(...) || "..."`, incl. `admin.announcements.startPassed`); add the `admin.announcements.*` keys when the admin console is localized. M

Web/app parity (spec: app `docs/superpowers/specs/2026-10-16-web-app-parity-design.md`)
- [x] Baseline: 23 local commits squashed, tests restored (moments/stories/privacy audit fixes on top of origin/main; 4 suites' expectations updated for intended changes).
Phase 3 Chat (plan `bananatalk_app/docs/superpowers/plans/2026-10-16-web-app-parity-phase3.md`)
- [ ] P3-CHAT-1 Edit sends `{message}`, in an in-app dialog, with the failure shown (chat#1, chat#19)
- [ ] P3-CHAT-2 Delete sends body `{deleteForEveryone}`, asks in a dialog, and "deleted for everyone" leaves a placeholder (chat#2, chat#15, chat#19)
- [ ] P3-CHAT-3 Opening a chat never posts "Conversation started" (chat#3)
- [ ] P3-CHAT-4 Limit, paywall and block refusals open a dialog instead of a bare "Failed" (chat#4)
- [ ] P3-CHAT-5 A slow socket ack marks the bubble failed with Retry; no REST fallback, no duplicates (chat#5)
- [ ] P3-CHAT-6 Conversation list from `GET /conversations` only; typed previews; unread from the server (chat#10, chat#11, chat#19)
- [ ] P3-CHAT-7 Catch up after a reconnect; recover a kicked tab; refresh instead of logging out on `tokenExpired` (chat#12, chat#20)
- [ ] P3-CHAT-8 Videos go through `POST /messages/video` with the server's limits checked first (chat#16)
- [ ] P3-CHAT-9 Voice recorder picks a type the browser supports (AAC first), names the file to match, and sends a waveform (chat#13)
- [ ] P3-CHAT-10 App call-history messages render as a call card, not "File" (chat#6)
- [ ] P3-CHAT-11 Location messages render as a map card, and the web can send one (chat#7, chat#17)
- [ ] P3-CHAT-12 Waves are a greeting card, only 1–3 emoji are sticker-sized, and a bare-id sender lands on the right side (chat#8)
- [ ] P3-CHAT-13 Story shares, replies and reactions keep their story (chat#9)
- [ ] P3-CHAT-14 Live pins, the "edited" label, the "Forwarded" chip and every correction (chat#14)
- [ ] P3-CHAT-15 The app's six premium wallpapers render on web (chat#18)
- [ ] P3-CHAT-16 Search the messages of a conversation (chat#17)
- [ ] P3-CHAT-17 Saved (bookmarked) messages: list, open, unbookmark (chat#17)
- [ ] P3-CHAT-18 Archive / unarchive conversations, and mute for 1 hour, 8 hours, 1 week or always (chat#17)
- [ ] P3-CHAT-19 "You can't message this person" banner when either side blocked (chat#17)
- [ ] P3-CHAT-20 The chat's remaining hard-coded English goes through `t()` (chat#19)
- [ ] P3-CHAT-I18N New chat strings in all 18 locales
- [ ] P3-CHAT-PUSH Push unit chat (suite + build green, deployed, production smoke recorded)

Phase 3 Moments (plan `bananatalk_app/docs/superpowers/plans/2026-10-16-web-app-parity-phase3.md`)
- [ ] P3-MOM-1 Post and save photo-, video- or voice-only moments (moments#4)
- [ ] P3-MOM-2 The app's 20 moment gradients, same colours (moments#5)
- [ ] P3-MOM-3 Remove the Title field from the composer (moments#6)
- [ ] P3-MOM-4 The moment's owner can delete other people's comments (moments#9)
- [ ] P3-MOM-5 Report a comment, and block an author from a moment or a comment (moments#10, moment/comment part)
- [ ] P3-MOM-6 Saved moments load every page and draw every kind of moment (moments#11)
- [ ] P3-MOM-7 Feed cards show mood, tags and location (moments#22)
- [ ] P3-MOM-8 Comments with a GIF, a photo and no text, and mentions drawn (moments#21)
- [ ] P3-MOM-9 Leftovers: `uploadMomentPhotos` typing, no `mediaType: "text"`, dead `reportMoment` (moments#23)
- [ ] P3-MOM-10 Moment voice notes record `audio/mp4` where the browser can (moments#2)
- [ ] P3-MOM-11 Moments text in every language: Saved Moments keys and hard-coded English (moments#24)
- [ ] P3-MOM-12 a story carries one picture (moments#16)
- [ ] P3-MOM-13 the story viewer shows the story's location (moments#17)
- [ ] P3-MOM-14 report a story and block its author from the viewer (moments#10, story part)
- [ ] P3-MOM-15 text-story font style and overlay faces match the app (moments#25)
- [ ] P3-MOM-16 solid and semi plates match the app (moments#25)
- [ ] P3-MOM-17 overlays honour rotation; centring stays exact; mention pills look like the app's (moments#25)
- [ ] P3-MOM-18 the viewer shows a story's hashtags (moments#25)
- [ ] P3-MOM-19 the viewer honours `allowReplies` and `allowSharing` (moments#25)
- [ ] P3-MOM-20 the link sticker always shows the real host under its label (moments#25)
- [ ] P3-MOM-I18N New moments strings in all 18 locales
- [ ] P3-MOM-PUSH Push unit moments (suite + build green, deployed, production smoke recorded)

Phase 3 Community (plan `bananatalk_app/docs/superpowers/plans/2026-10-16-web-app-parity-phase3.md`)
- [ ] P3-COM-1 Nearby works — real params, real fields, real profile route, privacy toggles (community#2)
- [ ] P3-COM-2 @username search uses the `/auth/users` routes (community#3)
- [ ] P3-COM-3 Language filter offers the whole catalog, labelled in the reader's language (community#4)
- [ ] P3-COM-4 Waves inbox — archive, reveal, loadable avatars, a real "Find people" route (community#10)
- [ ] P3-COM-5 Wave cap answers with a VIP dialog, not a raw English toast (community#8)
- [ ] P3-COM-6 "Serious learners" segment tab (`activeWithin=7d`) (community#9)
- [ ] P3-COM-7 Smart sort by default when the server offers it; reciprocal ("perfect partners") filter (community#9)
- [ ] P3-COM-8 "More members like X" asks for people who speak X's language (community#11)
- [ ] P3-COM-9 Today marks a card "Waved" after a wave (community#14)
- [ ] P3-COM-10 Delete the dead community endpoints and wave shims (community#12)
- [ ] P3-COM-11 Profile counts from `followersCount` for signed-out visitors; story ring from `hasActiveStory` (community#6, links#11)
- [ ] P3-COM-12 Blocked viewers see a neutral card; follow refused by a block says so (community#5)
- [ ] P3-COM-13 Community copy through `t()`, and a test that every key exists (community#13)
- [ ] P3-COM-I18N New community strings in all 18 locales
- [ ] P3-COM-PUSH Push unit community (suite + build green, deployed, production smoke recorded)

Phase 3 Links (plan `bananatalk_app/docs/superpowers/plans/2026-10-16-web-app-parity-phase3.md`)
- [x] P3-LINK-1 Crawler rule sends link-preview bots to the backend OG cards (links#4, links#17, moments#13)
- [x] P3-LINK-2 AASA stops claiming `/chat/*` and web-only pages (links#6, links#15)
- [x] P3-LINK-3 Smart banner and app banner open the page being viewed (links#16)
- [x] P3-LINK-4 `/story/:id` page — the target of story share links (links#1, moments#1)
- [ ] P3-LINK-5 Google sign-in reads the one-time `code` (links#12)
- [ ] P3-LINK-6 Legal pages link to https://banatalk.com (links#19)
- [ ] P3-LINK-7 Chat story cards open `/story/:id` (chat#9 follow-up, links#1)
- [ ] P3-LINK-I18N New links strings in all 18 locales
- [ ] P3-LINK-PUSH Push unit links (suite + build green, deployed, production smoke recorded)
- [ ] Backend follow-up: an OG type for `story` (`/og/story/:id` returns the generic card today; the nginx rule already routes it). S
- [ ] Phase 4 Reels: feed, viewer, create (video <=180 s, `isReel`), like/comment/share. M
- [ ] Phase 4 Gatherings/clubs: browse, detail, join/leave, host create/edit, host decisions. M
- [ ] Phase 4 Voice rooms: list, listen, request/take speaker, host controls (`livekit-client`). L
- [ ] Phase 4 Calls: 1:1 voice/video via LiveKit + `/calls/*` signalling, incoming ring while a tab is open, controls, history + missed calls. L
- [ ] Phase 4 Language rooms (`routes/rooms.js`) + community City and Genders tabs. M
- [ ] Phase 4 Sign in with Apple (Apple JS; backend verify, Phase 1 item 7). S
- [ ] Bundle budget: `npm run test:budget` fails -- first-paint 331.0 KB vs 326 KB budget (origin/main a944011 was already 329.2 KB). Not run by the deploy workflow. S

## 5. Decided / won't fix

- Audit M2: the client keeps the start < end rule on publish (the backend rejects `endsAt <= startsAt` and publish saves first); the message says to fix start or end.
- PUT on a LIVE announcement sends only translations text, `endsAt`, priority; ended rows are read-only.

## 6. Done (changelog)

- 2026-10-13 — Deployed 2ce0c93. Audit fixes: Publish-now/end rule (5e38c55, eacb9bc); scheduled-row Save re-confirms pushes with a fresh audience count, cancel reverts with one PUT; publish bar re-arms on `updatedAt`; Schedule confirm re-checks the start; image input cleared (688256b); "Stopped at end time" (5f9b4fe) and "Ended by admin" (0a75989) delivery display; `/moments/:id` redirect (83fe482). Backend `startsAt` guard landed in backend 72c2c9e.
- 2026-10-12 — Merges 906efa1 + 1cd9f44: announcements console W1–W5 (list + nav, editor with per-language text and preview, publish/schedule/end with audience confirm), delivery state + attempts + error, client search, priority column, empty states, draft delete, 2.6.1 language hint.
