const indiepilot = require("@indiepilot/eslint-config");

module.exports = [
  // Global ignores — ESLint 9 flat config replaces .eslintignore.
  {
    ignores: [
      "**/.next/**",
      "**/dist/**",
      "**/.turbo/**",
      "**/coverage/**",
      "**/.vercel/**",
      "**/node_modules/**",
      "**/drizzle/**",
    ],
  },
  ...indiepilot,
];
