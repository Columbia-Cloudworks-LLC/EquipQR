# Shared configuration

Tool-owned files stay at the repo root when the tool looks there by default.

That includes `package.json`, `vite.config.ts`, `eslint.config.js`, `tsconfig*.json`, Playwright configs, `vercel.json`, Qodo's `best_practices.md`, and GitHub community files.

This folder holds configs we already load by explicit path.

- `root-layout.json` is the allowlist enforced by `npm run verify:root-layout`.
- `lint/` is the lint catalog consumed by `dev/lint-catalog.mjs`.
