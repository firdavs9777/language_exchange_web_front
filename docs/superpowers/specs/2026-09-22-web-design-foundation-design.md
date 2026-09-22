# Web Design Foundation — Design

**Date:** 2026-09-22
**Status:** approved, ready for implementation planning
**Goal:** give the web the app's visual vocabulary — as Tailwind tokens and a small set
of shared primitives — so that Community, Moments, Profile and Notifications each
consume tested pieces instead of re-inventing them.

**Scope:** web-only. No backend change, no API change, no new field on any model.
No user-visible surface is redesigned here; this spec produces the tokens and
components that the four surface specs will consume.

---

## 1. Where this came from

The instruction was "match web with our app". Reading both codebases, that is not one
project — it is six, and they have a dependency order:

| # | Sub-project | Kind |
|---|---|---|
| 1 | **Design foundation** (this spec) | tokens + shared primitives |
| 2 | Community | port |
| 3 | Moments | port |
| 4 | Profile | port |
| 5 | Notifications | build from scratch — the web has no bell, no history, no deep-link routing |
| 6 | AI Study / VIP redirect + app-download banner | growth |

Foundation goes first for the same reason the app's own moments spec makes the shared
pill task one: *everything else builds on a tested widget*. The web has the identical
three-way duplication the app had, and building Community first would mean writing the
pill, then rewriting it twice.

Each sub-project gets its own spec, plan and implementation pass.

---

## 2. What is actually broken

### 2.1 There are no tokens

`tailwind.config.js` is `theme: { extend: {} }`. Every brand value is a literal at the
call site. `#00BFA5` is hardcoded in five places; elsewhere the same teal is spelled
`teal-500`, and `MainMoments.tsx` reaches for `from-blue-500 to-purple-600` — a palette
the app does not have.

The elevation is off by more than the colour is. The app's `AppShadows.sm` is
`0 1px 4px rgba(0,0,0,.04)`; the web reaches for Tailwind `shadow-lg`
(`0 10px 15px rgba(0,0,0,.1)`) on the equivalent surfaces. A shadow two and a half times
the offset at two and a half times the alpha is most of why the two products do not feel
related, and no amount of colour matching fixes it.

### 2.2 The avatar is written three times

- `MemberCard.tsx` — story ring, native-language flag overlay, online dot
- `ProfileHeader.tsx` — ring, online dot, initials fallback
- `SingleMoment.tsx:318` — a bare `<img>` with a hover border

Three implementations, three behaviours, three sets of bugs. Only one has an initials
fallback, so a user with no photo renders as a broken image in the moments feed.

### 2.3 The language pair is drawn three ways, and none of them show proficiency

`MemberCard` shows two flag emoji and an arrow. `LanguagesCard` shows two chunky bordered
boxes plus a purple `Award` chip. `MomentCardHeader` shows nothing at all. On a language
exchange product the exchange pair is the single most important fact about a person, and
the web currently makes three different weak claims about it.

### 2.4 The language-code map is wrong for most languages

`LANGUAGE_CODES` lives in `src/components/community/type.ts` — so Moments and Profile
cannot reach it without importing across feature folders — and it holds **ten** entries.
Everything else falls through `MemberCard.tsx:41`:

```ts
return LANGUAGE_CODES[language] || language.substring(0, 2).toLowerCase();
```

The backend catalog (`seeds/languages.js`) holds ~140 languages, so that fallback runs
constantly, and it is not a graceful degradation — it is wrong:

| Language | `substring(0,2)` | Correct (backend `utils/languageCodes.js`) |
|---|---|---|
| Persian | `pe` | `fa` |
| Chinese (Traditional) | `ch` | `zh` |
| Filipino | `fi` | `tl` — and `fi` **is Finnish**, a different language |

A wrong code means a wrong flag today, and a wrong pill tomorrow.

### 2.5 Two design systems are layered on top of each other

`src/index.tsx:7` loads a customised `bootstrap.custom.css` globally, `App.tsx` wraps the
app in a react-bootstrap `Container`, and 20 files import react-bootstrap components —
including `CommunityDetail.tsx` and four Profile subscreens. Bootstrap is not accidental
here; it is the web's original design system, and the app's tokens live in neither it nor
Tailwind.

