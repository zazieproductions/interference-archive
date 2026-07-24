# Accessibility

Interference Archive is, by nature, an audiovisual artwork — its content is
sound and moving image. That does not exempt it from accessibility work; it
sharpens the responsibility to be honest about what's inclusive today, what
isn't, and how it gets better. This document is a status report and a plan, not a
compliance claim.

## Current state

**What works**
- Semantic landmarks exist for the major regions; text is real text (not baked
  into images), so it's zoomable and selectable.
- Color is not the *only* channel for state — status also uses text
  (`CONNECTED`/`OFFLINE`, `AUDIO ON`/`AUDIO MUTED`).
- Keyboard shortcuts exist for the two headline actions (randomize, capture).
- Audio is gated behind an explicit user gesture — nothing autoplays.

**Known gaps (tracked, not hidden)**
- **Custom controls.** Sites and toggles are clickable `<div>`s, not `<button>`s,
  so they aren't reliably focusable or announced. This is the top a11y priority.
- **Focus management.** There is no visible focus ring order across the console,
  and the capture modal does not trap or restore focus.
- **ARIA.** The live telemetry and log aren't exposed as `aria-live` regions;
  sliders lack `aria-label`/`aria-valuetext`.
- **Motion.** The CRT scanline, glitch, and particle motion do not yet respect
  `prefers-reduced-motion`.
- **Contrast.** The neon-on-dark palette is legible but not verified against WCAG
  AA for every text size.

## Remediation plan

Prioritized, incremental, and achievable without changing the aesthetic:

1. **Roles & semantics** — convert interactive `<div>`s to `<button>`s (or add
   `role="button"` + `tabindex="0"` + key handlers); give the slider group an
   accessible name.
2. **Focus** — add a visible focus style, a logical tab order, and focus
   trap/restore for the capture modal (plus `Esc` to close).
3. **Live regions** — mark the recovery log and key telemetry as polite
   `aria-live` so screen-reader users hear anomalies/state changes.
4. **`prefers-reduced-motion`** — gate scanlines, glitch, and heavy particle
   motion behind the media query; provide a calmer default when requested.
5. **Contrast pass** — audit text/background pairs and bump where AA fails.
6. **Docs** — publish a keyboard map and a "reduced-experience" note.

## How to help

Accessibility is the single most valuable contribution area for this project.
See [CONTRIBUTING.md](../CONTRIBUTING.md); the items above map directly to good
first issues. When submitting a11y PRs, please note what you tested with
(keyboard only, VoiceOver/NVDA, reduced-motion, zoom).

## Testing accessibility

- Keyboard-only: can you initialize, switch sites, move sliders, capture, and
  close the modal without a mouse?
- Screen reader: are state changes and log entries announced?
- Reduced motion: enable it at the OS level and confirm the calmer path.
- Automated: run axe/Lighthouse and record findings in the PR.
