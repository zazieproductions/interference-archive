# Deployment

Interference Archive is a static site: "deploying" means publishing three files
(`index.html`, `assets/css/styles.css`, `assets/js/app.js`) plus the preview
image. There is no build step, no server runtime, and no environment
configuration.

## Primary: GitHub Pages

The live archive is served from GitHub Pages at
`https://zazieproductions.github.io/interference-archive/`.

### One-time setup
1. Repository → **Settings → Pages**.
2. **Source:** *Deploy from a branch*.
3. **Branch:** the default branch, folder `/ (root)`.
4. Save. Pages publishes the repo root as-is.

### Publishing changes
Because the root is served directly, publishing is just merging to the default
branch:

```bash
git add .
git commit -m "…"
git push origin <default-branch>
```

Pages redeploys automatically within a minute or two.

### Notes
- All asset paths are **relative** (`assets/...`), so the site works from the
  project subpath GitHub Pages uses — no base-href juggling required.
- The `<meta>` and Open Graph tags in `index.html` control link previews.

## Alternatives

Any static host works with zero configuration:

| Host | How |
| --- | --- |
| **Netlify** | Drag-and-drop the folder, or connect the repo; no build command, publish directory = root. |
| **Cloudflare Pages** | Connect repo; framework preset *None*, build command empty, output dir = root. |
| **Vercel** | Import repo as a static project; no build step. |
| **Any web server / CDN** | Copy the files to a public directory. |

## CDN dependencies

Two resources load at runtime from third-party CDNs:

- **Tailwind CSS** via `https://cdn.tailwindcss.com`
- **VT323** via Google Fonts (`@import` in `styles.css`)

They are not vendored. For maximum resilience/offline use (and to remove the
runtime dependency on those CDNs), a hardening step on the [roadmap](ROADMAP.md)
is to pin/self-host both. If you fork for an installation or kiosk context where
network access is unreliable, self-hosting these is strongly recommended.

## Verifying a deploy

After publishing, run the smoke portion of the [manual QA checklist](TESTING.md):
load the live URL, initialize, confirm audio + rendering, switch a site, and
capture a case file.
