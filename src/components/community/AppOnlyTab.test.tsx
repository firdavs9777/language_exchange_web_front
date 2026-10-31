import "@testing-library/jest-dom";
import React from "react";
import { render, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import AppOnlyTab from "./AppOnlyTab";

jest.mock("../../utils/webFlags", () => ({ useWebFlag: () => true }));
jest.mock("react-i18next", () => ({ useTranslation: () => ({ t: (k: string) => k }) }));

// Audit 2026-10-30: <Navigate> without `replace` trapped Back --
// /communities?tab=gatherings redirected forward again.
it("hands over to /gatherings by replacing the history entry", async () => {
  const router = createMemoryRouter(
    [
      { path: "/communities", element: <AppOnlyTab kind="gatherings" /> },
      { path: "/gatherings", element: <div>gatherings</div> },
    ],
    { initialEntries: ["/communities"] }
  );
  render(<RouterProvider router={router} />);
  await waitFor(() => expect(router.state.location.pathname).toBe("/gatherings"));
  expect(router.state.historyAction).toBe("REPLACE");
});
