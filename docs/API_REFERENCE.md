# API reference

A function-level reference for `assets/js/app.js`. The application is a single
script scope (no modules/exports); every function below is a top-level function
callable within that scope, and several are invoked directly from `on*`
attributes in `index.html`.

Legend: **⌘** = also bound to a keyboard shortcut, **DOM** = invoked from markup.

## Boot & lifecycle

### `boot()` — DOM (`window.onload`)
Entry point. Configures Tailwind, prepares the initialize-overlay transition,
seeds a "WAITING FOR USER GESTURE…" log line, and sets the base font. Creates no
audio (autoplay policy).

### `initializeTailwind()`
Sets `tailwind.config` before first paint. Called by `boot()`.

### `initializeSystem()` — DOM (overlay `onclick`)
The user-gesture handler. Fades/removes the overlay, calls `initAudio()`, selects
the default site, acquires the Canvas 2D context, seeds particles and the
decorative spectrogram, registers keyboard shortcuts, and starts `animate()`.

## Audio engine

### `initAudio()`
Builds the entire Web Audio graph once (idempotent — returns early if the context
already exists), starts the oscillators and noise source, and wires the master
chain. See [AUDIO_ENGINE.md](AUDIO_ENGINE.md).

### `createNoiseBuffer()`
Allocates a ~4-second mono white-noise `AudioBuffer` and fills it with uniform
noise. Called by `initAudio()`.

### `updateAudioFromParams()`
The single source of truth for parameter → audio mapping. Reads `params` and the
active site and applies smoothed (`setTargetAtTime`) targets to the oscillators,
filter, noise gain, delay, feedback, and master. Called on every param change and
every frame.

### `evolveAudio(t)`
Per-frame autonomous modulation: voice-oscillator vibrato, occasional filter
sweeps, and rare transient anomalies. `t` is `elapsedTime` in ms.

## Rendering

### `animate()`
The `requestAnimationFrame` loop. Advances the clock, updates telemetry, drives
audio (if powered), calls `drawCanvas()`, emits occasional logs, and reschedules
itself.

### `drawCanvas()`
Renders one frame: pulls time-domain and frequency-domain data from the analyser
and composites background, grid, waveform, spectrogram, particles, vignette,
label, and scanline. See [RENDERING.md](RENDERING.md).

### `createParticles()`
Seeds the fixed particle pool (80 particles). Called at init and re-seedable.

## Sites & parameters

### `selectSite(index)` — DOM (node `onclick`)
Switches the active site: updates active-node styling, sets `currentAccent` and
telemetry labels, applies per-site parameter presets, and calls
`syncSliderValues()` + `updateAudioFromParams()`.

### `updateParam(index, value)` — DOM (slider `oninput`)
Writes one slider's value into `params` (by index 0–5), updates its numeric
readout, and calls `updateAudioFromParams()`.

### `syncSliderValues()`
Pushes the current `params` back onto every slider element and its numeric label
(used after presets/randomization so the UI matches state).

### `randomizeParams()` — DOM, ⌘ (`Cmd/Ctrl+K`)
Assigns new randomized values to all six parameters within musically sensible
ranges, syncs the UI, updates audio, and logs the change.

## Transport & state

### `toggleMute()` — DOM
Flips `isMuted` and ramps `masterGain` between a near-silent floor and nominal
level; updates the mute indicator/label.

### `togglePower()` — DOM
Flips `isPowered` and linearly ramps `masterGain` off/on; swaps the
`CONNECTED`/`OFFLINE` status styling. While offline, audio evolution pauses but
rendering continues.

## Capture & export

### `captureTransmission()` — DOM, ⌘ (`/`)
Generates an archive ID, snapshots the canvas via `toDataURL()`, fills the modal
with site/timestamp/classification and a randomized incident report, and shows
the modal.

### `hideCaptureModal()` — DOM
Hides the capture modal.

### `downloadCaseFile()` — DOM
Builds a plain-text report with a `Blob`, downloads it as `<archiveId>.txt`, then
downloads the snapshot as `<archiveId>.png`. Revokes the object URL and closes
the modal.

## Logging & narrative

### `addToLog(text, isAnomaly = false)`
Appends a timestamped line to the recovery log, styles anomalies red, and trims
the log to the most recent 7 entries.

### `clearLog()` — DOM
Empties the log and writes a `LOG CLEARED` entry.

### `showHelp()` — DOM (Protocol Manual)
Streams a short sequence of framing/disclaimer lines into the log.

## Global state (module scope)

| Name | Type | Notes |
| --- | --- | --- |
| `params` | object | `cohesion, decay, contamination, residue, voice, integrity` (0–100). |
| `currentSiteIndex` | number | Index into `sites[]` (default `4`). |
| `isMuted`, `isPowered` | boolean | Transport state. |
| `oscillators` | array | `{ osc, gain, baseFreq }` per partial. |
| `analyser`, `filterNode`, `delayNode`, `feedbackGain`, `masterGain`, `noiseGain`, `noiseSource`, `noiseBuffer` | Web Audio nodes | Created in `initAudio()`. |
| `canvas`, `ctx` | Canvas + 2D context | Acquired in `initializeSystem()`. |
| `particles` | array | Fixed pool. |
| `waveformData` | `Uint8Array(128)` | Time-domain buffer, reused. |
| `frequencyData` | `Uint8Array(64)` | Frequency-domain buffer, reused. |
| `sites` | array | The site model (see [ARCHITECTURE.md](ARCHITECTURE.md#the-site-model)). |
| `classifications` | array | Random capture classifications. |
| `currentAccent` | string | Active accent hex, used by the renderer. |

## DOM contract

`app.js` reaches for a fixed set of element IDs. If you edit `index.html`, keep
these in sync (see [COMPONENTS.md](COMPONENTS.md) for the full list): the sliders
`slider-*`, readouts `val-*`, `timestamp`, `live-cohesion`, `peak-freq`,
`power-status`, `mute-indicator`/`mute-text`, `console-log`,
`current-site-code`/`visual-site`/`overlay-site`/`site-fullname`, the
`modal-*` fields, `main-canvas`, `fake-spectrogram`, and `initialize-overlay`.
