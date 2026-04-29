// @indiepilot/eslint-config — flat-config sidecar.
// Hosts custom rules ESLint owns (Biome can't author rules); Biome owns the
// formatter + most of the lint surface. Phase 1 ships exactly one rule:
// `indiepilot/no-raw-log`, the structural defense for FOUND-04.
const tseslint = require("typescript-eslint");
const noRawLog = require("./rules/no-raw-log.js");

/** @type {import("eslint").Linter.Config[]} */
module.exports = [
  ...tseslint.configs.recommended,
  {
    files: ["apps/**/*.{ts,tsx}", "packages/**/*.ts"],
    plugins: {
      indiepilot: { rules: { "no-raw-log": noRawLog } },
    },
    rules: {
      "indiepilot/no-raw-log": "error",
      // Biome owns the rest; ESLint sidecar only enforces what Biome can't.
    },
  },
  {
    // ESLint config files are CJS — relax type-aware rules there.
    files: ["**/*.js", "**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-var-requires": "off",
    },
  },
];
