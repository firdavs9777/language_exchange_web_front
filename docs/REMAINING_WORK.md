# Remaining work — web

Last updated: 2026-10-13. Tick items off in the same commit that finishes them.
The full owner/launch checklist lives in the app repo: `bananatalk_app/docs/REMAINING_WORK.md`.

## Admin announcements (2026-10-12) — plan bananatalk_app/docs/superpowers/plans/parts/10-ops-backend-web.md
- [x] W1 slice endpoints
- [x] W2 form rules (buttonUrl mirrors backend: https://host or bananatalk:// only)
- [x] W3 list page + nav
- [x] W4 editor (route announcements/:id, "new" creates)
- [x] W5 publish/schedule/end with audience confirm (editor also: keyed by id, reseed only when clean, in-flight guards, Save disabled during upload)
- [x] W5 fix round 1: bar survives the first fetch of a just-created id; bar disabled until status refetches after publish/end
- [x] Usable only after the backend announcements deploy (B1–B11) _(backend deployed 2026-10-12, 8bad823)_
- [x] W4 note: PUT on a LIVE announcement sends only translations text, endsAt, priority (`toInput(form, liveOnly)`); ended rows are read-only
- [x] List page: show delivery state + attempts + error so an exhausted `failed` delivery (3 attempts) is visible (backend REMAINING_WORK item) _(list cell + editor "Push delivery" panel, 2026-10-12 gap audit)_
- [x] Gap audit 2026-10-12: client-side search (`?q=`, any locale's title/body), priority column, per-status and no-match empty states, retry on the list error, "Delete draft" with confirm (DELETE is draft-only), editor hint that language targeting can't reach live 2.6.1 users
- [ ] Needs backend: manual "Retry delivery" for an exhausted `failed` send. No endpoint exists (only the minute job retries, max 3 attempts, while live); add e.g. `POST /admin/announcements/:id/retry-delivery` (reset attempts, state `queued`, audited), then a button in the delivery panel
- [ ] Needs backend: server-side search and paging. `GET /admin/announcements` takes only `?status=` and returns the newest 200, so the console's search only covers those rows
- [ ] Needs backend (optional): "Duplicate" / archive. Ended rows can't be edited or deleted and there is no archive state; re-running an ended announcement means creating a new one by hand
- [ ] Owner: the language-targeting hint in the editor goes stale once the new app is the majority; drop or reword it then (backend item "Admin editor could say that language targeting can't reach live 2.6.1 users" is done on the web side)
- [ ] Owner: first real announcement end-to-end (publish -> push -> notifications list -> in-app pop-up); QA matrix lives in the app repo (docs/qa/onboarding-matrix.md)
- [ ] Announcement admin strings are English fallbacks (t(...) || "..."); add the admin.announcements.* keys when the admin console is localized

## Admin announcements audit 2026-10-13 (fix/audit-2026-10-13)
- [x] M2 won't fix: backend model rejects endsAt <= startsAt for non-ended rows and publish saves first, so the client rule stays; message now says to fix start or end before publishing
- [x] I1 Save on a scheduled row validates a future start; changing notify/platforms/languages/start with notify on goes through the Schedule confirm (fresh audience count); cancelling that confirm (or a failed count) reverts notify/platforms/languages/start with one PUT
- [x] M1 publish bar re-arms when the refetched row's updatedAt changes (re-schedule with the same start)
- [x] M3 confirm of a Schedule re-checks the start is still future; done message follows the returned status
- [x] M4 image input cleared after an upload attempt (same file can be re-picked)
- [x] Delivery panel/list show "Stopped at end time — sent to N of M" for done + delivery.stoppedReason 'end_time' (missing field = plain Sent); 'admin_end' reads "Ended by admin — sent to N of M"
- [x] Backend guard: a scheduled row's startsAt can't be PUT to now-or-earlier (backend 72c2c9e, 400); an unchanged start still saves
- [ ] Owner: new strings added as English fallbacks (admin.announcements.startPassed)
- [ ] Not yet deployed
- [x] Old shared `/moments/<id>` links redirect (replace) to `/moment/<id>`; `/moments` and `/moments/saved` unchanged
