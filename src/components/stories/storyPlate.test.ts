import { overlayLuminance, overlayPlateClass } from "./storyOverlays";

describe("overlay luminance (Flutter Color.computeLuminance)", () => {
  it("matches the WCAG relative luminance at the ends and in between", () => {
    expect(overlayLuminance("#FFFFFF")).toBeCloseTo(1, 5);
    expect(overlayLuminance("#000000")).toBeCloseTo(0, 5);
    // The palette's red and yellow sit on opposite sides of 0.5.
    expect(overlayLuminance("#FF3B30")).toBeLessThan(0.5);
    expect(overlayLuminance("#FFCC00")).toBeGreaterThan(0.5);
  });

  it("treats an unreadable colour as the server default (white)", () => {
    expect(overlayLuminance("red")).toBeCloseTo(1, 5);
    expect(overlayLuminance("")).toBeCloseTo(1, 5);
  });
});

describe("overlay plate (app viewer_overlay_layer)", () => {
  it("solid: black behind light text, white behind dark text", () => {
    expect(overlayPlateClass("solid", "#FFFFFF")).toContain("bg-black");
    expect(overlayPlateClass("solid", "#FFCC00")).toContain("bg-black");
    expect(overlayPlateClass("solid", "#000000")).toContain("bg-white");
    expect(overlayPlateClass("solid", "#FF3B30")).toContain("bg-white");
  });

  it("semi is black at half alpha; none is a shadow only; unknown is none", () => {
    expect(overlayPlateClass("semi", "#FFFFFF")).toContain("bg-black/50");
    expect(overlayPlateClass("none", "#FFFFFF")).not.toMatch(/\bbg-/);
    expect(overlayPlateClass("weird", "#FFFFFF")).toBe(overlayPlateClass("none", "#FFFFFF"));
  });
});
