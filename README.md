# Stamp Out War — Interactive Exhibition

An interactive, museum-style presentation of the [Stamp Out War](https://stampoutwar.com/)
project: annual edition halls, country vitrines with flippable maxicards
(front → handwritten back), a perforated stamp album, a "draw a card" surprise,
and a visitor passport that collects postmarks as you explore.

## Files

| File | Purpose |
|---|---|
| `exhibition.html` | The exhibition app (entry point) |
| `styles.css`, `app.js` | Styling and behaviour |
| `sheets/cards.csv` | **Source of truth** — one row per maxicard (open in Excel/Numbers) |
| `sheets/stamps.csv` | **Source of truth** — one row per stamp crop image |
| `build_manifest.py` | Reads the sheets → regenerates `data.js` + `metadata.json`, verifying every image |
| `data.js` | Generated manifest read by the app — do not edit by hand |
| `metadata.json` | Generated JSON mirror of the sheets — do not edit by hand |
| `export_to_csv.py` | One-off: rebuilds the sheets from `metadata.json` (only if you ever lose them) |
| `serve.py` | Tiny local web server |
| `media/` | Dove-sky hero video + QT Bengal fonts (mirrored from stampoutwar.com) |
| `images/<year>/{display,thumbs}/` | Maxicard scans (1400px / 480px) |
| `images/stamps/` | Stamp crops with postmarks |
| `index.html` | The previous single-page collection view (kept as-is) |
| `stamp-crop-tool.html`, `stamps-list.txt` | Stamp-cropping utility and its notes |

## Run locally

```sh
python3 serve.py
# then open http://localhost:8642/exhibition.html
```

## Editing the data (the two sheets)

All content lives in two CSV files you can open in Excel, Numbers or Google
Sheets. After editing either one, run `python3 build_manifest.py` to refresh
the site. The build **fails loudly** and names the offending row if any
filename is wrong, so the site never ships a broken image.

**`sheets/cards.csv`** — one row per maxicard:

| column | meaning |
|---|---|
| `id` | unique card id, e.g. `Finland-01` |
| `year` | edition year (`2022`, `2023`, …) |
| `country`, `cc`, `continent` | display name, 2-letter code (drives the flag), continent |
| `town`, `participant` | postmark town + who had it cancelled (either may be blank) |
| `stamp`, `stamp_year`, `stamp_cat` | the stamp label shown on the card |
| `stamp_files` | crop filename(s) in `images/stamps/`, **separated by `;`** for multi-stamp cards |
| `front`, `back` | image file stems (without `.webp`) in `images/<year>/display` and `/thumbs` |

**`sheets/stamps.csv`** — one row per stamp crop image (the album):

| column | meaning |
|---|---|
| `file` | filename in `images/stamps/` |
| `year` | edition year the crop belongs to |
| `title`, `issue_year`, `catalogue` | how it appears in the Stamp Album |

### To add a card
1. Drop the front/back scans into `images/<year>/display/` and `/thumbs/`.
2. Add a row to `sheets/cards.csv`.
3. For any new stamp crop, drop it in `images/stamps/` and add a row to
   `sheets/stamps.csv`; put its filename in the card's `stamp_files`.
4. `python3 build_manifest.py`, then re-upload `data.js` (+ the new images).

A new edition year (e.g. `2025`, "The Sunday Rally") appears automatically once
its cards are in the sheet — the nav, halls, passport and album all pick it up.

## Embed in WordPress (stampoutwar.com/exhibition/)

The app uses a **Focus Mode (view-swap)** architecture: opening any shadow box
(card viewer, vitrine, stamp lightbox, passport, draw-a-card) hides the whole
exhibition and makes that box the page content itself. The document — and
therefore the iframe, which is continuously resized to the document height —
is always exactly as tall as what is on show. No fixed heights, no artificial
padding. Closing the box restores the exhibition and returns the visitor to
the row they clicked.

Use this in a Custom HTML block (the snippet resizes the iframe and performs
the scroll choreography):

```html
<iframe id="sow-exhibition" src="https://stampoutwar.github.io/exhibition/exhibition.html"
        width="100%" height="1600" style="border:none;display:block" scrolling="no"></iframe>
<script>
var sowFrame = document.getElementById("sow-exhibition");
window.addEventListener("message", function (e) {
  if (e.origin !== "https://stampoutwar.github.io" || !e.data) return;
  if (e.data.sowExhibitionHeight) sowFrame.style.height = e.data.sowExhibitionHeight + "px";
  if (e.data.sowExhibitionScrollTop) window.scrollTo(0, sowFrame.offsetTop);
  if (e.data.sowExhibitionScrollTo != null)
    window.scrollTo(0, sowFrame.offsetTop + e.data.sowExhibitionScrollTo);
});
</script>
```

> The `sowExhibitionScrollTo` line is what standardizes overlay position — make
> sure it is present in the WordPress embed after this update.

## Publish

It is a fully static site: upload `exhibition.html`, `styles.css`, `app.js`,
`data.js` and the `images/` folder to any static host (GitHub Pages, Netlify,
or a subfolder of stampoutwar.com). Rename `exhibition.html` to `index.html`
on the host if you want it at the root URL.
