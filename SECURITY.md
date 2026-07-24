# Security Policy

Interference Archive is a static, client-side web page with no backend, no
authentication, no data collection, and no server-side processing. It runs
entirely in the visitor's browser. The realistic security surface is therefore
small, but reports are still welcome and taken seriously.

## Scope

In scope:
- Cross-site scripting (XSS) or DOM-injection issues in the page.
- Unsafe handling of generated content (e.g. the capture/download flow).
- Risks introduced by the CDN-loaded dependencies (Tailwind, Google Fonts).
- Supply-chain or integrity concerns with runtime assets.

Out of scope:
- The fictional content itself (all locations, events, and reports are
  invented).
- Issues that require a compromised browser or OS.

## Reporting a vulnerability

Please report privately rather than opening a public issue:

1. Preferred: open a **GitHub private security advisory** via the repository's
   **Security → Advisories** tab.
2. Alternatively, contact the maintainers (Zazie Productions) directly.

Include:
- A description of the issue and its impact.
- Steps to reproduce (and a proof of concept if possible).
- Affected browser/OS.

## What to expect

- Acknowledgement of your report as soon as reasonably possible.
- An assessment and, where warranted, a fix on a best-effort basis (this is a
  small open-source art project).
- Credit for responsible disclosure, if you would like it.

Please give us a reasonable opportunity to address an issue before any public
disclosure.

## Hardening notes

Two runtime dependencies are loaded from third-party CDNs (Tailwind CSS and the
VT323 font). Pinning and self-hosting these is tracked on the
[roadmap](docs/ROADMAP.md) and recommended for any fork deployed in a sensitive
or offline context — see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
