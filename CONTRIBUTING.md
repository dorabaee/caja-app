# Contributing to Caja

Thanks for helping improve Caja. Windows is the supported desktop platform today; macOS support is planned.

## Start locally

Use Node.js 22 and run `npm ci`, then `npm run dev`. Native development also needs Rust and the Windows C++ build tools. Keep changes focused and use a separate branch.

Run `npm test` and `npm run build` before submitting a pull request. For calculation changes, include a test that demonstrates the expected result. For UI changes, check Spanish and English, light and dark themes, and keyboard access. Include a screenshot using fictional data when it helps explain the change.

## Data and credentials

Never commit business backups, financial records, signing keys, access tokens, or local environment files. Use built-in example data to reproduce issues. `.signing/` and `__verify/` are intentionally local-only.

## Pull requests

Explain the problem, resulting behavior, and relevant validation. Link a related issue if one exists. Changes to the financial model should state which records contribute to each total. Native updater changes must preserve signature verification and save-before-install ordering.
