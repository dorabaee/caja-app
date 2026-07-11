# Caja — Roadmap

Caja is a local-first cash-flow tracker for small businesses. This roadmap
covers infrastructure and near-term milestones. Items marked **TBD** need a
product decision from the maintainer before any work starts — they are listed
as observed candidates, not commitments.

## v0.1.x — Infrastructure (in progress)

- [x] **CI: tests on every push/PR** — GitHub Actions runs `tsc`, the Vite
  build, and the Vitest suite (71 tests across `src/core`) on Ubuntu.
  See `.github/workflows/ci.yml`.
- [x] **CI: release builds on tags** — pushing a `v*` tag builds the Tauri
  app for Windows (x64) and macOS (Apple Silicon + Intel) and attaches the
  installers to a draft GitHub Release. See `.github/workflows/release.yml`.
- [ ] **Code signing** — release artifacts are currently unsigned, so
  Windows SmartScreen and macOS Gatekeeper will warn on first launch.
  Requires paid certificates (Apple Developer ID + a Windows signing cert).
  **TBD**: whether/when to purchase certificates.

## v0.2 — Candidates (TBD, in no particular order)

- [ ] **Linux target** — the stack (Tauri 2) supports Linux with little
  extra work; the release workflow can add an `ubuntu-22.04` matrix entry
  producing `.deb`/`.AppImage`. **TBD**: is Linux an audience for this app?
- [ ] **More export/report options** — current exports: PDF "Estado de
  resultados" (3 formats), CSV, Excel, JSON backup. Possible additions
  (yearly PDF report, per-category breakdown export, print stylesheet).
  **TBD**: which, if any, users actually need.
- [ ] **Auto-update** — Tauri's updater plugin could deliver in-app updates
  once releases are signed. Blocked on code signing. **TBD**.
- [ ] **UI tests** — Vitest currently covers `src/core` only (which is the
  point of the pure-core layering), but a few smoke tests for critical UI
  flows (quick-add, month switch, undo/redo) would catch regressions.

## Non-goals (by design)

- Accounts, cloud sync, telemetry — Caja is deliberately local-first and
  tracking-free.
- Mobile targets.

## Conventions

- `src/core` stays pure: no React or Tauri imports. Domain logic and its
  tests live there.
- Releases: bump `version` in `package.json`, `src-tauri/tauri.conf.json`,
  and `src-tauri/Cargo.toml`, then push a matching `v*` tag.
