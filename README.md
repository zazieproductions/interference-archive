# INTERFERENCE ARCHIVE

> A generative audiovisual horror instrument disguised as a recovered transmission terminal.

**Interference Archive** is an interactive browser artwork that combines procedural sound synthesis, animated signal visualization, fictional systems design, and downloadable narrative artifacts. The interface presents itself as a late-1990s archival console used to recover unstable transmissions from abandoned research sites.

Rather than behaving like a conventional music player or game, the project treats the browser as a **speculative instrument**: each control simultaneously alters the sound, the visual field, and the implied state of the fictional archive.

## Why this is a creative-technology project

The project connects several disciplines in one interaction system:

- **Creative coding:** real-time Canvas rendering, particles, oscillation, noise, and procedural animation.
- **Browser audio:** evolving drones and interference textures generated with the Web Audio API.
- **Interaction design:** DAW-style parameters, node selection, mute/power states, keyboard commands, and live telemetry.
- **Narrative systems:** site-specific fiction, anomaly logs, classifications, and randomized incident reports.
- **Generative publishing:** users can capture a frame and export a paired PNG plus automatically written case-file report.
- **Speculative interface design:** a fictional technical system communicates story through controls, status indicators, typography, and failure states.

## Core experience

1. Initialize the archive to start the audio engine.
2. Move between recovered nodes, each with a distinct fictional identity.
3. Adjust transmission parameters to reshape the audiovisual system.
4. Randomize the console to generate unstable new states.
5. Capture a transmission to create a unique archive ID, still image, classification, and incident report.
6. Download the generated case file as a text-and-image artifact.

## Technical features

- Procedural Web Audio signal chain
- Dynamically generated noise buffer
- Parameter-driven oscillator and filter behavior
- Real-time Canvas animation
- Particle and waveform-style signal rendering
- Animated spectrogram and telemetry UI
- Site-dependent metadata and visual state
- Randomized narrative event generation
- Canvas snapshot export with `toDataURL()`
- Browser-generated text file downloads with `Blob`
- Keyboard shortcuts for capture and randomization
- Responsive, single-page interface

## Technology

- HTML5
- CSS3
- JavaScript
- Web Audio API
- Canvas 2D API
- Tailwind CSS via CDN
- Google Fonts

No build system, framework, server, or installation is required.

## Run locally

Because the project is static, you can open `index.html` directly. For more consistent browser behavior, serve it locally:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

Audio begins only after a user gesture because modern browsers block autoplaying sound.

## Controls

- **Initialize:** activates the audiovisual engine.
- **Recovered Nodes:** switches the active fictional transmission site.
- **Parameter sliders:** alters the generated signal and system behavior.
- **Randomize:** produces a new parameter state.
- **Audio toggle:** mutes or restores the output.
- **Power:** transitions the archive between connected and offline states.
- **Capture:** snapshots the Canvas and generates a fictional case file.
- **Command/Ctrl + K:** randomizes parameters.
- **/**: captures a transmission.

## Project structure

```text
interference-archive/
├── index.html
├── assets/
│   ├── css/
│   │   └── styles.css
│   └── js/
│       └── app.js
├── CONTRIBUTING.md
├── LICENSE
└── README.md
```

## Design language

The interface draws from CRT terminals, scientific instrumentation, analog surveillance systems, archival media, numbers stations, abandoned institutional technology, and the administrative aesthetics of classified documentation. The horror is primarily systemic: the machine appears orderly, while its measurements and generated reports imply that something cannot be contained by the interface built to observe it.

## Potential extensions

- Microphone or line-input analysis
- FFT-driven visuals using `AnalyserNode`
- MIDI controller mapping
- Persistent archive history with IndexedDB
- Exportable audio recordings
- Site-specific synthesis architectures
- Seeded generation for reproducible transmissions
- WebGL shaders and post-processing
- Installation mode for a gallery display or physical control surface
- ESP32 or Raspberry Pi hardware interface

## Portfolio framing

This project can be presented as an experiment in **procedural sound design, browser-based instrument building, audiovisual systems, interaction fiction, and diegetic interface design**. It demonstrates how UI behavior, audio synthesis, generative graphics, and narrative worldbuilding can function as parts of one coherent artwork.

## Status

Experimental prototype. All locations, events, transmissions, and reports are fictional. All audiovisual output is generated in the browser.

## License

Released under the MIT License. See [`LICENSE`](LICENSE).
