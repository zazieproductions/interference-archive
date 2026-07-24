# Audio engine

The audio engine is a Web Audio graph built once and modulated continuously. It
synthesizes an evolving drone with an interference/contamination layer entirely
from oscillators and noise — there are no audio files anywhere in the project.

All of this lives in `assets/js/app.js`.

## The graph

```
 osc0 (sine, 85Hz)  ─▶ gain0 ┐
 osc1 (sine, 128Hz) ─▶ gain1 ┤
 osc2 (sine, 210Hz) ─▶ gain2 ├─▶ droneMix ┐
 osc3 (saw,  340Hz) ─▶ gain3 ┘            │
                                          ├─▶ filterNode ─▶ delayNode ─▶ analyser ─▶ masterGain ─▶ destination
 noiseBuffer ─▶ noiseSource ─▶ noiseGain ─┘      ▲             │
                                                 │             └─▶ feedbackGain ─┐
                                                 │                               │
                                                 └────────── feedback tap ───────┘
                                                          (delay → feedbackGain → delay,
                                                           and feedbackGain → filterNode)
```

## Nodes and defaults

Created in `initAudio()`:

| Node | Type | Default | Purpose |
| --- | --- | --- | --- |
| `masterGain` | `GainNode` | `0.6` | Final output level; ramped for power/mute. |
| `analyser` | `AnalyserNode` | `fftSize 256`, `smoothing 0.75` | Non-destructive tap that drives the visuals. |
| `filterNode` | `BiquadFilterNode` | `lowpass`, `1200 Hz`, `Q 2` | The main tonal gate. |
| `delayNode` | `DelayNode` | `0.45 s` (max 2 s) | Echo / smear. |
| `feedbackGain` | `GainNode` | `0.35` | Recirculation amount for the delay. |
| `noiseGain` | `GainNode` | `0.2` | Level of the contamination layer. |
| `oscillators[0..3]` | `OscillatorNode` + `GainNode` | 85/128/210/340 Hz; last is `sawtooth` | The drone partials; osc3 is the "voice." |
| `droneMix` | `GainNode` | unity | Sums the oscillator bank. |
| `noiseSource` | `AudioBufferSourceNode` | looping | Plays the generated noise buffer. |

### The noise buffer

`createNoiseBuffer()` allocates a mono `AudioBuffer` of
`sampleRate × 4` samples (≈4 seconds) and fills it with uniform white noise
(`Math.random() * 2 - 1`). It is looped by `noiseSource`, so a few seconds of
noise become an endless texture with no perceptible seam.

### The feedback network

Two connections make the delay recirculate and bleed:

- `delayNode → feedbackGain → delayNode` — a classic feedback delay line.
- `feedbackGain → filterNode` — a second tap that folds the delayed, filtered
  signal back into the filter input, which is what gives the tail its unstable,
  "haunted" character rather than a clean repeat.

Feedback gain is clamped to `[0.15, 0.65]` so the loop can be dense without
running away into self-oscillation.

## Parameter mapping

`updateAudioFromParams()` is the single source of truth for how the six
normalized (0–100) parameters become audio. Every mapping uses
`setTargetAtTime` with a short time constant so changes glide instead of
clicking.

| Parameter | Transfer function (abridged) | Effect |
| --- | --- | --- |
| **Cohesion** | `spread = (100 − cohesion) · 1.2`; each `osc.freq = baseFreq + i · spread · 0.6` | Lower cohesion detunes the partials apart (fragile); higher pulls them together (stable). |
| **Cohesion + Voice** | `cutoff = min(400 + cohesion·18 + voice·8, 4200)` | Opens/closes the lowpass filter — the most audible control. |
| **Contamination** | `noiseGain = contamination / 220` | Blends in the noise layer. |
| **Decay** | `delayTime = 0.1 + decay/110`; `feedback = clamp(decay/180, 0.15, 0.65)` | Longer, denser echoes. |
| **Integrity** | `oscGain = 0.25 + integrity/300`; `masterGain = 0.5 + integrity/400` | Overall presence and level. |
| **Residue** | (reserved) | Currently drives per-site presets and telemetry; slated for spatialization — see [roadmap](ROADMAP.md). |

Per-site tuning: `updateAudioFromParams()` reads the active site's `baseFreq`, so
the same parameter values sound different at each node.

## Autonomous evolution

`evolveAudio(t)` runs every frame and adds life the user did not directly ask
for:

- **Voice modulation** — osc3's frequency is modulated by a slow sine
  (`sin(time · 1.8) · 90 · voice/100`) around `baseFreq · 2.8`, producing a
  wavering, vocal quality scaled by the Voice parameter.
- **Occasional filter sweeps** — with low probability per frame, the filter
  cutoff sweeps toward the site's `noiseBand` plus a slow oscillation.
- **Transient anomalies** — rarely (and only when contamination is high), osc2
  jumps up in pitch for ~120 ms and snaps back, and a red `TRANSIENT ANOMALY`
  log is emitted. This is the audible "the machine found something" event.

## Power and mute

Neither toggle disconnects nodes; both ramp `masterGain` so transitions are
smooth:

- **Mute** — `setTargetAtTime(0.02 or 0.6, …, 0.1)` (a near-silent floor, not
  absolute zero, so the tail doesn't pop).
- **Power** — `linearRampToValueAtTime(0, +0.6s)` to go offline;
  `linearRampToValueAtTime(0.6, +0.8s)` to reconnect. While offline, the render
  loop stops evolving/updating audio but keeps drawing.

## Autoplay policy

Browsers block audio until a user gesture. The app never creates the
`AudioContext` at load — it is created inside `initAudio()`, which only runs
after the user clicks the initialize overlay. This is why the experience opens
on a "CLICK TO ACCESS" gate rather than starting silently and failing.

## Extending the engine

Good first extensions (see also [CONTRIBUTING](../CONTRIBUTING.md)):

- Add a new mapping in `updateAudioFromParams()` — it is the only place transfer
  functions belong.
- Wire the **Residue** parameter to a `StereoPannerNode` or convolution reverb.
- Replace the manual bar-drawing with true FFT bins from
  `analyser.getByteFrequencyData()` for the on-canvas spectrogram.

## Related reading

- [Architecture overview](ARCHITECTURE.md)
- [Rendering pipeline](RENDERING.md) — how analyser data becomes pixels
- [API reference](API_REFERENCE.md) — every audio function's signature