---

## 3. Design

### 3.1 Tokens

`tailwind.config.js` gains a `theme.extend` ported verbatim from
`lib/core/theme/app_theme.dart`. Values, not approximations:

```js
colors: {
  teal:   { DEFAULT: '#00BFA5', light: '#5DF2D6', dark: '#008E76' },  // AppColors.primary
  banana: { DEFAULT: '#FFD54F', light: '#FFFF81', dark: '#C9A415' },  // AppColors.secondary
  surface:    { DEFAULT: '#FFFFFF', dark: '#1E1E1E' },
  canvas:     { DEFAULT: '#F8F9FA', dark: '#121212' },
  cardbg:     { DEFAULT: '#FFFFFF', dark: '#2C2C2C' },
},
borderRadius: { md: '12px', lg: '16px', xl: '20px', xxl: '24px' },   // AppRadius
boxShadow: {
  sm: '0 1px 4px rgba(0,0,0,0.04)',    // AppShadows.sm
  md: '0 2px 8px rgba(0,0,0,0.06)',    // AppShadows.md
  lg: '0 4px 16px rgba(0,0,0,0.08)',   // AppShadows.lg
  teal: '0 6px 16px rgba(0,191,165,0.30)',  // AppShadows.colored
},
```

Tailwind's own `shadow-sm/md/lg` are **overridden**, not supplemented. An additive
`shadow-app-sm` would leave `shadow-lg` meaning the wrong thing at 200 existing call
sites, and the goal is that reaching for the default produces the app's elevation.

`gray-50 … gray-900` are already Material's ramp in both systems and are left alone.
The purple `accent` (`#7C4DFF`) is ported but unused here; it exists so a later surface
that needs it does not invent a third purple.

**Not tokenised:** `AppSpacing`. Tailwind's 4px scale already matches it
(`AppSpacing.md = 12` = `p-3`), and a parallel spacing vocabulary would be a second way to
say the same thing.

### 3.2 `src/utils/languages.ts`

`LANGUAGE_CODES`, `LANGUAGE_FLAGS` and the code/flag helpers move out of
`components/community/type.ts` into `src/utils/languages.ts`, and the map is filled in
from the backend's own `utils/languageCodes.js` `NAME_TO_ISO` — the source of truth both
the API and the app already agree on. Lookups are case-insensitive, and variants are
stripped before lookup so `Chinese (Traditional)` resolves to `zh`.

```ts
displayCode(language: string): string   // 'Korean' -> 'KO', 'Chinese (Traditional)' -> 'ZH'
languageFlag(language: string): string  // unchanged behaviour, correct input
```

`displayCode` returns **uppercase ISO 639-1**, matching `LanguageCodes.displayCode` in the
app. The unknown case returns `''` rather than a guessed two-letter slice — §2.4 is a
correctness bug, and the fix is to stop guessing, not to guess better.

`components/community/type.ts` re-exports from the new module for one sub-project, so
Community's conversion is a single import change rather than a prerequisite.

### 3.3 `LanguageExchangePill`

The centrepiece. `KO ⇄ EN` in a teal pill, with proficiency dots on the learning side.

```
╭──────────────────────╮
│  KO  ⇄  EN  ● ● ○    │   teal/9% fill, radius round, teal-dark text
╰──────────────────────╯
```

```ts
interface LanguageExchangePillProps {
  nativeLanguage: string;
  learningLanguage: string;
  languageLevel?: string | null;
  dense?: boolean;   // smaller type + tighter padding, for the moment card header
}
```

Dot mapping, identical to `dotsForLevel` in the app:
`A1/A2 → ●○○`, `B1/B2 → ●●○`, `C1/C2 → ●●●`, **anything else, including `null` →
no dots rendered at all.**

That last rule is the whole point, and §6.2 explains why it is the common case and not an
edge case. Absent is not zero: three empty dots read as "beginner", a claim the data has
not made.

