# Contributing to Interference Archive

Contributions, experiments, and forks are welcome — whether that's a bug fix, a
new recovered node, an accessibility improvement, or a whole new rendering mode.
This guide covers the workflow, the conventions, and the quality gate.

## Ways to contribute

High-value areas (see the [roadmap](docs/ROADMAP.md) for the bigger picture):

- **Accessibility & keyboard navigation** — the single most impactful area right
  now. See [docs/ACCESSIBILITY.md](docs/ACCESSIBILITY.md).
- **Audio stability across browsers** — smoother transitions, edge cases.
- **New procedural transmission sites** — new entries in `sites[]`.
- **Additional Canvas rendering modes** — new visual states or effects.
- **MIDI or microphone input** — see the roadmap.
- **Performance improvements** — see [docs/PERFORMANCE.md](docs/PERFORMANCE.md).
- **Mobile layout refinements** — the console is desktop-first today.
- **Documentation** — clarity, corrections, examples.

## Getting set up

No installation or build. See [docs/SETUP.md](docs/SETUP.md):

```bash
git clone https://github.com/zazieproductions/interference-archive.git
cd interference-archive
python3 -m http.server 8000   # then open http://localhost:8000
```

## Workflow

1. **Fork** the repository.
2. **Create a focused branch** (`feat/mic-input`, `fix/safari-audio`,
   `docs/a11y`).
3. Make your change, keeping it scoped to one concern.
4. Run the project through a local static server and complete the
   [QA checklist](#quality-gate).
5. **Test in current Chromium, Firefox, and Safari.**
6. **Open a pull request** using the template — explain both the *technical* and
   the *experiential* change.

## Coding conventions

Because this is a deliberately dependency-free, single-file-per-concern project,
consistency matters more than tooling:

- **Where things live.** Markup → `index.html`; look → `assets/css/styles.css`;
  behavior → `assets/js/app.js`. See
  [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
- **Audio mappings** belong only in `updateAudioFromParams()` — the single source
  of truth for parameter → sound. See
  [docs/AUDIO_ENGINE.md](docs/AUDIO_ENGINE.md).
- **Hot path discipline.** Do not allocate inside `animate()` / `drawCanvas()`.
  Reuse buffers and the fixed particle pool. See
  [docs/PERFORMANCE.md](docs/PERFORMANCE.md).
- **DOM contract.** If you rename or remove an element ID, update `app.js` in the
  same change. The contract is listed in
  [docs/COMPONENTS.md](docs/COMPONENTS.md) and
  [docs/API_REFERENCE.md](docs/API_REFERENCE.md#dom-contract).
- **Style.** Match the surrounding code: 4-space indentation in `app.js`,
  descriptive names, small functions, comments only where intent isn't obvious.
- **Adding a site** requires: a new `sites[]` entry (with `accent`, `baseFreq`,
  `noiseBand`, `anomalyType`, `logPhrases`) *and* a matching `.site-button` in
  the markup wired to `selectSite(index)`.
- **Adding a parameter** requires a slider + readout in the markup, an
  `updateParam` index, a `syncSliderValues()` entry, and a mapping in
  `updateAudioFromParams()`.

## Preserve the fiction

This is interaction fiction as well as software. Please keep the diegetic
archival framing — UI copy is instrument/telemetry language, not generic labels —
unless your fork intentionally establishes a new direction. See
[ADR-006](docs/DESIGN_DECISIONS.md#adr-006--diegetic-interface-the-ui-is-the-story).

## Quality gate

Before requesting review, run the **Playwright smoke suite** (`npm install &&
npx playwright install chromium`, then `npm test`) and the **manual QA checklist**
in [docs/TESTING.md](docs/TESTING.md), then confirm:

- `npm test` passes (8 smoke tests, no console/page errors).
- No console errors on boot or during interaction.
- Audio changes are smooth (no clicks/zippering).
- Frame rate stays smooth; no new hot-path allocations.
- The change works in Chromium, Firefox, and Safari.
- Accessibility didn't regress (ideally, it improved).

## Pull request expectations

- One focused concern per PR.
- A clear description of the technical *and* experiential impact.
- Screenshots or a short clip for visual changes.
- Docs updated when behavior, the DOM contract, or the audio graph changes.
- Note what you tested (browsers, keyboard/screen reader, reduced motion).

## Reporting issues

Use the templates in `.github/ISSUE_TEMPLATE/`. Include browser/OS and clear
reproduction steps. Security concerns follow [SECURITY.md](SECURITY.md).

## Code of conduct

Participation is governed by the [Code of Conduct](CODE_OF_CONDUCT.md). Be
excellent to each other.

## License

By contributing, you agree that your contributions are licensed under the
project's [MIT License](LICENSE).
