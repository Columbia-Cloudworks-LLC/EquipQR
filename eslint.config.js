import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "supabase/functions", "scripts", "coverage"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "no-empty": "warn",
      "no-useless-catch": "warn",
      // Disallow console usage in src except errors; allow in Supabase edge functions via ignores above
      "no-console": [
        "warn",
        { allow: ["error"] }
      ],
    },
  },
  // Journey test guardrails - prevent hook-mocking anti-patterns
  {
    files: ["src/tests/journeys/**/*.{ts,tsx}"],
    rules: {
      // Discourage importing hooks directly in journey tests
      // Journey tests should render pages/components, not test hooks in isolation
      "no-restricted-imports": [
        "warn",
        {
          patterns: [
            {
              group: ["@/hooks/*", "@/features/*/hooks/*", "@/features/*/hooks/**"],
              message: "Journey tests should render page components, not import hooks directly. Hooks used within components are allowed."
            },
            {
              group: ["@/test/utils/test-utils"],
              importNames: ["renderHookAsPersona", "renderHookWithCustomPersona"],
              message: "Journey tests should not use renderHook*. Use renderJourney to render actual page components."
            }
          ]
        }
      ]
    }
  }
);