**ISO codes, not country flags.** The app rejected country flags deliberately — a Korean
speaker in Sydney is still `KO`, and English maps onto no single country. Flags remain on
the avatar corner, where they describe the person rather than the language.

No dots on the native side. They would be three-of-three for everybody, varying for
nobody, and in the app they cost ~20px that overflowed the moment header at 320pt.

### 3.4 `Avatar`

One implementation replacing the three in §2.2.

```ts
interface AvatarProps {
  src?: string;
  name: string;           // drives the initials fallback
  size?: 40 | 54 | 72 | 80;
  hasStory?: boolean;     // conic teal→banana ring
  isOnline?: boolean;     // green dot, bottom-right
  flag?: string;          // native-language flag, bottom-left
}
```

`hasStory` is an **explicit prop with no default truthiness**, because of §6.3: the
community list payload never carries the field, so Community passes `false` and Moments
passes the stamped value. A primitive that read `user.hasActiveStory` itself would carry
the current bug into all four surfaces.

Initials fallback is on the primitive, not the caller — it is the behaviour two of the
three current implementations forgot.

### 3.5 `SurfaceCard`

`rounded-xl bg-surface shadow-sm dark:bg-cardbg-dark dark:shadow-none`, with a `padding`
prop and an optional `interactive` flag adding hover elevation and an active press scale.
Deliberately the same treatment the app gives both the community partner row and the
moment card, so the two main browse surfaces stop looking like different products.

Dark mode drops the shadow rather than darkening it, matching
`boxShadow: context.isDarkMode ? [] : AppShadows.sm` in `community_card.dart`.

### 3.6 `Badge`

`<Badge tone="banana">VIP</Badge>` / `<Badge tone="teal">New</Badge>` — a round chip,
tonal fill at the app's alphas (banana 28%, teal 12%), dark-tone text. Replaces the
gradient-filled badges currently inlined in `MemberCard`.

### 3.7 `FollowButton`

An outlined teal pill that becomes an outlined neutral `Following` once followed, owning
the `useFollowUserMutation` / `useUnFollowUserMutation` pair, its pending state, and its
cache invalidation.

Today `CommunityDetail.tsx` is the only consumer; Community adds it to the partner row and
Moments adds it to the card header, so it will have three. Follow state is read **from the
RTK Query cache, never from local `setState`** — the app's spec calls out that two cards by
the same author will otherwise disagree after a tap, and a web feed has exactly the same
shape.

---

## 4. Bootstrap is frozen, not removed

Bootstrap stays loaded and the 20 files that use it keep working. The rule this spec
establishes is: **no new Bootstrap markup.** Each later sub-project converts the Bootstrap
files it touches — Community converts `CommunityDetail.tsx`, Profile converts
`UserFollowers`/`UserFollowing`/`UserVisitors`/`MyMoments` — and the dependency, the
global CSS import and the `App.tsx` `Container` are deleted by whichever sub-project
removes the last usage.

Removing it here would mean rewriting ~2,600 lines of markup before a single pixel matched
the app, with the tokens it was meant to validate still unproven.

---

## 5. Dark mode

`darkMode` stays at Tailwind's default `'media'`. The tokens define dark counterparts and
**every primitive in §3 ships its dark variants from birth**, so no primitive needs
retrofitting later.

The 25 existing files carrying `dark:` classes are **not** audited here. Dark mode is
currently half-on by accident — `LanguagesCard` has `dark:bg-gray-800/80` while
`MemberCard` has none, so on an OS-dark device one card flips and the one beside it stays
white. Each surface sub-project fixes its own files as it converts them. Auditing 25 files
now would be the widest part of the foundation and would delay Community for surfaces we
are about to rewrite anyway.

---

## 6. Backend facts this rests on

Verified in `language_exchange_backend_application`, not inferred from the web's types.

### 6.1 The data exists

`controllers/users.js:20` — `USER_LIST_FIELDS` ships `languageLevel`, `topics`,
`birth_year`, `createdAt`, `isOnline`, `lastActive` and `vipSubscription.isActive`. The
pill has real backing on the list payload, and so do the match tags Community will add.

### 6.2 `languageLevel` defaults to `null`

