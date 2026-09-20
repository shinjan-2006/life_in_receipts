# Your Life, In Receipts

A frontend-only data story built from three exports (Spotify history, a handwritten household ledger, card swipes).
No server: all analysis happens in the browser from static JSON in `src/data/`.

## Run it
```
npm install
npm run dev            # local dev server
npm run build          # multi-file build in dist/  (Vercel, Netlify, GitHub Pages: point at dist/)
npm run build:single   # one self-contained HTML file in dist-single/index.html
```

## Rebuild the data (optional)
The JSON in `src/data/` is already generated. To regenerate it, unzip the three archives into
`raw/a`, `raw/b`, `raw/c` (Spotify, ledger, cards) and run `npm run data` (needs Python with pandas, numpy, scipy).

## Layout
- `scripts/build_data.py`  cleaning, dedupe, packing, and the analysis (rituals, routes, day-level "rhymes", correlations)
- `src/store.js`          decodes the packed data and builds day indexes
- `src/chapters.js`       chapter copy, written from computed facts so numbers never drift
- `src/components/`       Hero, Story (scroll-driven zoom), Patterns, Rhymes, Days, Drawer, About
