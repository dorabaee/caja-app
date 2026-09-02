# Caja

**A local-first cash-flow tracker for small businesses.** Caja helps a shop owner
follow the money — what came in, what went out, and what's left — month by month,
for as many businesses as they run. Everything is stored on the device: no account,
no cloud, no tracking.

Spanish by default, English in a click.

## Features

- **Monthly board** — each month is a free-form canvas of draggable, resizable
  **tables** (daily income, expenses, a parallel bank ledger, or a blank table) and
  **charts** linked to them. A KPI hero shows **Entró / Salió / Te queda** at a glance.
- **Quick add** — a pinned bar to drop a row into any table in seconds.
- **Categories** — group a table's expenses and see the breakdown.
- **Recurring entries** — a row that appears automatically every month in a range,
  editable or skippable for any single month.
- **Carry-over balance** — chain each month's closing balance into the next.
- **Notes & tags** — a per-cell note and a per-row category tag.
- **Dashboards** — a per-business **Panel** (trend, balance over time, profit vs. goal,
  top categories) and an **all-businesses** overview.
- **Year summary** + an **"Estado de resultados" PDF** (three formats) and CSV / Excel export.
- **Backup & restore** — the whole workspace to a single portable file.
- **Monthly goal**, **6 accent colors**, **light & dark**, monochrome or colorful charts.
- **Guided tour**, full **undo/redo**, keyboard-first editing.

## Tech

Tauri 2 (Windows + macOS) · React 19 · Vite · TypeScript · Zustand · CSS variables +
CSS Modules · recharts · react-rnd · @react-pdf/renderer · i18next · Vitest.

The codebase is split so the domain stays portable:

```
src/core/      domain model, pure finance compute, store, i18n, export — no React/Tauri/DOM
src/platform/  the only place native SDKs are imported (Tauri fs/dialog, IndexedDB)
src/ui/        the React app (imports @core only)
src-tauri/     the Rust desktop shell
```

Every financial figure comes from one tested compute layer, so the numbers on screen,
in the PDF, and in the CSV always match.

## Getting started

```bash
npm install
npm run dev          # web preview at http://localhost:1420
npm run tauri dev    # the desktop app (first run compiles Rust)
```

## Testing with example data

An empty table hides the bugs that only appear on a full month, so testing starts from a
restored backup rather than a blank document: open **Backup** in the app and restore a
`.json` export (yours, or a teammate's) to get a full month of real data to work against.

## Build & test

```bash
npm run build        # typecheck + production web bundle
npm run tauri build  # desktop app + installers (.msi / .exe on Windows)
npm test             # unit tests (focus: the compute layer)
```

## Privacy

Caja is **local-first**. Your data lives only on your machine — the document as a JSON
file (or IndexedDB in the web preview). Nothing is sent anywhere. Use **Backup** to move
your data between devices.

## License

[MIT](./LICENSE)