`models/User.js:744` — `enum: ['A1','A2','B1','B2','C1','C2', null], default: null`. Any
user who never set a level carries `null`, which makes §3.3's "render no dots" rule the
**common** path. Rendering three empty dots instead would mislabel most of the user base
as beginners.

### 6.3 `hasActiveStory` is not on the community payload

It is stamped in exactly one place — `controllers/moments.js:33` and `:45`, onto *moment
authors*, one lookup per page. The users controller never sets it, so
`communitySlice.ts:53` reads `undefined` and `MemberCard`'s story-ring branch has never
rendered. Hence the explicit prop in §3.4.

### 6.4 `responseRate` does not exist

It appears nowhere in the backend — no controller, model, lib, service or route. The
app's `community_model.dart:256` parses `json['responseRate']`, which is therefore always
`null`, so the app's own **`Replies fast` match tag can never fire in production.**

Consequence for us: Community must not port that tag. It is recorded here rather than in
the Community spec because it is a finding about the app, and the app team should be told.

---

## 7. Explicitly not in this spec

`MatchTags` (only Community renders it — building it now would be designing an API with no
consumer), the notification bell and unread badge (Notifications sub-project), shared empty
states and loading skeletons, the app-download banner, VIP and AI Study redirect gating,
and any change to routing, data fetching or the RTK Query slices beyond §3.7's use of the
existing follow mutations.

No existing surface is converted in this spec. `MemberCard`, `ProfileHeader`,
`SingleMoment` and `LanguagesCard` keep their current markup until their own sub-project
reaches them — otherwise "foundation" quietly becomes "rewrite Community".

---

## 8. Testing

Existing setup: `react-scripts test` (Jest) with `@testing-library/react`. Primitives live
beside their tests, matching `MemberCard.test.tsx` and `parts/*.test.tsx`.

- Unit: `displayCode` — `'Korean' → 'KO'`, `'Chinese (Traditional)' → 'ZH'`,
  `'Persian' → 'FA'` (the §2.4 regression), case-insensitivity, and unknown → `''`.
- Unit: the level→dots mapping, each CEFR band, plus `null`, `undefined`, `''` and an
  unrecognised string all yielding no dots.
- Component: `LanguageExchangePill` renders both codes and the right dot count; **asserts
  zero dot elements when the level is null** — the §6.2 guard.
- Component: `Avatar` renders initials when `src` is absent; renders the story ring only
  when `hasStory` is true; renders the online dot only when `isOnline` is true.
- Component: `FollowButton` shows `Following` from cached state, and two instances bound
  to the same user agree after one is clicked — the stale-state regression named in §3.7.
- Component: `Badge` and `SurfaceCard` render their tone/elevation classes.
- Config: a test asserting `shadow-sm` resolves to the app's `0 1px 4px rgba(0,0,0,0.04)`,
  so a future Tailwind upgrade cannot silently restore the default ramp.

No snapshot tests. They would lock in markup that four sub-projects are about to consume
and reshape.

---

## 9. Risks

- **Overriding `shadow-sm/md/lg` changes ~200 existing call sites at once.** That is the
  intent — but it lands everywhere on merge, including the Bootstrap-styled screens. The
  change is flattening (shadows get softer), so the failure mode is "looks flatter than
  before", not "looks broken". It should still be eyeballed on Chat and Learning, which
  no sub-project in this sequence touches.
- **Two primitives land with a single consumer each.** `SurfaceCard` and `Badge` are used
  by Community first and only proven when Moments and Profile arrive. If either API is
  wrong, it is wrong in one place and cheap to change; both are deliberately thin.
- **The language map is only as good as the backend's.** `NAME_TO_ISO` covers what prod
  data actually holds, but a language present in `seeds/languages.js` and absent from the
  map returns `''`. The pill must render the pair without a code rather than render
  nothing — a missing code must not blank the whole component.
- **Bootstrap and Tailwind both define `.container`.** Freezing Bootstrap means that
  collision persists for now. It already exists today and this spec does not worsen it,
  but the first sub-project to convert a Bootstrap file should confirm the
  `App.tsx` `Container` still lays out correctly once tokens change the type scale.
