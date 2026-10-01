/**
 * What goes between the members in the community grid.
 *
 * Two things interleave into the member list: a periodic ad, and — on the All
 * members tab — the highlighted-profiles carousel. Both are full-row items
 * (`grid-column: 1 / -1`), and both used to be decided inline in the middle of
 * `MainCommunity`'s render, where it was not obvious that they had landed on
 * the same index.
 *
 * They had. The ad fires every sixth member, i.e. index 5, 11, 17…; the
 * carousel was moved to index 5 because six is the first row boundary shared by
 * the grid's three, two and one column layouts. So on a result of 7–10 members
 * the two rendered back to back, two full-bleed blocks stacked after member
 * six. It went unnoticed because `AdUnit` renders nothing until AdSense is
 * configured for that slot — a config flag, not a deploy, would have revealed
 * it in production.
 *
 * Pure functions, so the rule is testable without rendering a grid whose ad
 * component deliberately returns null.
 */

export interface InterleaveContext {
  /** How many members are in the list. */
  total: number;
  /** The carousel belongs to the All members tab only. */
  isAllTab: boolean;
  /** It also needs something to show. */
  hasHighlights: boolean;
}

/** Every sixth member, which is where the ad wants to go. */
const AD_EVERY = 6;

/**
 * Where the carousel goes, or null when it does not render at all.
 *
 * After the sixth member normally. A list shorter than that never reaches
 * index 5, so it lands after the last member instead — otherwise a small
 * result set would lose the carousel entirely.
 */
export function carouselIndex(ctx: InterleaveContext): number | null {
  if (!ctx.isAllTab || !ctx.hasHighlights || ctx.total === 0) return null;
  return ctx.total < AD_EVERY ? ctx.total - 1 : AD_EVERY - 1;
}

/** Whether the carousel sits directly after the member at this index. */
export function showsCarouselAfter(index: number, ctx: InterleaveContext): boolean {
  return carouselIndex(ctx) === index;
}

/**
 * Whether an ad sits directly after the member at this index.
 *
 * Never after the last member — an ad at the foot of the list is the sentinel's
 * job, not the grid's. And never on the row the carousel already takes: two
 * full-row blocks in a column reads as a broken page, and the carousel is the
 * one the reader came for.
 */
export function showsAdAfter(index: number, ctx: InterleaveContext): boolean {
  if ((index + 1) % AD_EVERY !== 0) return false;
  if (index === ctx.total - 1) return false;
  return !showsCarouselAfter(index, ctx);
}
