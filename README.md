# Philomathia (φ)

A mobile-first film and book diary with an adaptive taste engine, grounded in both world and Georgian culture.

Live app: https://philomathia.lovable.app

## Features

- **Discover** – swipe through films and books on 2:3 cover cards. Every swipe updates your taste immediately; Undo reverses exactly one swipe.
- **Taste engine** – deterministic, explainable scoring (tags, creators, moods, novelty) with time decay, long/short-term blending, a bounded SQL queue and a diversity slot. Every recommendation shows a grounded reason.
- **Ask Phi** – describe what you're in the mood for; AI parses the intent (with a rule-based fallback) and SQL returns matching catalog titles.
- **Search** – fast indexed search across English and Georgian titles.
- **Library** – your liked, passed and logged titles, paginated 20 at a time.
- **Profile & Dashboard** – taste portrait, traits, progress stage, Georgian-content preference (Less / Balanced / More), taste reset, data deletion.
- **Where to watch and buy** – streaming services per region (Georgia first, then Turkey, Germany, UK, US fallback) and Tbilisi bookshop prices and stock for books.
- **Onboarding** – first-time users pick titles they know to seed their taste.
- **Letterboxd import** – bring your existing film diary.
- **Shop stock upload** – bookshops upload stock by CSV (ISBN-matched, validated, error export).
- **Admin import** – admin-only, resumable catalog imports from official APIs (TMDB, Google Books) with duplicate matching and coverage reports.
- **Accounts** – email sign-up with confirmation, login, forgot/reset password.
- **PWA** – installable on Android; offline fallback page; static-shell-only caching.
- **Responsive** – phones 360–430px, tablet layout from 768px, persistent left sidebar from 1024px.
- **Languages** – English interface with Georgian (ქართული) interface option and Georgian catalog data.

## Tech stack

- React 19, TypeScript, TanStack Start (SSR, server functions) on edge runtime
- Vite 7, Tailwind CSS v4 with semantic theme tokens
- Lovable Cloud backend: PostgreSQL with row-level security, SQL RPCs, triggers, auth
- Lovable AI Gateway for Ask Phi and trait enrichment
- TMDB API (films and streaming providers), Google Books API (optional)
- Vitest unit tests, Playwright browser tests

## Project structure

```
src/
  routes/             pages (file-based routing)
    _authenticated/   signed-in pages: discover, search, ask, library, profile,
                      dashboard, onboarding, item/$id, where-to-watch,
                      shops, shop-stock, admin-import
    login, signup, forgot-password, reset-password
  components/         shared UI (app shell, taste card, motion, posters)
  lib/                taste math, recommendations, strings, facets, images,
                      server functions (*.functions.ts, *.server.ts)
  integrations/       backend client (auto-generated)
  styles.css          theme tokens, layout and motion
public/               PWA manifest, icons, service worker, offline page
scripts/              browser test scripts
```

## Getting started

Requires Node.js 20+ (or Bun).

```sh
git clone <this-repository-url>
cd <repository-name>
npm install
npm run dev
```

The app runs at http://localhost:8080.

### Environment

The `.env` file provides the public backend connection values (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`). Server-side secrets such as `TMDB_API_KEY` and the optional Google Books key are stored as project secrets, never in the browser.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview the production build |
| `npm test` | Run unit tests (Vitest) |
| `npm run lint` | Lint |
| `npm run format` | Format with Prettier |

Browser test: `python3 scripts/starter-taste-card.browser.py` checks that a brand-new account sees the honest starter taste card.

## Security

- Row-level security on every table; roles live in a separate `user_roles` table.
- Admin and shop actions are checked on the server.
- Provider API keys are server-only secrets.
- The service worker never caches private pages, API data or images.

## Known limitations

- Shop prices are sample data until real bookshops upload stock.
- Streaming data lists services only, without prices; Georgia often has no listings, so nearby regions are shown.
- Confirmation emails use the default sender until a custom domain is connected.
- Slow-network startup speed and offline startup are not yet fully verified.
