# UI components & DOM contract

Interference Archive has no component framework — the UI is hand-authored markup
in `index.html`. This document maps the screen into logical regions and records
the **DOM contract**: the element IDs and hooks that `assets/js/app.js` depends
on. Treat this as the interface between markup and behavior; if you rename or
remove an ID here, update `app.js` too.

## Region map

```
┌───────────────────────────────────────────────────────────────────────┐
│ HEADER  ⚠ INTERFERENCE ARCHIVE | LIVE FEED · CONNECTED · protocol | R31 CAPTURE │
├──────────────┬──────────────────────────────────────────┬─────────────┤
│              │ TELEMETRY BAR  TRANSMISSION · time · cohesion · anomaly · AUDIO │
│ SITE LIST    ├──────────────────────────────────────────┤ PARAMETERS  │
│ (Recovered   │                                          │ 6 sliders   │
│  Nodes)      │            CANVAS + overlays              │ + presets   │
│  Room 04     │  oscilloscope · spectrogram · particles   │ RANDOMIZE   │
│  Node 17     │                                          │ SEED        │
│  Chamber 09  ├──────────────────────────────────────────┤             │
│  Relay 31    │ RECOVERY LOG            CLEAR             │             │
│  NULL SITE   │                                          │             │
├──────────────┴──────────────────────────────────────────┴─────────────┤
│ BOTTOM BAR  IA-…·ACTIVE | PROTOCOL MANUAL | BANDWIDTH | ⟳ REBOOT ARCHIVE │
└───────────────────────────────────────────────────────────────────────┘
   Overlays: INITIALIZE OVERLAY (boot gate)  ·  CAPTURE MODAL (case file)
```

## Regions

### Header
Branding, `LIVE FEED` indicator, the power toggle (`#power-status`), the protocol
version chip, the active site code (`#current-site-code`), and the **Capture**
button (`captureTransmission()`).

### Site list — "Recovered Nodes"
Five `.site-button` elements (`#site-0`…`#site-4`) wired to `selectSite(n)`.
`selectSite()` restyles the active one using the site's accent color and updates
the "SIGNAL ORIGIN" footer.

### Telemetry bar
Read-only instrument strip: `#visual-site`, the mission clock `#timestamp`, the
jittered `#live-cohesion`, `#anomaly-level`, and the mute toggle
(`#mute-text` + `#mute-indicator`).

### Canvas stage
`#main-canvas` (720×420) plus absolutely-positioned overlays: `#overlay-site`,
`#overlay-status`, `#center-text` (glitch target), the peak-frequency readout
`#peak-freq`, and the decorative `#fake-spectrogram` container (populated by JS).

### Recovery log
`#console-log` holds the rolling, trimmed log; the `CLEAR` control calls
`clearLog()`.

### Parameters panel
Six range inputs and their numeric readouts:

| Parameter | Slider id | Readout id | `updateParam` index |
| --- | --- | --- | --- |
| Signal Cohesion | `slider-cohesion` | `val-cohesion` | 0 |
| Memory Decay | `slider-decay` | `val-decay` | 1 |
| Observer Contamination | `slider-contam` | `val-contam` | 2 |
| Spatial Residue | `slider-residue` | `val-residue` | 3 |
| Voice Reconstruction | `slider-voice` | `val-voice` | 4 |
| Archive Integrity | `slider-integrity` | `val-integrity` | 5 |

Below the sliders: the caution note, the **Randomize Parameters** hook, and the
`#seed-display`.

### Bottom bar
Status line, **Protocol Manual** (`showHelp()`), a `#bandwidth-val` readout, and
**Reboot Archive** (reloads the page).

### Overlays
- **Initialize overlay** (`#initialize-overlay`) — the boot gate that satisfies
  the autoplay gesture requirement; calls `initializeSystem()`.
- **Capture modal** (`#modal-backdrop`) — the generated case file, with fields
  `#modal-archive-id`, `#modal-image`, `#modal-classification`, `#modal-site`,
  `#modal-timestamp`, `#modal-report`, and the **Download .CASE** button.

## Event-binding convention

The project uses **inline `on*` attributes** rather than
`addEventListener` (except for the global keyboard shortcuts registered in
`initializeSystem()`). This is a deliberate trade-off for a single static file:
the behavior is visible right next to the markup it drives. If the UI grows, the
[roadmap](ROADMAP.md) notes migrating to delegated listeners.

## Guidelines for changing the UI

1. **Preserve IDs** that appear in the [API reference DOM contract](API_REFERENCE.md#dom-contract),
   or update `app.js` in the same change.
2. **New sliders** need a matching `updateParam` index and a `syncSliderValues()`
   entry.
3. **New sites** are added to `sites[]` *and* as a `.site-button` with the correct
   `selectSite(index)`.
4. Keep the diegetic tone — labels are instrument readouts, not generic UI text.
