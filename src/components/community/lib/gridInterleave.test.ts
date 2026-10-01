import { carouselIndex, showsAdAfter, showsCarouselAfter } from "./gridInterleave";

const allTab = (total: number) => ({ total, isAllTab: true, hasHighlights: true });

describe("where the carousel goes", () => {
  it("sits after the sixth member on a full list", () => {
    expect(carouselIndex(allTab(20))).toBe(5);
  });

  it("sits after the last member when the list is shorter than six", () => {
    expect(carouselIndex(allTab(2))).toBe(1);
    expect(carouselIndex(allTab(1))).toBe(0);
  });

  it("does not appear on the lean tabs", () => {
    expect(carouselIndex({ total: 20, isAllTab: false, hasHighlights: true })).toBeNull();
  });

  it("does not appear when there is nothing to highlight", () => {
    expect(carouselIndex({ total: 20, isAllTab: true, hasHighlights: false })).toBeNull();
  });

  it("does not appear on an empty list", () => {
    expect(carouselIndex(allTab(0))).toBeNull();
  });

  it("renders exactly once, whatever the list length", () => {
    for (let total = 1; total <= 24; total += 1) {
      const hits = Array.from({ length: total }, (unused, i) =>
        showsCarouselAfter(i, allTab(total))
      ).filter(Boolean);
      expect(hits).toHaveLength(1);
    }
  });
});

describe("where the ads go", () => {
  it("falls every sixth member", () => {
    const ctx = { total: 30, isAllTab: false, hasHighlights: false };
    expect(showsAdAfter(5, ctx)).toBe(true);
    expect(showsAdAfter(11, ctx)).toBe(true);
    expect(showsAdAfter(17, ctx)).toBe(true);
    expect(showsAdAfter(4, ctx)).toBe(false);
  });

  it("never follows the last member", () => {
    expect(showsAdAfter(5, { total: 6, isAllTab: false, hasHighlights: false })).toBe(false);
  });

  it("yields the row to the carousel rather than stacking on it", () => {
    // The bug: on 7-10 members both wanted index 5, so two full-bleed blocks
    // rendered back to back. Dormant only because AdUnit returns null until
    // AdSense is configured for the slot.
    expect(showsCarouselAfter(5, allTab(8))).toBe(true);
    expect(showsAdAfter(5, allTab(8))).toBe(false);
  });

  it("still takes the row when the carousel is not there to want it", () => {
    // Online tab: no carousel, so the ad keeps its slot.
    expect(showsAdAfter(5, { total: 8, isAllTab: false, hasHighlights: true })).toBe(true);
  });

  it("keeps the later slots, which the carousel never contests", () => {
    expect(showsAdAfter(11, allTab(20))).toBe(true);
  });

  it("never puts an ad and the carousel on the same index, at any length", () => {
    for (let total = 1; total <= 40; total += 1) {
      for (let i = 0; i < total; i += 1) {
        const both = showsAdAfter(i, allTab(total)) && showsCarouselAfter(i, allTab(total));
        expect(both).toBe(false);
      }
    }
  });
});
