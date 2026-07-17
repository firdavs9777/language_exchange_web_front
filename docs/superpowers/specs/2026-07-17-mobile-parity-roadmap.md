# BananaTalk Web ↔ Mobile Feature-Parity Roadmap

**Date:** 2026-07-17
**Status:** Program roadmap (decomposition record). Each package below gets its own design spec → implementation plan → build cycle.

## Goal

Bring the **web frontend** (`/Users/firdavsmutalipov/Projects/BananaTalk/front`, React 18 + CRA + Redux Toolkit / RTK Query + socket.io + react-bootstrap) to feature parity with the **Flutter mobile app** (`bananatalk_app`) across Auth, Chat, Community/Moments, and Profile — plus an **app-link handoff layer** so web can bounce users into the native app for app-only actions.

The mobile app is the **source of truth**. Both talk to the same backend (`https://api.banatalk.com`, dev `http://localhost:5003`).

## Cross-cutting decisions

- **Voice Rooms:** NOT built on web. Web surfaces that rooms exist and **deep-links into the native app** to join. (No WebRTC on web.)
- **Coins:** web may **display** balance / VIP economy, but **all purchases redirect to the app**. No in-browser purchase (also required by store policy).
- **App handoff mechanism:** **Universal Links / App Links** — one smart link (e.g. `bananatalk.applink.com/...`) opens the app if installed, else falls back to App Store / Play Store. Requires `apple-app-site-association` + `assetlinks.json` served from the domain.
- **State/UX conventions:** follow existing web patterns — RTK Query endpoints in `src/store/slices/`, routes in `src/router/AppRouter.tsx`, components under `src/components/` with co-located SCSS, socket work through `src/components/chat/hooks/useSocket.ts`, i18n strings in `src/utils/locales/*.json`.

## Explicitly OUT of scope

- Apple Sign-In and Facebook **native** OAuth (mobile-only endpoints; web keeps Google OAuth).
- FCM push tokens, `ClientInfo`/device-metadata injection, biometric auth (native concerns).
- In-browser coin purchase and in-browser WebRTC voice rooms (both deep-link to app).

## Package 0 — App-Link Handoff Layer (foundational)

A reusable web→app handoff used by voice rooms, coin purchase, and any future app-only action.

- Universal/App-Link config: `apple-app-site-association` + `.well-known/assetlinks.json` on the web domain.
- A React `<OpenInApp>` component / hook that builds a smart link, attempts to open the app, and falls back to the correct store based on UA.
- An interstitial route (e.g. `/open` or the `applink` domain target) for deferred deep links.
- **Depends on:** native app registering the associated domains (mobile-side task, tracked but outside this repo).

## Package 1 — Auth hardening (FIRST)

Close the real auth gaps; skip platform-only items.

- `auth/accept-terms` flow + terms-acceptance screen (incl. post-OAuth prompt when profile incomplete).
- Registration parity: add **username**, **topics/interests**, and **location** collection to the multi-step signup.
- Error handling: **429 quota-exceeded → paywall/upgrade** routing; **403 account-suspended** detection + UI; typed error codes (code expired/invalid, account locked w/ countdown, rate-limited w/ retry-after, email-exists).
- `auth/logout-all` (logout all devices).
- Harden token refresh: single-flight refresh queue so concurrent 401s don't stampede.

## Package 2 — Chat interactions + rooms (largest)

Existing chat (conversations, messaging, typing, reactions, edit/delete, corrections socket, voice/video messages) stays; add the gaps.

- **Message features:** pinning (socket `messagePinned` + HTTP pin/unpin), bookmarks (HTTP + UI), reply/forward/threads, TTS playback (`GET /messages/:id/tts`), corrections HTTP (fetch/accept history — socket already works).
- **Conversation features:** themes/wallpaper (socket `themeChanged` + HTTP), custom per-conversation nicknames, archive/unarchive, quick replies.
- **Presence:** global/bulk presence (`bulkStatusUpdate`, `onlineUsers`, `presence:online/offline/bulk`) beyond the current per-open-chat listener.
- **Language Rooms:** group text channels — `room:join/leave/message/typing/presence`, room discovery + membership UI. (In scope, built on web.)
- **Voice Rooms:** discovery/list UI only → **deep-link to app** to join (uses Package 0). No WebRTC.

## Package 3 — Moments richness + Reels

- **Media:** video upload + player in moments; voice-note recording + waveform playback; text-only moments with gradient backgrounds.
- **Comment interactions:** comment likes, nested replies, emoji reactions on comments.
- **Moment interactions:** emoji reactions on moments (distinct from like), share tracking, prompt-of-day.
- **Metadata parity:** full category + mood option sets; scheduling UI.
- **Reels:** dedicated vertical video creation flow + reel feed. (In scope.)

## Package 4 — Profile + Community parity

- **Profile display:** language level (A1–C2), response rate, last active, online status, MBTI / blood type / topics on the view (currently edit-only), location; profile Moments tab; profile theme/wallpaper; location editing.
- **Search:** partial username search (endpoint exists, unwired).
- **Community discovery:** advanced filters (language level, search, sort; nearby radius/age/gender/online-only) and member-card fields (language level, response rate, last active, VIP badge).
- **Coins:** display balance / VIP economy; **purchase → deep-link to app** (uses Package 0).

## Build order

Package 1 (Auth) → Package 2 (Chat) → Package 3 (Moments) → Package 4 (Profile/Community). Package 0 (App-Link layer) is built just-in-time before it is first needed (early in Package 2 for voice-room handoff), or pulled earlier if convenient.

Each package will be brainstormed into its own detailed spec before implementation.
