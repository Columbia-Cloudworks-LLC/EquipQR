/**
 * Vercel builds the docs project with `Root Directory = docs`, so only
 * `docs/node_modules` is installed. PostCSS otherwise walks up to the repo-root
 * `postcss.config.js` and fails to resolve `@tailwindcss/postcss`.
 */
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
