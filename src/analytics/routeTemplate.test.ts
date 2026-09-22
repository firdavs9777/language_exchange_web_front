import { routeTemplate } from "./routeTemplate";

it("replaces a param segment with its name", () => {
  expect(routeTemplate("/profile/abc123", { userId: "abc123" })).toBe("/profile/:userId");
});

it("replaces a param segment in the middle of the path", () => {
  expect(routeTemplate("/chat/c1/settings", { conversationId: "c1" })).toBe(
    "/chat/:conversationId/settings"
  );
});

it("leaves the root path alone", () => {
  expect(routeTemplate("/", {})).toBe("/");
});

it("leaves a static path with no params alone", () => {
  expect(routeTemplate("/download", {})).toBe("/download");
});

it("replaces every segment equal to a param value", () => {
  expect(routeTemplate("/moment/12/x/12", { id: "12" })).toBe("/moment/:id/x/:id");
});

it("ignores the splat param", () => {
  expect(routeTemplate("/a/b", { "*": "a/b" })).toBe("/a/b");
});
