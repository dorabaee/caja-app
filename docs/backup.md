# Backup and durability — where it stands, and what's missing

Written while splitting categories off descriptions, so the next iteration on backups
starts from a spec rather than from scratch. Nothing here is implemented yet beyond
"what exists today".

## What exists today

- **Local persistence.** The whole `AppDoc` is serialized on every change and written
  through the platform's `StorageAdapter`, debounced 500 ms, with a best-effort flush on
  `beforeunload` (`src/core/store/persist.ts`).
  - Desktop (Tauri): a JSON file on disk. Survives reinstalling the app.
  - Web: IndexedDB. Survives closing the browser, but **not** clearing site data, and it
    is per-browser and per-device.
- **Manual backup file.** `src/core/export/backup.ts` serializes the document to a
  self-contained `.caja.json` (`serializeBackup` / `parseBackup`), saved and restored
  through the file dialog. This is the only thing today that survives a wiped device.
- **Exports.** CSV / Excel / PDF are reports, not backups: they carry aggregates, not the
  document, so nothing can be restored from them.

## Gaps

1. **No snapshot history.** There is exactly one stored document. A bad edit, a mistaken
   delete, or a corrupt write has nothing to fall back on — undo is in memory only and
   dies with the session.
2. **No restore-previous-version UI.** Even if snapshots existed, nothing surfaces them.
3. **Nothing prompts a backup.** A user who never opens the menu has no backup file, and
   will not discover that until they need one.
4. **Web storage is not durable.** IndexedDB is evictable. `navigator.storage.persist()`
   is never requested, so a browser under pressure may drop the document.
5. **No integrity check on restore.** `parseBackup` validates the shape but not that the
   document is internally consistent (e.g. charts pointing at tables that exist).

## Sketch for the next iteration

- Keep the last N documents (N ≈ 10) under rolling keys, written on a coarser schedule
  than the live document — say the first change of each hour, plus one on unload — so the
  history spans days rather than seconds.
- A "Restaurar copia" list in Ajustes: timestamp, business count, size; restoring writes
  a snapshot of the *current* state first, so restoring is itself undoable.
- Call `navigator.storage.persist()` on first boot in the web build.
- Offer the `.caja.json` export on a cadence (monthly, or after N changes since the last
  one), dismissible, never nagging.
- Verify a restored document through `migrateDoc` before it replaces anything.

Snapshots share the document's storage; a size ceiling and eviction of the oldest entry
must land with them, or a large multi-business document will fill the quota.
