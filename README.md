# CS2 Strat-boka

Minimal Vite/React-app for IGL-er: velg kart, side, site og rundetype, få en rask call under freezetime, logg resultat etter runden.

## Kjør lokalt

```bash
npm install
npm run dev
```

Åpne adressen Vite viser i terminalen.

## Test produksjonsbygget

```bash
npm run build
npm run preview
```

Bygget ligger i `dist/`.

## Hosting (GitHub Pages)

Push til `main` deployer automatisk via GitHub Actions. Se [GITHUB-PAGES.md](./GITHUB-PAGES.md) for oppsett.

Data lagres i nettleserens `localStorage`. Det betyr at data er private for hver nettleser/enhet. Bruk eksport/import i appen for å flytte en bok mellom lagkamerater.
