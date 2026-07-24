# Design decisions (ADRs)

Lightweight architecture decision records. Each captures a choice, the context,
the alternatives considered, and the consequences — so the *why* survives, not
just the *what*.

---

## ADR-001 — No framework; vanilla JS

**Status:** Accepted

**Context.** The app is fundamentally one `requestAnimationFrame` render loop and
one imperative Web Audio graph. Both are stateful, time-based, and mutate
external systems (Canvas, audio hardware) every frame.

**Decision.** Use plain JavaScript with no UI framework and no bundler.

**Alternatives considered.**
- *React/Vue/Svelte* — a virtual DOM/diffing model adds abstraction and overhead
  with no benefit for per-frame Canvas/audio mutation, and would pull in a build
  toolchain.
- *A canvas/game library* — overkill for line + particle + text drawing at this
  scale.

**Consequences.** Zero dependencies to install, zero supply-chain surface, and an
instant load. Trade-off: no component ergonomics, and UI wiring is via inline
handlers. Acceptable at this size; revisit if the UI grows substantially.

---

## ADR-002 — Web Audio synthesis instead of audio files

**Status:** Accepted

**Context.** The piece needs an endless, evolving, parameter-responsive drone.

**Decision.** Synthesize everything at runtime from oscillators + a looped noise
buffer through a filter/delay network.

**Alternatives considered.**
- *Shipping audio files* — large payloads, fixed content, and no per-parameter
  responsiveness; loops seam audibly.

**Consequences.** No audio assets, infinite non-repeating output, and every
control genuinely reshapes the sound. Trade-off: DSP knowledge required to
extend, and browser autoplay policy must be handled (see ADR-005).

---

## ADR-003 — Canvas 2D instead of WebGL

**Status:** Accepted (WebGL path deferred)

**Context.** The visuals are an oscilloscope trace, spectrogram bars, a modest
particle field, grid, vignette, and text at 720×420.

**Decision.** Use the Canvas 2D API.

**Alternatives considered.**
- *WebGL/shaders* — more power than the current visuals need, and a steeper
  authoring cost.

**Consequences.** Simple, readable drawing code and easy `toDataURL()` export.
Trade-off: `shadowBlur` glow is CPU-heavy (see [PERFORMANCE.md](PERFORMANCE.md)).
WebGL post-processing is intentionally kept on the [roadmap](ROADMAP.md) for when
the visual ambition exceeds 2D's comfort zone.

---

## ADR-004 — The AnalyserNode as the audio↔visual bridge

**Status:** Accepted

**Context.** The visuals must be a genuine readout of the sound, not a loosely
correlated animation.

**Decision.** Insert one `AnalyserNode` in the master chain and drive all
visuals from its time-domain and frequency-domain data.

**Consequences.** A single, well-defined seam couples the two systems: the
picture is literally the sound. Each subsystem can evolve independently on either
side of that tap.

---

## ADR-005 — Explicit initialize gesture for autoplay

**Status:** Accepted

**Context.** Browsers block audio until a user gesture; an `AudioContext` created
at load starts suspended.

**Decision.** Don't create the context at load. Build the entire audio graph
inside `initAudio()`, invoked by the click on the initialize overlay.

**Consequences.** Reliable audio start on first gesture across browsers, and the
gate doubles as a diegetic "CLICK TO ACCESS" moment that fits the fiction.

---

## ADR-006 — Diegetic interface (the UI is the story)

**Status:** Accepted

**Context.** The project is interaction fiction as much as it is a tool.

**Decision.** Carry the narrative through the interface itself — telemetry,
status, logs, classifications, generated case files — rather than a separate
story layer.

**Consequences.** UI copy is instrument language, not generic labels;
contributions must preserve the framing (noted in
[CONTRIBUTING.md](../CONTRIBUTING.md)). The controls do triple duty (function,
feedback, fiction).

---

## ADR-007 — Flat global state, single instance

**Status:** Accepted (revisit for multi-instance/seeding)

**Context.** There is exactly one console per page and no reuse requirement.

**Decision.** Keep state module-scoped and flat; keep the two coupling seams
(`updateAudioFromParams()` and the analyser tap) narrow.

**Consequences.** The audio/render coupling reads top-to-bottom. Trade-off: not
directly reusable as multiple instances. Seeded, reproducible generation
([roadmap](ROADMAP.md)) is the trigger to refactor this into a module/class.

---

## ADR-008 — CDN Tailwind + Google Fonts (with a hardening path)

**Status:** Accepted (pin/self-host planned)

**Context.** Keeping the shell a single hand-authored HTML file while still
having declarative layout utilities and a period-accurate font.

**Decision.** Load Tailwind and VT323 from their CDNs at runtime.

**Consequences.** No build/tooling for styling, and the file stays portable.
Trade-off: a runtime dependency on third-party CDNs and no version pin. Pinning
and self-hosting are on the [roadmap](ROADMAP.md), and recommended now for
offline/kiosk forks ([DEPLOYMENT.md](DEPLOYMENT.md)).
