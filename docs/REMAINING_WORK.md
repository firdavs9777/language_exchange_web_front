# Remaining work — web

Last updated: 2026-10-12. Tick items off in the same commit that finishes them.
The full owner/launch checklist lives in the app repo: `bananatalk_app/docs/REMAINING_WORK.md`.

## Admin announcements (2026-10-12) — plan bananatalk_app/docs/superpowers/plans/parts/10-ops-backend-web.md
- [x] W1 slice endpoints
- [x] W2 form rules (buttonUrl mirrors backend: https://host or bananatalk:// only)
- [x] W3 list page + nav
- [x] W4 editor (route announcements/:id, "new" creates)
- [x] W5 publish/schedule/end with audience confirm (editor also: keyed by id, reseed only when clean, in-flight guards, Save disabled during upload)
- [ ] Usable only after the backend announcements deploy (B1–B11)
- [ ] W4 note: PUT on a LIVE announcement must send only translations text, endsAt, priority (backend 400s on anything else); ended rows are read-only
- [ ] Owner: first real announcement end-to-end (publish -> push -> notifications list -> in-app pop-up); QA matrix lives in the app repo (docs/qa/onboarding-matrix.md)
- [ ] Announcement admin strings are English fallbacks (t(...) || "..."); add the admin.announcements.* keys when the admin console is localized
