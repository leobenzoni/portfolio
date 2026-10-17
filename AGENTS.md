# leobenzoni.com

Leo's personal site. A dump folder for the visual explorations and tools he makes. His main work is Designer HQ and he knows it; this site is for fun.

## The page
- The small details are the point, and every change keeps them working. The filename in the title is today's date, `img` + DDMMYY. Both zoom readouts are the live time. The middle traffic light flips dark mode, and every visit opens light. Close sends the window to a dock. The load splash tracks real bytes.
- The gallery on the right is a static masonry of images and video. Tiles do not open. Click-to-expand was built and cut; it lives on branch `gallery-expand`.

## Adding work

The common job: a new image or video in the gallery.

1. Optimise into `cms/` and keep the untouched original in `~/BENZO/cms-originals/`.
   - Image: long edge 2000px, JPEG at q88 or WebP, a few hundred KB.
   - Video: MP4, H.264 High, long edge 1280px, CRF 19, frame rate kept, audio stripped, `-movflags +faststart`. Around 3MB at most.
2. Refresh localhost. The new file sits first, because the gallery runs newest first.
3. On commit the pre-commit hook runs `node tools/cms.mjs`, which rewrites `cms/manifest.json` and stages `cms/`. A file keeps the date it was first listed with, so the order never reshuffles. To reorder, edit the dates in the manifest.

## Run and prove

- `node tools/serve.mjs`, then http://localhost:4317. It builds the manifest live, so a file dropped in `cms/` shows on refresh.
- Prove at three widths, light and dark: desktop above 1240px, stacked tablet at 1240px and below, phone at 640px and below.
- The notch, home bar and browser toolbars only show on Leo's real phone. When a change touches them, say so and ask him to check.

## Code

- No build step, no dependencies. `index.html`; `styles.css` with tokens and dark mode at the top; `script.js` as one IIFE with a section per comment banner; `assets/` for fonts and icons; `cms/` for the gallery.
- `.vercelignore` keeps `tools/`, `.githooks/` and these instruction files off the live site.
- Hooks once per clone: `git config core.hooksPath .githooks`.
- The body font, `assets/test-heldane-text-regular.woff2`, is a Klim trial file. A font change that ships needs a web licence.

## Ship

- Work happens on `retro-mac-ui`, in this folder. Production is `main`, checked out at `~/BENZO/DESIGN/PORTFOLIO/OLD PORTFOLIO`. Vercel deploys leobenzoni.com on every push to `main`; a push to `retro-mac-ui` gets a Vercel preview.
- Commit, merge and push only on his word. Then: commit on `retro-mac-ui`; in the `OLD PORTFOLIO` folder run `git merge --no-ff retro-mac-ui`; push both branches; open leobenzoni.com and check the change is live.
