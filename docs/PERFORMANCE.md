# Performance

The piece runs an audio graph and a Canvas render loop simultaneously, so
performance work centers on keeping the per-frame cost flat and predictable.

## Budgets

| Metric | Target | Notes |
| --- | --- | --- |
| Frame rate | 60 fps | Matched to `requestAnimationFrame`; degrades gracefully on slower displays. |
| Per-frame JS | < ~4 ms | Leaves headroom within a 16.6 ms frame for compositing. |
| Hot-path allocations | 0 | No `new`/array growth inside `drawCanvas()`/`animate()`. |
| Initial load | Near-instant | Three static files; no bundle to parse. |
| Audio glitches | None on param change | All changes are `setTargetAtTime`/ramps. |

## Why the frame cost is flat

The renderer is designed so that cost does not grow over a session:

- **Reused buffers.** `waveformData` (128) and `frequencyData` (64) are allocated
  once and refilled each frame — no allocation in the loop.
- **Fixed afterimage ring.** The Spatial Residue afterimage reads from
  `waveHistory`, a fixed 8-frame ring of `Uint8Array(128)` allocated at module
  scope and refilled with `.set()`. At most 6 extra 128-point strokes are drawn
  per frame (only when residue is above ~8), and they deliberately run with
  `shadowBlur = 0`, so they add no shadow-pass cost.
- **Fixed particle pool.** 80 particles, recycled on death/exit. Particle count
  never grows.
- **Fixed analyser size.** `fftSize 256` yields stable, small data views.
- **Bounded log.** The recovery log is trimmed to 7 entries, so the DOM node
  count stays constant.
- **CSS-driven atmosphere.** Scanlines, glow, and glitch run as CSS
  animations on the compositor, off the JS thread.

## Known hot spots (and honest caveats)

- **`ctx.shadowBlur` glow** is the most expensive drawing operation. It's used
  intentionally for the CRT phosphor look; if profiling shows it dominating on a
  target device, the mitigation is to pre-render the glow to an offscreen canvas
  or reduce blur radius.
- **Double-stroking the waveform** (glow pass + core pass) doubles that path's
  cost; it's cheap relative to the shadow blur but is the next thing to cut if
  needed.
- **`updateAudioFromParams()` runs every frame.** It's inexpensive (a handful of
  `setTargetAtTime` calls, including the residue stage's six), but it only
  *needs* to run on change. A straightforward optimization is to make it
  change-driven and keep only `evolveAudio()` per-frame. Note the mute/power
  gate lives in that mapping, so any refactor must preserve it.

## Profiling recipe

1. Open DevTools → Performance, record ~5 seconds during active playback.
2. Confirm frames land under 16.6 ms and there are no long tasks.
3. In the Memory tab, take heap snapshots 30 seconds apart — they should be
   flat (no per-frame allocation growth).
4. Toggle sites and sliders while recording to confirm no dropped frames on
   interaction.

## Scaling considerations

- **Higher resolution / DPI.** The canvas is a fixed 720×420 backing store.
  Supporting HiDPI means scaling by `devicePixelRatio`, which increases fill
  cost linearly — budget accordingly.
- **WebGL path.** The [roadmap](ROADMAP.md) WebGL post-processing would move the
  glow/vignette to the GPU, freeing the CPU hot path substantially.

## Related reading

- [Rendering pipeline](RENDERING.md)
- [Testing](TESTING.md)
