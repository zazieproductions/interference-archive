# Rendering pipeline

The visuals are drawn on a single `<canvas id="main-canvas" width="720"
height="420">` using the Canvas 2D API. There is no WebGL, no sprite sheet, and
no image asset — every pixel is computed each frame from application state and
live audio data.

All rendering lives in `assets/js/app.js` (`animate()`, `drawCanvas()`,
`createParticles()`).

## The frame loop

`animate()` is scheduled with `requestAnimationFrame`, so it runs at the
display's refresh rate (typically 60 fps) and pauses automatically when the tab
is backgrounded. Each frame it:

1. Computes `delta` from `Date.now()` and advances `elapsedTime`.
2. Updates the on-screen mission clock (`MM:SS`).
3. If powered, runs `evolveAudio()` and `updateAudioFromParams()`.
4. Calls `drawCanvas()` to paint the frame.
5. Occasionally emits a narrative log line and updates telemetry
   (`live-cohesion`, and on the NULL site, an occasional glitch class).
6. Requests the next frame.

## The analyser bridge

Before drawing, `drawCanvas()` pulls two views of the live audio from the
`AnalyserNode`:

```js
analyser.getByteTimeDomainData(waveformData);   // Uint8Array(128) — the oscilloscope
analyser.getByteFrequencyData(frequencyData);   // Uint8Array(64)  — the spectrum
```

Both buffers are allocated once at module scope and reused every frame, so the
hot path performs **no per-frame allocations**. This is the single most
important performance property of the renderer.

## Draw layers (back to front)

`drawCanvas()` composites the frame in a fixed order:

| # | Layer | Source |
| --- | --- | --- |
| 1 | **Background wash** | Solid dark green fill. |
| 2 | **Grid** | Static vertical/horizontal lines — the instrument's graticule. |
| 3 | **Residue afterimage** | The last ≤6 waveform frames (see below), stroked faintly behind the live trace. |
| 4 | **Oscilloscope waveform** | `waveformData`, stroked twice (wide glow pass + tight core pass) in the site accent color, then copied into the afterimage ring. |
| 5 | **Spectrogram bars** | `frequencyData` bins mapped to bar heights with little "caps." |
| 6 | **Particle field** | `particles[]`, advected by per-particle angle/speed, average audio energy, and residue drift. |
| 7 | **Vignette** | Radial gradient darkening toward the edges. |
| 8 | **Ghost label** | A low-opacity `"SIGNAL"` word behind the trace. |
| 9 | **Scanline** | A moving horizontal bar keyed to wall-clock time. |

## Spatial Residue: persistence, drift, afterimage

The renderer reads `params.residue` directly (the one place a parameter drives
pixels without going through the audio graph), and uses it three ways:

- **Afterimage.** A fixed ring of the last 8 waveform frames
  (`waveHistory`, allocated once at module scope and refilled with `.set()` —
  no per-frame allocation). Each frame draws up to
  `round(residue/100 × 6)` older traces behind the live one, with alpha falling
  off toward the older frames and scaled by `0.18 × residue`. At `FLAT` this is
  one nearly-invisible trace; at `DIFFUSE` the oscilloscope smears into a
  phosphor tail that lingers several frames.
- **Drift.** Each afterimage frame is offset by slow sine/cosine terms scaled by
  `residue × frame index` (up to roughly ±11 px horizontally, ±7 px vertically at
  maximum), so the tail wanders instead of sitting still — the "haunted" part.
- **Particle drift.** Particles pick up small lateral/vertical wander terms
  scaled by residue (≤ 0.18 px/frame), so the field visibly loses cohesion as
  the residue rises.

The afterimage is drawn *before* the live trace and with `shadowBlur = 0`, so
the glow cost stays exactly where it was: the extra work per frame is at most
six 128-point strokes with no shadow, on top of the existing passes. Because
the trails live on the main canvas, `captureTransmission()` snapshots include
them — a capture taken at high residue genuinely looks longer-exposed.

The audio side of the same control (the convolved tail and stereo taps) feeds
the analyser, so the live trace *also* smears because the signal itself does —
see [AUDIO_ENGINE.md](AUDIO_ENGINE.md#the-spatial-residue-stage).

Glow is achieved with `ctx.shadowBlur` / `ctx.shadowColor` set to the active
accent, which is why the trace reads as neon CRT phosphor rather than a flat
line.

## The particle system

`createParticles()` seeds a fixed pool (80 particles), each with position, size,
speed, angle, and life. Per frame each particle:

- Advances along its angle, with horizontal speed scaled by the current average
  audio energy (`avgVol`) so the field visibly "breathes" with the sound.
- Picks up a residue-scaled sine/cosine wander (see *Spatial Residue* above).
- Slowly curves (its angle increments) and ages (life decrements).
- Respawns when it dies or leaves the canvas.

The pool is fixed-size and recycled, so particle count — and therefore per-frame
cost — is constant regardless of how long the piece runs.

## Color and site identity

`currentAccent` is set by `selectSite()` from the site's `accent` field and is
used for the waveform stroke, glow color, and particle color. Switching nodes
therefore recolors the entire visual field instantly, reinforcing that each site
is a different place.

## Telemetry write-back

The renderer also writes derived values back into the DOM so the instrument
panel feels alive:

- `peak-freq` — a peak-frequency readout derived from the spectrum.
- `live-cohesion` — a jittered display of the cohesion parameter.
- On the NULL site, the center label periodically gets the `glitch` class
  (defined in `styles.css`) for a brief distortion.

## CSS-driven atmosphere

Some of the "render" is actually CSS, layered over the canvas:

- `.crt::after` — the animated scanline overlay across the whole viewport.
- `.neon-text` / `.terminal-text` — text-shadow glow.
- `@keyframes glitch` / `logfade` / `scanline` — the motion vocabulary.

Keeping these in CSS keeps them off the JS hot path entirely (they run on the
compositor).

## Snapshotting

`captureTransmission()` calls `canvas.toDataURL("image/png")` to freeze the
current frame into a data URL, which becomes both the modal preview and the
downloadable `.png`. Because the canvas is same-origin and untainted, the export
is unrestricted.

## Performance notes

See [PERFORMANCE.md](PERFORMANCE.md) for budgets and profiling. The short
version: fixed-size buffers, a fixed particle pool, fixed analyser bins, and no
hot-path allocations keep the frame cost flat and predictable.

## Related reading

- [Architecture overview](ARCHITECTURE.md)
- [Audio engine](AUDIO_ENGINE.md) — the source of the analyser data
- [Performance](PERFORMANCE.md)
