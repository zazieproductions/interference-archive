# Architecture

This document describes how Interference Archive is put together: the module
boundaries, the data flow, the runtime lifecycle, and the coupling model that
makes the sound, the image, and the fiction behave as one system.

## Design goals

1. **One coherent artwork, three coupled systems.** A single change to a control
   should be audible, visible, and legible in the fiction simultaneously.
2. **Zero build, zero backend.** The entire piece must run from three static
   files opened in a browser.
3. **Bounded per-frame cost.** The render loop must be able to hold 60 fps on
   modest hardware, so all hot-path work is fixed-size and allocation-free.
4. **Legibility over cleverness.** The code is intentionally imperative and
   flat so that the audio and rendering logic can be read top to bottom.

## Component overview

The application is three files with clear responsibilities:

| File | Responsibility |
| --- | --- |
| `index.html` | The shell. Static markup for every UI region, `<meta>`/Open Graph tags, and the two external references (Tailwind CDN, local stylesheet). Wires DOM events to handlers via inline `on*` attributes. |
| `assets/css/styles.css` | The look. CRT scanline overlay, neon/glow text, glitch keyframes, slider styling, log fade-in, and the `@import` of the VT323 font. |
| `assets/js/app.js` | The engine. Audio graph construction and modulation, the Canvas render loop, application state, the site model, and the capture/export flow. |

Within `app.js` there are no ES modules or classes — it is a single script scope
— but it decomposes cleanly into five conceptual subsystems:

```
app.js
├── State           global vars: params, currentSiteIndex, isMuted, isPowered, …
├── Data model      sites[], classifications[], per-site logPhrases
├── Audio engine    initAudio, createNoiseBuffer, updateAudioFromParams, evolveAudio
├── Render loop     animate, drawCanvas, createParticles
└── UI + narrative  selectSite, updateParam, randomizeParams, toggle*, capture*,
                    addToLog, downloadCaseFile, boot, initializeSystem
```

## Data flow

The defining relationship is the loop between audio and image, bridged by an
`AnalyserNode`:

```
   ┌──────────────┐   params (0–100)    ┌────────────────────┐
   │  UI controls │────────────────────▶│  Application state  │
   │ (sliders,    │                     │  params, site,      │
   │  buttons,    │◀────────────────────│  power, mute        │
   │  keys)       │  readback (telemetry)└─────────┬──────────┘
   └──────────────┘                                │
                                                   │ updateAudioFromParams()
                                                   ▼
                                        ┌────────────────────┐
                                        │   Web Audio graph   │
                                        │  osc/noise/filter/  │
                                        │  delay/master       │
                                        └─────────┬──────────┘
                                                   │ AnalyserNode tap
                                     time-domain + frequency-domain bytes
                                                   ▼
                                        ┌────────────────────┐
                                        │  Canvas render loop │
                                        │  waveform, bars,    │
                                        │  particles, labels  │
                                        └─────────┬──────────┘
                                                   │ writes back
                                    peak-freq, live-cohesion, logs, glitch
                                                   ▼
                                             DOM telemetry
```

Key point: the visuals are not a decoration layered over the audio — they are a
**readout of the audio**. `analyser.getByteTimeDomainData()` drives the
oscilloscope; `analyser.getByteFrequencyData()` drives the spectrogram bars and
the particle field's energy response.

## Runtime lifecycle

1. **`window.onload → boot()`**
   - Configures Tailwind, prepares the initialize overlay's transition, seeds a
     "WAITING FOR USER GESTURE…" log line, and sets the base font.
   - No audio exists yet — browsers forbid an `AudioContext` from producing
     sound before a user gesture.

2. **User clicks the overlay → `initializeSystem()`**
   - Fades and removes the overlay.
   - Calls `initAudio()` to build the entire Web Audio graph and start the
     oscillators and noise source.
   - Selects the default site, grabs the Canvas 2D context, creates the particle
     field, populates the decorative spectrogram, registers keyboard shortcuts,
     and starts the render loop with `animate()`.

3. **Steady state — the render loop (`animate()`), once per frame**
   - Advances the elapsed-time clock and updates the on-screen timestamp.
   - If powered, calls `evolveAudio()` (slow autonomous modulation + random
     anomalies) and `updateAudioFromParams()` (maps current params to targets).
   - Calls `drawCanvas()` to render the frame from live analyser data.
   - Occasionally emits a narrative log line and updates telemetry readouts.
   - Schedules the next frame via `requestAnimationFrame`.

4. **User interactions (any time after init)**
   - Sliders → `updateParam()` → state → `updateAudioFromParams()`.
   - Nodes → `selectSite()` (swaps synthesis profile, accent, presets).
   - Capture → `captureTransmission()` → modal → `downloadCaseFile()`.
   - Power/mute toggles ramp the master gain rather than hard-cutting.

## State model

All state is module-scoped in `app.js`. The important pieces:

| State | Meaning |
| --- | --- |
| `params` | The six normalized (0–100) control values. |
| `currentSiteIndex` | Which entry of `sites[]` is active (default `4`, NULL SITE). |
| `isPowered` / `isMuted` | Boolean state machines that gate/ramp the master gain. |
| `oscillators[]` | The oscillator bank: `{ osc, gain, baseFreq }` per partial. |
| `analyser`, `filterNode`, `delayNode`, `feedbackGain`, `masterGain`, `noiseGain` | Long-lived Web Audio nodes created once in `initAudio()`. |
| `particles[]`, `waveformData`, `frequencyData` | Render-loop buffers, allocated once. |
| `elapsedTime`, `lastTime` | The frame clock. |

State is deliberately global rather than encapsulated: the app is a single
instance with no reuse requirement, and flat state keeps the audio/render
coupling easy to follow. If the project grows toward multiple simultaneous
instances or reproducible seeds (see the [roadmap](ROADMAP.md)), this is the
first thing that would be refactored into a class or module.

## The site model

`sites[]` is the data that gives each node its identity. Each site defines:

- `code` / `name` / `fullName` — identifiers and the fiction label.
- `accent` — the hex color that recolors the visuals and active UI.
- `baseFreq` — the fundamental the oscillator bank tunes around.
- `noiseBand` — the target frequency for occasional filter sweeps.
- `anomalyType` — the fiction category surfaced in telemetry.
- `logPhrases[]` — the vocabulary the random log generator draws from.

Selecting a site also applies a small set of parameter presets so each location
*feels* distinct the moment you land on it.

## Coupling and separation

The three concerns are cleanly separated at the file level (markup / style /
behavior) but intentionally coupled at runtime through two well-defined seams:

- **Params → audio:** `updateAudioFromParams()` is the single place transfer
  functions live. Add a mapping there and nowhere else.
- **Audio → visuals:** the `AnalyserNode` is the single tap. `drawCanvas()`
  reads from it and owns all pixels.

Keeping those two seams narrow is what lets each subsystem evolve independently
— you can rework the visuals without touching the DSP, and vice versa.

## Related reading

- [Audio engine internals](AUDIO_ENGINE.md)
- [Rendering pipeline](RENDERING.md)
- [Function-level API reference](API_REFERENCE.md)
- [Design decision records](DESIGN_DECISIONS.md)
