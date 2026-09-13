# Publishing a Windows release

Caja currently ships Windows x64 installers. macOS is planned, not published.

1. Keep the version synchronized in package.json, package-lock.json, Cargo.toml, Cargo.lock, and tauri.conf.json. Update package.json's releaseDate.
2. Run `node scripts/check-release.mjs`, `npm test`, and review the localhost build.
3. Build the NSIS installer with the existing updater signing key. Keep that key local and never commit it. Set TAURI_SIGNING_PRIVATE_KEY to its path and TAURI_SIGNING_PRIVATE_KEY_PASSWORD appropriately, then run `npm run tauri build -- --bundles nsis --ci`.
4. Commit the reviewed source and documentation. Tag the exact commit as vVERSION.
5. Create a draft GitHub release with the NSIS .exe, its .sig, latest.json, and SHA256SUMS.txt. latest.json must include the matching version, public asset URL, and signature for windows-x86_64.
6. Verify the assets and publish the release as latest. Download the published installer and compare its SHA-256 hash with the built artifact.
7. Install locally, verify the displayed version, and confirm existing records were preserved. Test the update path from the previous installed version when applicable.

The release workflow is an optional manual alternative for maintainers who have provisioned GitHub Actions signing secrets. Local signing is used when those secrets are not configured. Signing keys must never be printed in logs or stored in release artifacts.
