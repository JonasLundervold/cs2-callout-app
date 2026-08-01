# CS2 Playbook

Minimal Vite/React app for IGLs: pick map, side, site and round type, get a fast call during freeze time, log the result after the round.

English is the default language. Norwegian is available in the header. New installs come with a starter library pre-loaded; you can replace or extend it from Book → settings.

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints.

## Production build

```bash
npm run build
npm run preview
```

Output is in `dist/`.

## Hosting (GitHub Pages)

Push to `main` deploys automatically via GitHub Actions. See [GITHUB-PAGES.md](./GITHUB-PAGES.md).

## Lineups

Utility links use [CSNADES.gg](https://csnades.gg/) as the canonical source. See [LINEUPS.md](./LINEUPS.md) — also intended as context for Claude/ChatGPT when writing new strats.

Data is stored in the browser's `localStorage` (per device). Use export/import in the app to move a book between teammates.
