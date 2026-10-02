# Roadmap

Direction for Interference Archive. This is intentionally ambitious in places —
it doubles as a statement of where the creative-technology exploration is headed.
Items are grouped by theme, not committed dates. Community input via
[issues](../.github/ISSUE_TEMPLATE) is welcome.

## Near term — hardening & inclusivity

- **Accessibility pass.** Real `<button>` semantics, focus management + modal
  focus trap, `aria-live` telemetry/log, and `prefers-reduced-motion` support.
  See [ACCESSIBILITY.md](ACCESSIBILITY.md).
- **Pin / self-host CDN assets.** Remove the runtime dependency on the Tailwind
  and Google Fonts CDNs (see [ADR-008](DESIGN_DECISIONS.md#adr-008--cdn-tailwind--google-fonts-with-a-hardening-path)).
- **Extract pure transfer functions** from `updateAudioFromParams()` and add
  unit tests. A Playwright smoke test now exists (`tests/smoke.spec.js`); the
  remaining step is wiring it into a committed CI workflow. See
  [TESTING.md](TESTING.md).
- **Change-driven audio updates.** Stop calling `updateAudioFromParams()` every
  frame; drive it on change only. See [PERFORMANCE.md](PERFORMANCE.md).

## Audio

- **True FFT-driven visuals.** Wire the on-canvas spectrogram directly from
  `analyser.getByteFrequencyData()` bins.
- **Microphone / line-input mode.** Feed a live input through the analyser and
  the graph for reactive performance use.
- **Per-site synthesis architectures.** Give each node a genuinely different
  signal chain, not just different parameter presets.
- **Exportable audio.** Capture output with `MediaRecorder` so a transmission can
  be saved as audio, not just a still + report.

## Visuals

- **WebGL post-processing.** Move glow/vignette/scanlines to shaders and add
  chromatic aberration, bloom, and feedback effects
  ([ADR-003](DESIGN_DECISIONS.md#adr-003--canvas-2d-instead-of-webgl)).
- **HiDPI rendering.** Scale the backing store by `devicePixelRatio`.

## Systems & narrative

- **Seeded, reproducible generation.** A seed that deterministically reproduces a
  transmission's parameters, visuals, and report — shareable via URL.
- **Persistent archive history.** Store captured case files locally with
  IndexedDB and browse past transmissions.
- **Richer generative reports.** Grammar-driven incident text that references the
  actual parameter state at capture time.

## Platform & installation

- **Installation / kiosk mode.** Fullscreen, attract loop, and reduced-input mode
  for gallery display.
- **Hardware control surface.** MIDI mapping, and an ESP32 / Raspberry Pi
  physical interface to the parameters.
- **Mobile layout.** A responsive rework of the desktop-first console.

## Engineering

- **Optional modular refactor.** If multi-instance or seeding lands, move the flat
  global state into a module/class
  ([ADR-007](DESIGN_DECISIONS.md#adr-007--flat-global-state-single-instance)).
- **Delegated event listeners** in place of inline handlers as the UI grows.

See the [changelog](../CHANGELOG.md) for what has already shipped.
