// Pure: no import of the harness, so this module (and its test) never pulls
// the app in. The shape matches RenderedRoute's html/head fields.
export interface RenderedFragment {
  html: string;
  head: string;
}

// Shell tags the page's own head replaces. Everything else in the template
// head (charset, viewport, theme-color, manifest, icons, JSON-LD, fonts) stays.
const REPLACED_HEAD_TAGS: RegExp[] = [
  /<title>[\s\S]*?<\/title>\s*/i,
  /<meta name="description"[^>]*>\s*/gi,
  /<meta name="robots"[^>]*>\s*/gi,
  /<link rel="canonical"[^>]*>\s*/gi,
  /<meta property="og:[^"]*"[^>]*>\s*/gi,
  /<meta name="twitter:[^"]*"[^>]*>\s*/gi,
];

const ROOT = /<div id="root">\s*<\/div>/;

export function injectIntoTemplate(template: string, rendered: RenderedFragment): string {
  let doc = template;
  for (const re of REPLACED_HEAD_TAGS) doc = doc.replace(re, "");
  if (!ROOT.test(doc)) throw new Error('template has no empty <div id="root"></div> to fill');
  // Function replacers, not strings: rendered markup and meta copy contain
  // dollar signs (prices), and `$&` / `$'` in a string replacement would be
  // substituted rather than written out.
  doc = doc.replace("</head>", () => `${rendered.head}\n</head>`);
  return doc.replace(ROOT, () => `<div id="root">${rendered.html}</div>`);
}
