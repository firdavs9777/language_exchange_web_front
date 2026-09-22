import { injectIntoTemplate } from "./template";

const TEMPLATE = `<!doctype html><html><head>
<meta charset="utf-8"/>
<title>Shell Title</title>
<meta name="description" content="shell description"/>
<meta name="robots" content="index, follow"/>
<meta name="googlebot" content="index, follow"/>
<link rel="canonical" href="https://banatalk.com"/>
<meta property="og:title" content="shell og"/>
<meta property="og:locale:alternate" content="ko_KR"/>
<meta name="twitter:title" content="shell tw"/>
<meta name="theme-color" content="#14B8A6"/>
<script type="application/ld+json">{"@type":"Organization"}</script>
</head><body><div id="root"></div><script src="/static/js/main.js"></script></body></html>`;

const rendered = {
  html: "<div><h1>Hi</h1></div>",
  head: '<title data-rh="true">Page Title</title>\n<meta data-rh="true" name="description" content="page"/>',
};

it("replaces the shell's route-specific head tags with the page's", () => {
  const out = injectIntoTemplate(TEMPLATE, rendered);
  expect(out).toContain('<title data-rh="true">Page Title</title>');
  expect(out).not.toContain("Shell Title");
  expect(out).not.toContain("shell description");
  expect(out).not.toContain("shell og");
  expect(out).not.toContain("shell tw");
  expect(out).not.toContain("og:locale:alternate");
  expect(out).not.toContain('rel="canonical" href="https://banatalk.com"');
  // A crawler-specific directive outranks the generic robots tag, so the
  // shell's must go or the 404's noindex would be overridden.
  expect(out).not.toContain('name="googlebot"');
});

it("keeps tags that are not route-specific", () => {
  const out = injectIntoTemplate(TEMPLATE, rendered);
  expect(out).toContain('name="theme-color"');
  expect(out).toContain('"@type":"Organization"');
  expect(out).toContain('<script src="/static/js/main.js">');
});

it("fills the root and refuses a template without an empty root", () => {
  expect(injectIntoTemplate(TEMPLATE, rendered)).toContain('<div id="root"><div><h1>Hi</h1></div></div>');
  expect(() => injectIntoTemplate("<html><body></body></html>", rendered)).toThrow(/root/);
});
