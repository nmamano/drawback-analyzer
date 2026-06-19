import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

export default tseslint.config(
  {
    ignores: ["**/dist/**", "**/node_modules/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    // Node-run browser-driver scripts (the e2e gate + the live smoke). Linted, not
    // ignored. Globals are listed explicitly (node + Bun + the few browser names used
    // inside page.evaluate callbacks) so accidental undeclared globals still fail.
    files: ["tests/e2e/**/*.mjs", "scripts/**/*.mjs"],
    languageOptions: {
      sourceType: "module",
      globals: {
        ...globals.node,
        Bun: "readonly",
        window: "readonly",
        document: "readonly",
      },
    },
  },
);
