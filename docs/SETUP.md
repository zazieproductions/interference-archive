# Setup & local development

Interference Archive is a static, dependency-free web page. There is nothing to
install and nothing to build.

## Prerequisites

- A modern browser (see [support](#browser-support)).
- Optional: Python 3 or Node.js, only to run a local static server.

## Get the code

```bash
git clone https://github.com/zazieproductions/interference-archive.git
cd interference-archive
```

## Run it

### Option A — open the file
Double-click `index.html`, or open it from the browser. This works, but some
browsers apply stricter rules to `file://` origins; a local server is more
faithful.

### Option B — local static server (recommended)

```bash
# Python 3 (built in on most systems)
python3 -m http.server 8000

# Node
npx serve .

# PHP
php -S localhost:8000
```

Then open **http://localhost:8000** and click the overlay to initialize. Audio
begins only after that click — this is the browser autoplay policy, not a bug.

## Editing

| To change… | Edit… |
| --- | --- |
| Layout / markup / UI text | `index.html` |
| CRT look, glow, glitch, fonts | `assets/css/styles.css` |
| Audio, rendering, state, capture | `assets/js/app.js` |

There is no watch/rebuild step — save and refresh. See
[COMPONENTS.md](COMPONENTS.md) for the DOM contract before renaming IDs, and the
[API reference](API_REFERENCE.md) for where behavior lives.

## Browser support

The piece relies on the Web Audio API, Canvas 2D, `requestAnimationFrame`, and
`Blob`/`toDataURL` downloads. It targets current evergreen browsers:

| Browser | Status |
| --- | --- |
| Chrome / Edge (Chromium) | ✅ Primary target |
| Firefox | ✅ Supported |
| Safari | ✅ Supported (`webkitAudioContext` fallback is handled) |
| Mobile browsers | ⚠️ Runs, but the layout targets desktop widths; audio behavior varies by device. |

## Troubleshooting

**No sound.**
- Make sure you clicked the initialize overlay — the `AudioContext` is created by
  that gesture.
- Check the mute toggle and the power state (`OFFLINE` ramps output to zero).
- Some OS/browser combos start the context suspended; interacting again resumes
  it.

**Nothing draws / blank canvas.**
- Confirm `assets/js/app.js` loaded (Network tab / console). If you opened via
  `file://` and it failed to load, use a local server.

**Fonts look wrong.**
- VT323 is loaded from Google Fonts via `@import` in `styles.css`. Offline, the
  page falls back to a monospace system font.

**Downloads don't fire.**
- The capture flow triggers two downloads (`.txt` then `.png`) in quick
  succession; some browsers prompt to allow multiple downloads. Allow them.

## Repository conventions

- No dependencies are committed; `package.json` is metadata only.
- Keep large generated artifacts out of Git.
- See [CONTRIBUTING.md](../CONTRIBUTING.md) for branch/PR workflow and
  [TESTING.md](TESTING.md) for the manual QA checklist to run before a PR.
