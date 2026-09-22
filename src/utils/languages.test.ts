import { displayCode, stripVariant, toBaseIso6391 } from "./languages";

it("strips a trailing regional parenthetical", () => {
  expect(stripVariant("Chinese (Traditional)")).toBe("Chinese");
  expect(stripVariant("Portuguese (Brazil)")).toBe("Portuguese");
  expect(stripVariant("Haitian Creole")).toBe("Haitian Creole");
});

it("maps names through the app's table", () => {
  expect(displayCode("Korean")).toBe("KO");
  expect(displayCode("English")).toBe("EN");
  expect(displayCode("Chinese (Traditional)")).toBe("ZH");
  expect(displayCode("korean")).toBe("KO");
});

// Deliberate parity quirks -- see the spec, section 3.2.1. The app's own
// doc comment claims "ISO-style, not country-style" and then returns JP for
// Japanese and YUE for Cantonese. The web mirrors that so the two products
// never disagree about the same person. If the app is fixed, these fail by
// design and must be updated in step.
it("reproduces the app's non-ISO codes exactly", () => {
  expect(displayCode("Japanese")).toBe("JP");
  expect(displayCode("Cantonese")).toBe("YUE");
});

it("falls through to a two-letter slice for unmapped names, as the app does", () => {
  expect(displayCode("Persian")).toBe("PE");
});

it("resolves three-letter bases before the two-letter check", () => {
  // Without the fil -> tl branch this returns "FI" -- Finnish, a different
  // language. That is the exact bug this module exists to end.
  expect(displayCode("fil")).toBe("TL");
  expect(displayCode("prs")).toBe("FA");
  expect(displayCode("Filipino")).toBe("TL");
});

it("returns an empty string for empty input", () => {
  expect(displayCode("")).toBe("");
  expect(displayCode("   ")).toBe("");
});

it("resolves untaggable codes to nothing rather than guessing", () => {
  expect(toBaseIso6391("ase")).toBeNull();
  expect(toBaseIso6391("haw")).toBeNull();
  expect(toBaseIso6391("pt-BR")).toBe("pt");
  expect(toBaseIso6391("en")).toBe("en");
  expect(toBaseIso6391("persian")).toBeNull();
});
