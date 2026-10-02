# Testing strategy

Interference Archive is a real-time audiovisual application: its correctness is
mostly about *behavior over time* (a stable frame loop, smooth audio transitions,
correct state machines) rather than pure functions with return values. The
testing strategy reflects that reality honestly.

## Layers

| Layer | Tooling | What it covers |
| --- | --- | --- |
| **Static checks** | HTML validation, link checking (recommended CI, snippet below) | Malformed markup, broken doc links, dead relative paths. |
| **Browser smoke test** | Playwright (`tests/smoke.spec.js`, `npm test`) | Boot + audio graph construction, Spatial Residue transfer functions, parameter mappings, site presets, mute/power gating, capture/download. |
| **Manual QA matrix** | The checklist below | The interactive behavior that automation can't easily assert (does the tail *sound* smooth, does the field breathe with the sound). |
| **Cross-browser smoke** | Chromium, Firefox, Safari | Audio init, rendering, capture/download across engines. The automated suite currently runs Chromium only. |

## Why not unit tests?

Nearly every function in `app.js` has side effects on the Web Audio graph, the
Canvas, or the DOM, and the meaningful assertions are perceptual. Unit tests over
that surface would mostly assert mocks — so there are none. What *can* be
asserted honestly is behavior end-to-end in a real browser, and that is covered
by the committed Playwright smoke suite. The pragmatic position is now: **a
Playwright smoke suite + static checks in CI + a disciplined manual matrix**, with
unit tests reserved for pure logic if it is ever extracted (below).

## The Playwright smoke suite

```bash
npm install            # installs the dev-only @playwright/test dependency
npx playwright install chromium   # one-time browser download
npm test               # or: npm run test:headed
```

`tests/smoke.spec.js` is a port of the ad-hoc Chrome DevTools Protocol harness
used while building Spatial Residue. It is deliberately white-box in places:
`assets/js/app.js` is a single script scope, and `page.evaluate()` shares that
scope, so the tests read the live Web Audio nodes and render state directly
(`residueWetGain.gain.value`, `params`, `drawCanvas()`, …).

Covered (8 tests, ~22s single-worker):

- **Boot** — overlay click starts a running `AudioContext`, the full Spatial
  Residue node chain and stereo IR exist, the ring buffer fills, the dry signal
  reaches the analyser.
- **Residue audio** — a real slider click moves the wet gain, delay times and
  stereo pans along the documented transfer functions; the wet path carries
  measurable, decorrelated L/R signal; `updateParam(3, 0)` bypasses the stage
  without touching the dry signal.
- **Residue visuals** — path-count probe proves the 6-vs-1 ghost-stroke
  afterimage; 60 draws at `residue = 100` stay under the 4ms frame budget; the
  canvas keeps changing between frames.
- **Parameters** — all six sliders reach their audio targets and readouts.
- **Randomize** — button and `Cmd/Ctrl+K` reshuffle every parameter.
- **Sites** — presets, accent colors and site codes (`#site-2` → `C09`,
  `#site-4` → `NULL`).
- **Mute/power** — gating holds during slider moves and while `OFFLINE`
  (regression guards for the `masterGain` mapping).
- **Capture** — modal content, archive ID format, the `.txt` + `.png` download
  pair, the `/` shortcut and log clearing.

Every test also fails on any non-benign `pageerror` or `console.error`, so a
silent runtime exception cannot pass as green.

Robustness notes: navigation waits only for the `file://` commit and then
awaits explicit conditions (app.js executed, Tailwind stylesheet applied,
`AudioContext` running, dry signal at the analyser), each with a 15–30s bound —
a stalled CDN request fails fast instead of hanging the run. Audio-parameter
assertions poll the live nodes until they converge rather than sleeping a fixed
interval, so a slow machine or a briefly stalled audio clock cannot produce a
false failure.

## Path to automation

Step 3 is done — and the committed suite goes further than sketched (it asserts
live Web Audio node values, not just canvas pixels). What remains:

