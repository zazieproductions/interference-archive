# Testing strategy

Interference Archive is a real-time audiovisual application: its correctness is
mostly about *behavior over time* (a stable frame loop, smooth audio transitions,
correct state machines) rather than pure functions with return values. The
testing strategy reflects that reality honestly.

## Layers

| Layer | Tooling | What it covers |
| --- | --- | --- |
| **Static checks** | HTML validation, link checking (recommended CI, snippet below) | Malformed markup, broken doc links, dead relative paths. |
| **Manual QA matrix** | The checklist below | The interactive behavior that automation can't easily assert. |
| **Cross-browser smoke** | Chromium, Firefox, Safari | Audio init, rendering, capture/download across engines. |

## Why not unit tests today?

Nearly every function in `app.js` has side effects on the Web Audio graph, the
Canvas, or the DOM, and the meaningful assertions are perceptual (does the tail
sound smooth, does the field breathe with the sound). Unit tests over that
surface would mostly assert mocks. The pragmatic, honest position is: **static
checks in CI + a disciplined manual matrix now**, with a clear path to automation
(below) as pure logic is extracted.

## Path to automation

The parts that *are* worth unit-testing are the pure mappings. The plan:

1. Extract the parameter transfer functions (e.g. the cutoff/spread/feedback
   formulas in `updateAudioFromParams()`) into pure helpers.
2. Unit-test those helpers (input param → expected numeric target) with a small
   runner (Vitest/Jest) — no browser needed.
3. Add Playwright smoke tests: load the page, click initialize, assert the canvas
   is drawing (pixel delta between frames) and that capture produces a data URL.
4. Wire both into the CI workflow below.

## Recommended CI workflow

Add this as `.github/workflows/ci.yml` to run static checks on every push and
pull request (it is provided as a snippet rather than committed, so it can be
enabled with a single file add):

```yaml
name: CI

on:
  push:
    branches: ["**"]
  pull_request:
    branches: ["**"]

jobs:
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
          for f in index.html assets/css/styles.css assets/js/app.js README.md LICENSE; do
            test -f "$f" && echo "ok: $f" || (echo "MISSING: $f" && exit 1)
          done
```

## Manual QA checklist

Run this before opening a PR (see [CONTRIBUTING.md](../CONTRIBUTING.md)):

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
- [ ] Mute ramps to near-silence and back; Power ramps offline/online.

**Visuals**
- [ ] Oscilloscope tracks the waveform; spectrogram bars move with the spectrum.
- [ ] Particle field visibly responds to audio energy.
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
