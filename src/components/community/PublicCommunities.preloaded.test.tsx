import "@testing-library/jest-dom";
import React from "react";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { makeStore } from "../../store";
import { apiSlice } from "../../store/slices/apiSlice";
import { publicCommunitiesApiSlice } from "../../store/slices/publicCommunitiesSlice";
import PublicCommunities from "./PublicCommunities";

// The real hook here -- this suite is about the prerender -> hydration
// contract: scripts/prerender.js inlines the fetched store state as
// window.__BT_PRELOADED_STATE__, makeStore(preloadedState) picks it up, and
// the client's FIRST render must therefore already show the cards the static
// HTML contains. Anything less is a hydration mismatch.
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: () => "" }) }));

const PRERENDERED = [
  { id: "c1", name: "Korean Corner", description: "Daily Korean practice.", memberCount: 4120, languages: ["Korean"] },
];
const LIVE = [
  { id: "c1", name: "Korean Corner", description: "Daily Korean practice.", memberCount: 4130, languages: ["Korean"] },
  { id: "c2", name: "Cafe Lingua", description: "Two languages, one table.", memberCount: 87, languages: ["Spanish"] },
];

const json = (body: unknown) =>
  new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });

function preloadedWith(data: unknown) {
  return {
    [apiSlice.reducerPath]: {
      config: makeStore().getState()[apiSlice.reducerPath].config,
      queries: {
        "getPublicCommunities(undefined)": {
          status: "fulfilled",
          endpointName: "getPublicCommunities",
          requestId: "x",
          originalArgs: undefined,
          startedTimeStamp: 1,
          fulfilledTimeStamp: 2,
          data,
        },
      },
      mutations: {},
      provided: {},
      subscriptions: {},
    },
  };
}

let fetchMock: jest.Mock;
const realFetch = global.fetch;
beforeEach(() => {
  fetchMock = jest.fn().mockResolvedValue(json({ success: true, data: LIVE }));
  (global as any).fetch = fetchMock;
});
afterEach(() => {
  (global as any).fetch = realFetch;
});

// Guards the literal cache key above: preloading a key RTK Query does not
// write would silently test nothing.
it("uses the cache key RTK Query actually serializes", async () => {
  const store = makeStore();
  await store.dispatch(publicCommunitiesApiSlice.endpoints.getPublicCommunities.initiate());
  expect(Object.keys(store.getState()[apiSlice.reducerPath].queries)).toContain(
    "getPublicCommunities(undefined)"
  );
});

it("renders the prerendered cards on the first render, then refreshes them", async () => {
  const store = makeStore(preloadedWith(PRERENDERED));
  render(
    <Provider store={store}>
      <PublicCommunities />
    </Provider>
  );

  // First render: exactly what the static HTML contains.
  expect(screen.getAllByTestId("public-community-card")).toHaveLength(1);
  expect(screen.getByText("Korean Corner")).toBeInTheDocument();

  // ...and then the live list replaces it.
  expect(await screen.findByText("Cafe Lingua")).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