1. Extract the parameter transfer functions (e.g. the cutoff/spread/feedback
   formulas in `updateAudioFromParams()`) into pure helpers.
2. Unit-test those helpers (input param → expected numeric target) with a small
   runner (Vitest/Jest) — no browser needed.
3. ✅ Playwright smoke tests: load the page, click initialize, assert the canvas
   is drawing (pixel delta between frames) and that capture produces a data URL.
4. Wire the suite into the CI workflow below.

## Recommended CI workflow

Add this as `.github/workflows/ci.yml` to run the smoke suite and static checks
on every push and pull request (it is provided as a snippet rather than
committed, so it can be enabled with a single file add):

```yaml
name: CI

on:
  push:
    branches: ["**"]
  pull_request:
    branches: ["**"]

jobs:
  smoke:
    name: Playwright smoke
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - name: Install dev dependencies
        run: npm install
      - name: Install Playwright Chromium
        run: npx playwright install --with-deps chromium
      - name: Run smoke suite
        run: npm test

  static-checks:
    name: Static checks
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - name: Validate HTML
        run: npx --yes html-validate index.html
        continue-on-error: true
      - name: Check documentation links
        run: npx --yes markdown-link-check -q README.md CONTRIBUTING.md CHANGELOG.md SECURITY.md CODE_OF_CONDUCT.md
        continue-on-error: true
      - name: Verify project structure
        run: |
          set -e
          for f in index.html assets/css/styles.css assets/js/app.js tests/smoke.spec.js README.md LICENSE; do
            test -f "$f" && echo "ok: $f" || (echo "MISSING: $f" && exit 1)
          done
```

## Manual QA checklist

Run `npm test` first, then this manual matrix before opening a PR (see
[CONTRIBUTING.md](../CONTRIBUTING.md)). The smoke suite already asserts boot,
the residue audio/visual behavior, mute/power gating, and capture end-to-end —
what is left here is the perceptual and cross-browser judgment work:

**Boot**
- [ ] Page loads with the initialize overlay; a "WAITING FOR USER GESTURE" log
      line appears.
- [ ] Clicking initialize starts audio and the render loop with no console
      errors.

**Audio**
- [ ] Moving each slider changes the sound smoothly (no clicks/zippering).
- [ ] Cohesion/Voice audibly open and close the filter.
- [ ] Contamination blends the noise layer in and out.
- [ ] Decay lengthens/thickens the echo without runaway feedback.
- [ ] Spatial Residue: at `FLAT` the image is dry and centered; sliding toward
      `DIFFUSE` adds a soft stereo room tail and widens the taps — subtle, no
      wash, no runaway. The dry signal itself must not change character.
- [ ] Mute ramps to near-silence and back; Power ramps offline/online.
- [ ] Mute still holds near-silence while sliders are being moved, and moving a
      slider while `OFFLINE` must not bring the audio back.

**Visuals**
- [ ] Oscilloscope tracks the waveform; spectrogram bars move with the spectrum.
- [ ] Particle field visibly responds to audio energy.
- [ ] Spatial Residue: higher values leave a lingering, drifting afterimage of
      the trace and make the particle field wander; low values stay crisp.
- [ ] Switching sites recolors the visuals and updates labels.
- [ ] Frame rate stays smooth (see [PERFORMANCE.md](PERFORMANCE.md)).

**Sites & narrative**
- [ ] Each node applies its presets and distinct log vocabulary.
- [ ] Random logs and transient anomalies appear over time.

**Capture & export**
- [ ] Capture opens the modal with a snapshot, ID, classification, and report.
- [ ] Download saves both `.txt` and `.png` named by archive ID.
- [ ] Keyboard: `Cmd/Ctrl+K` randomizes; `/` captures.

**Cross-browser**
- [ ] Repeat boot + capture in Chromium, Firefox, and Safari.

## Reporting issues

File findings via the issue templates in `.github/ISSUE_TEMPLATE/`, including
browser/OS and repro steps.
