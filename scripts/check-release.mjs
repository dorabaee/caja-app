import { readFileSync } from 'node:fs';
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const config = JSON.parse(readFileSync('src-tauri/tauri.conf.json', 'utf8'));
const cargo = readFileSync('src-tauri/Cargo.toml', 'utf8').match(/^version = "([^"]+)"/m)?.[1];
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
if ([config.version, cargo, lock.version, lock.packages[''].version].some(v => v !== pkg.version)) {
  throw new Error('Versions must match in package.json, package-lock.json, Cargo.toml, and tauri.conf.json.');
}
const releaseTag = process.env.CAJA_RELEASE_TAG ||
  (process.env.GITHUB_REF_TYPE === 'tag' ? process.env.GITHUB_REF_NAME : undefined);
if (releaseTag && releaseTag !== `v${pkg.version}`) {
  throw new Error(`Release tag must be v${pkg.version}`);
}
console.log(`Release configuration valid: v${pkg.version}`);
