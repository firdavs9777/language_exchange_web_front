import fs from "fs";
import path from "path";

// Community is the surface people spend the most time on, and the one most
// likely to be restyled. These are static guards, not render tests: they stop
// the design from leaking back into the component as inline styles, where no
// stylesheet, no theme and no hover state can reach it.

const tsx = fs.readFileSync(path.join(__dirname, "MainCommunity.tsx"), "utf8");
const scss = fs.readFileSync(path.join(__dirname, "tandem/tandem-community.scss"), "utf8");

it("keeps colours out of the component -- no hardcoded hex in an inline style", () => {
  const inlineStyles = tsx.match(/style=\{\{[\s\S]*?\}\}/g) || [];
  const withHex = inlineStyles.filter((s) => /#[0-9a-fA-F]{3,8}\b/.test(s));
  expect(withHex).toEqual([]);
});

it("styles the empty and error actions from the stylesheet", () => {
  expect(scss).toContain(".community-empty__action");
  expect(tsx).toContain("community-empty__action");
});

it("uses the shared type tokens rather than its own system font stack", () => {
  expect(scss).toContain("var(--bt-font-sans)");
  expect(scss).not.toContain("-apple-system, BlinkMacSystemFont");
});

it("still ships the class names the member list depends on", () => {
  for (const cls of [".community-page", ".community-empty", ".community-loadmore", ".tandem-member-card"]) {
    expect(scss).toContain(cls);
  }
});

// --- The member page --------------------------------------------------------
//
// /community/:id is the profile page now, and the blocks that made it one live
// in src/components/profile/parts. They are new code on the community surface,
// so they are held to the same rules as the list: design tokens only, lucide
// for every icon, nothing from react-bootstrap, and no colour or emoji baked
// into the markup where no theme can reach it.

const MEMBER_PAGE_FILES = [
  "../profile/ProfilePage.tsx",
  "../profile/parts/LanguageMatchCard.tsx",
  "../profile/parts/EngagementStats.tsx",
  "../profile/parts/MutualInterests.tsx",
  "../profile/parts/ConversationStarters.tsx",
  "../profile/parts/SuggestedMembers.tsx",
];

const memberPageSources: { name: string; source: string }[] = MEMBER_PAGE_FILES.map((rel) => ({
  name: rel,
  source: fs.readFileSync(path.join(__dirname, rel), "utf8"),
}));

// Emoji presentation blocks: pictographs, dingbats, symbols and the variation
// selector. Arrows and punctuation (em dash) are deliberately NOT in here --
// they are typography, not icons.
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u;

describe("the member page blocks", () => {
  memberPageSources.forEach(({ name, source }) => {
    it(`${name} carries no inline style attribute`, () => {
      expect(source.match(/style=\{\{/g) || []).toEqual([]);
    });

    it(`${name} names no colour by hex`, () => {
      expect(source.match(/#[0-9a-fA-F]{3,8}\b/g) || []).toEqual([]);
    });

    it(`${name} imports no react-bootstrap`, () => {
      expect(source).not.toContain("react-bootstrap");
    });

    it(`${name} draws its icons with lucide, not emoji`, () => {
      expect(EMOJI.test(source)).toBe(false);
    });
  });

  it("keeps the deleted detail page deleted", () => {
    expect(fs.existsSync(path.join(__dirname, "CommunityDetail.tsx"))).toBe(false);
    expect(fs.existsSync(path.join(__dirname, "CommunityDetail.css"))).toBe(false);
  });
});
