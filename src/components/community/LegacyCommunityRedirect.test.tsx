import "@testing-library/jest-dom";
import React from "react";
import { render, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import LegacyCommunityRedirect from "./LegacyCommunityRedirect";

/**
 * Final review (2026-10-31): the old City / Genders / Topics links went to a
 * bare /communities -- which opens on Matches for anyone with Today on -- and
 * dropped the city search and the topic they carried.
 */
const land = async (from: string, add?: Record<string, string>) => {
  const router = createMemoryRouter(
    [
      { path: "/old", element: <LegacyCommunityRedirect add={add} /> },
      { path: "/communities", element: <div>list</div> },
    ],
    { initialEntries: [from] }
  );
  render(<RouterProvider router={router} />);
  await waitFor(() => expect(router.state.location.pathname).toBe("/communities"));
  return { params: new URLSearchParams(router.state.location.search), action: router.state.historyAction };
};

it("lands on Partners with the chip, replacing the old entry", async () => {
  const { params, action } = await land("/old", { city: "1" });
  expect(params.get("tab")).toBe("all");
  expect(params.get("city")).toBe("1");
  expect(action).toBe("REPLACE");
});

it("carries a city search over as the search box", async () => {
  const { params } = await land("/old?q=Seoul", { city: "1" });
  expect(params.get("q")).toBe("Seoul");
});

it("carries a topic over as the topic filter", async () => {
  const { params } = await land("/old?topic=music");
  expect(params.get("topics")).toBe("music");
});
