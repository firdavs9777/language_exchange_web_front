# Community main: member density and match legibility

**Date:** 2026-09-30
**Status:** Awaiting review
**Scope:** `MainCommunity`'s member grid and the match treatment on each card. Piece **A** of a four-part decomposition (see *Out of scope*).

---

## Why

Three complaints, selected from a list:

1. Cards are cramped — too many per row.
2. Matching isn't visible or prominent enough.
3. The whole page needs a visual rework.

Exploration showed the first two are **the same defect**. Matching is already
built and already wired: `MainCommunity.tsx:428` calls
`useGetRecommendationsQuery` against `/api/v1/matching/recommendations`, and
`matchReasons` are already rendered around each card (line 166). They are
simply destroyed by the grid.

`.community-grid` is `repeat(auto-fill, minmax(220px, 1fr))` with a 16px gap
inside an 1180px container. That resolves to **five columns at desktop width**,
so each card is ~220px: the name truncates, the two language chips crowd onto
one line, and the match reason clips after about three words.

So the work is not "add matching". It is: give the cards enough width that the
match data already in the payload can be read.

The third complaint (whole-page rework) is deliberately **not** in this spec.
See *Out of scope*.

## Intent

**What the user said:** show users, profile matching, "like tandem showing 3 or
4 users in one row", and optimise the community main UI.

**Decided during design, by the user:**
- **3 per row** at desktop width (chosen over the recommended 4).
- **Reason chips only, no score number** — the score still orders the list, it
  is not displayed.

**Assumption to flag:** 3-up shows roughly 6 members per screen instead of 10,
so discovery is slower per scroll. Accepted on the grounds that a ~380px card
can earn the space by making the reasons readable.

**Success:** at 1180px a member's name, both languages, and every match reason
returned are readable without truncation, and a card with no reasons still
looks deliberate.

## The data, as verified

`getMatchReasons` in `controllers/matching.js:475` is authoritative — line 229
overwrites the aggregation's projected `matchReasons` with its return value.
It draws from three independent buckets:

| Bucket | Possible values |
|---|---|
| Language | `Speaks {native}, learning {learning}` · `Native {native} speaker` · *nothing* |
| Activity | `Online now` · `Active today` · *nothing* |
| Location | `Same country` · *nothing* |

**Therefore `matchReasons.length` is 0–3, and 0 is reachable** — a candidate who
is not a language match, has not been active in 24 hours, and is in another
country returns an empty array. The card must handle that.

**Only the language bucket describes match quality.** The other two are
presence and location facts. Styling all three identically would make matching
*look* shallow, because the common card reads "Active today · Same country".

## Design

### Grid

```scss
.community-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));   // was auto-fill/minmax(220px)
  gap: 20px;                                          // was 16px
}
```

Fixed `repeat(3, ...)` rather than `auto-fill`, because `auto-fill` is what
produced five columns; the column count is now the design, not a consequence of
the container width. `minmax(0, 1fr)` rather than `1fr` so a long unbroken name
cannot force a column wider than its share.

Breakpoints, replacing the current three:

| Viewport | Columns | Reason |
|---|---|---|
| > 1024px | 3 | The chosen desktop density |
| 381–1024px | 2 | 3-up below ~1024px returns to ~300px cards and re-clips |
| ≤ 380px | 1 | Two columns on a 380px phone gives ~170px cards |

This replaces today's three rules (900px, 640px, 380px) with two. The existing
`@media (max-width: 380px)` rule already forces two columns; it becomes one.

### Card anatomy

Existing `MemberCard` structure is kept. What changes is what fits:

- **Photo** — `.tandem-member-card__picture`, currently `aspect-ratio: 1 / 1`,
  becomes 16:10 so a row of three is not dominated by portraits.
- **Name + age** — one line, no truncation at this width.
- **Languages** — the existing `LanguageFlagChip` pair, native → learning.
- **Reasons** — chips, wrapping to at most two lines.
- **Wave** — unchanged.

### Reason chips

Two tiers, because only one bucket is about compatibility:

- **Primary** — the language reason. Accent-coloured chip, first in order.
- **Secondary** — `Online now` / `Active today` / `Same country`. Muted chip,
  after the primary.

Ordering is by tier, not by the array's order, so a card always leads with its
strongest claim.

**Empty state (0 reasons):** render no chip row at all and no placeholder. The
card falls back to name + languages, which is what the "All members" tab shows
anyway. Explicitly *not* a "No reasons" chip — that advertises an absence.

**Overflow:** at most three chips can exist, so no truncation logic is needed.
This is a property of `getMatchReasons`, and the test below pins it so a fourth
bucket added server-side fails loudly here rather than wrapping silently.

### Where the changes live

| File | Change |
|---|---|
| `tandem/tandem-community.scss` | `.community-grid` columns and gap; the responsive rules; `.tandem-member-card__picture` to 16:10; the two chip tiers |
| `MemberCard.tsx` | Chip tiering, ordering and the empty-reason branch (the photo shape is entirely in the stylesheet) |
| `MainCommunity.tsx` | Only if the reason-rendering at line 166 needs to pass tier information down |

`MainCommunity.tsx` is 978 lines and wants splitting, but that is piece **D**
and not required for this change. Nothing here should grow it.

## Testing

Follows the existing community test patterns (`MemberCard.test.tsx`,
`communityStyling.test.ts`).

1. **Three columns at desktop** — assert the grid rule, the way
   `communityStyling.test.ts` already asserts stylesheet facts.
2. **A card with three reasons** renders three chips, language chip first.
3. **A card with only secondary reasons** (`Active today`, `Same country`)
   renders them, with no primary chip.
4. **A card with zero reasons** renders no chip row, and no placeholder text.
5. **Chip tiering** — the language reason carries the primary class, the other
   two the muted class.
6. **Existing suites stay green**, particularly `communityPerf.test.tsx` and
   `communityStyling.test.ts`.

Design-system constraints the repo already enforces and this must satisfy: no
hex colours in the stylesheet, tokens only, and a 40px minimum tap target for
the wave control.

## Out of scope

| | Piece | Why deferred |
|---|---|---|
| **B** | Whole-page visual rework — spacing, typography, filters, sub-nav | Should be scoped against the *improved* page; density may resolve most of it |
| **C** | Community **detail** page — image viewing and info legibility | A separate surface with its own flow |
| **D** | Splitting `MainCommunity.tsx` (978 lines) | Needed for B, not for this |

No backend change. `getMatchReasons` is correct as it stands; this spec only
changes how its output is displayed.
