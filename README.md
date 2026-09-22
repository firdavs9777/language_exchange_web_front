# BananaTalk web

React 18 + TypeScript (CRA `react-scripts` 5). Marketing site and web client for the BananaTalk language-exchange app at https://banatalk.com.

## Develop

```bash
npm install
npm start                                    # http://localhost:3000, API from .env (localhost:5003)
CI=true npx react-scripts test               # full suite; CI=true avoids watch mode
```

`npx tsc` does not work here: TypeScript is pinned at 3.7.2 and cannot parse some library types. The type check is the build.

## Build and deploy

```bash
npm run build      # react-scripts build, then scripts/prerender.js
npm run deploy     # build + `nginx -s reload` on the server
```

`scripts/prerender.js` renders every public route (`src/seo/pages.ts`) to `build/<route>/index.html` so crawlers see content, writes `build/404.html`, and generates `build/sitemap.xml`. It fails the build if a route throws, has no `<h1>`, or sets no title. Data fetches during prerender may fail; the page then renders its fallback and a warning is logged.

`npm run build:spa` skips the prerender (debugging only).

### nginx

Include `deploy/nginx.snippet.conf` in the server block that serves `build/`. It returns 404 status for the prerendered 404 page, 301s for four old URLs that have a successor, and 410 for the rest of the URLs the old sitemap advertised. Reload nginx after changing it.

### Environment

`.env.production` is read at build time (and by the prerender):

| Variable | Purpose |
|---|---|
| `REACT_APP_API_URL` | Backend origin, `https://api.banatalk.com` |
| `REACT_APP_GA_MEASUREMENT_ID` | GA4 id (`G-XXXXXXX`). Empty disables GA entirely. GA loads only after the visitor accepts the consent bar. |

### Search Console

After the first deploy with prerendering, submit `https://banatalk.com/sitemap.xml` in Google Search Console and request indexing of `/`. Search Console is the only source of the queries visitors actually used.

## Docs

Specs and plans live under `docs/superpowers/`.
