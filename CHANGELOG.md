# Changelog

All notable changes to Interference Archive are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive technical documentation suite under `docs/`:
  architecture, audio engine, rendering pipeline, API reference, UI
  components/DOM contract, setup, testing, performance, accessibility,
  deployment, design decision records (ADRs), and roadmap.
- Community & governance files: `CODE_OF_CONDUCT.md`, `SECURITY.md`, GitHub issue
  and pull-request templates, and a ready-to-use static-checks CI workflow
  (documented in `docs/TESTING.md`).
- Restructured, portfolio-grade `README.md` with architecture and signal-chain
  diagrams, a feature matrix, tech-stack rationale, and a documentation index.

### Changed
- Expanded `CONTRIBUTING.md` with coding conventions, the DOM contract, a QA
  gate, and PR expectations.

## [1.0.0] — 2026

### Added
- Initial public release of Interference Archive.
- Procedural Web Audio signal chain: oscillator bank + looped noise buffer →
  biquad lowpass → delay/feedback network → analyser → master.
- Real-time Canvas 2D render loop: oscilloscope, spectrogram bars, particle
  field, grid, vignette, and scanline, driven by an `AnalyserNode`.
- Five fictional "recovered node" sites, each with its own accent, base
  frequency, presets, and log vocabulary.
- Six normalized transmission parameters mapped to smoothed audio targets.
- Randomization, mute, and power state machines with ramped transitions.
- Capture flow: canvas snapshot via `toDataURL()`, generated classification and
  incident report, and paired `.txt` + `.png` download via `Blob`.
- Keyboard shortcuts (`Cmd/Ctrl+K` randomize, `/` capture).
- CRT/terminal aesthetic (scanlines, neon glow, glitch) in CSS with the VT323
  typeface.
- MIT license and initial contribution guide.

[Unreleased]: https://github.com/zazieproductions/interference-archive/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/zazieproductions/interference-archive/releases/tag/v1.0.0
