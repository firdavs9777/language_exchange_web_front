/**
 * @jest-environment node
 */
import React from "react";
import { renderToString } from "react-dom/server";
import StickyAppBanner from "./StickyAppBanner";

// The sticky banner decides whether to show from the viewport, referrer and
// stored dismissals -- none of which exist at prerender time. It renders
// nothing on the server and decide after mount, so prerendered HTML and the
// first client render agree.
it("StickyAppBanner renders nothing without a DOM", () => {
  expect(renderToString(<StickyAppBanner />)).toBe("");
});
