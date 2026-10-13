# Remaining work — web

Last updated: 2026-10-13. Tick items off in the same commit that finishes them.

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

## 3. Production QA

- [ ] `curl https://banatalk.com/.well-known/assetlinks.json` returns the real fingerprints after step 1.
- [ ] First real announcement end-to-end: publish → push → notifications list → in-app pop-up (rows in the app's `docs/qa/onboarding-matrix.md`); the delivery panel shows state, attempts and counts.
- [ ] An old `https://banatalk.com/moments/<id>` share link lands on `/moment/<id>`.

## 4. Code work — open

Announcements console
- [ ] "Retry delivery" button for an exhausted `failed` send — needs the backend endpoint first (backend file). S
- [ ] Server-side search + paging — needs backend support (today the console searches the newest 200 client-side). S
- [ ] Optional "Duplicate" / archive for ended rows — needs backend. S
- [ ] Drop or reword the editor's "language targeting can't reach 2.6.1" hint once 2.7.x is the majority build. S

Localization
- [ ] Admin announcement strings are English fallbacks (`t(...) || "..."`, incl. `admin.announcements.startPassed`); add the `admin.announcements.*` keys when the admin console is localized. M

## 5. Decided / won't fix

- Audit M2: the client keeps the start < end rule on publish (the backend rejects `endsAt <= startsAt` and publish saves first); the message says to fix start or end.
- PUT on a LIVE announcement sends only translations text, `endsAt`, priority; ended rows are read-only.

## 6. Done (changelog)

- 2026-10-13 — Deployed 2ce0c93. Audit fixes: Publish-now/end rule (5e38c55, eacb9bc); scheduled-row Save re-confirms pushes with a fresh audience count, cancel reverts with one PUT; publish bar re-arms on `updatedAt`; Schedule confirm re-checks the start; image input cleared (688256b); "Stopped at end time" (5f9b4fe) and "Ended by admin" (0a75989) delivery display; `/moments/:id` redirect (83fe482). Backend `startsAt` guard landed in backend 72c2c9e.
- 2026-10-12 — Merges 906efa1 + 1cd9f44: announcements console W1–W5 (list + nav, editor with per-language text and preview, publish/schedule/end with audience confirm), delivery state + attempts + error, client search, priority column, empty states, draft delete, 2.6.1 language hint.
