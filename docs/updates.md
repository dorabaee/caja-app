# Caja in-app updates

Caja checks once when a packaged desktop build opens. Settings has a manual check
with up-to-date, failure/retry, and available-update states. A newer release adds
an Auto-update button to the sidebar. Clicking downloads the signed installer,
saves pending document writes, installs, and restarts. Browser previews and Tauri
development builds do not check or install updates.

## Repository

The public `dorabaee/caja-app` repository hosts both source and releases. The app
reads `https://github.com/dorabaee/caja-app/releases/latest/download/latest.json`
without a GitHub token. It never sends the user's business data to GitHub.
If the source becomes private, move release assets to a public release repository
or authenticated update service, and ship the new endpoint before that change.

## One-time signing setup

A Caja-specific signing key was generated locally at `.signing/caja.key`; this
directory is ignored by Git. Back it up securely: existing installations trust
its matching public key in `src-tauri/tauri.conf.json`. Do not regenerate the key
for each release, commit it, or use Sayso's signing key.

In this repository's Settings → Secrets and variables → Actions, set
`TAURI_SIGNING_PRIVATE_KEY` to the contents of that private key file. The generated
key has an empty password; `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` can stay unset.
This secret has not been uploaded automatically.

For a local signed Windows build in PowerShell:

```powershell
$env:TAURI_SIGNING_PRIVATE_KEY = (Resolve-Path .signing/caja.key).Path
$env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = ''
npm run tauri build -- --bundles nsis --ci
```

Updater signatures verify downloads; Windows Authenticode signing is a separate
configuration and is not configured by this workflow.

## Release a version

1. Bump the version consistently in `package.json`, `package-lock.json`,
   `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json`. Update `releaseDate` in
   `package.json`, and refresh `Cargo.lock` with Cargo.
2. Run `node scripts/check-release.mjs`, `npm test`, and `npm run build`.
3. Commit and push the changes, then push a matching tag, for example `v0.2.6`.
4. The Windows workflow builds a signed NSIS installer and creates a **draft**
   release with the installer, signature, and `latest.json`. Review the assets
   and release notes, then publish it. Drafts are invisible to update checks.

The workflow currently ships Windows x64 only. Additional desktop platforms need
their own build jobs and updater assets before distributing those builds.

## First-install and end-to-end verification

Install the first updater-enabled build manually. An older Caja executable without
this feature cannot discover it. Install a lower signed version, then publish a
higher signed version and verify: launch detection, Settings manual check, sidebar
download progress, restart into the new version, and preserved business data.
Also test offline checks/retry and a rejected signature. The automated tests mock
the plugin; they do not substitute for this two-version installer test.
