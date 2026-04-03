import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Ignore leftover worktree directories
    ".claude/worktrees/**",
  ]),
  // Downgrade react-compiler plugin rules to warnings.
  // These patterns appear throughout code ported from the desktop version and
  // are not dangerous — they're flagged by a stricter-than-standard heuristic.
  {
    rules: {
      // Downgrade react-compiler heuristic rules to warnings.
      // These patterns appear throughout code ported from the desktop version
      // and are not dangerous — they're flagged by a stricter-than-standard heuristic.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      // Allow intentionally-unused function parameters prefixed with _ (e.g. _request, _args).
      // Keep args:"after-used" (Next.js default) to avoid flagging additional pre-existing args.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { args: "after-used", argsIgnorePattern: "^_" },
      ],
    },
  },
]);

export default eslintConfig;
