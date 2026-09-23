// The bootstrap-icons font, loaded on demand.
//
// It used to arrive two ways at once: a render-blocking <link> to jsdelivr in
// public/index.html and a bundled `import` in src/index.tsx. Both paid for
// ~2,000 glyphs and a webfont on the first paint of every prerendered
// marketing page, which uses none of them (the footer and navbar render
// lucide SVGs instead).
//
// Now only the authenticated chunks that still spell `bi-*` import this
// module. webpack keeps the stylesheet in each importing chunk's own CSS
// file, so the font is fetched the first time such a screen mounts and never
// for a visitor who only reads the public pages. Import it from a module that
// is reachable *only* behind React.lazy -- importing it from anything eager
// puts it straight back into the main bundle.
import "bootstrap-icons/font/bootstrap-icons.css";

export {};
