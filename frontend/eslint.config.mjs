import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
  {
    rules: {
      // Downgrade new React 19.2 rules — pre-existing patterns are safe.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
    },
  },
  {
    // Prevent direct apiFetch imports outside src/lib/api — use domain API clients instead.
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      "src/lib/api/**",
      "src/lib/api.ts",
      "src/**/__tests__/**",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@/lib/api",
              importNames: ["apiFetch", "apiFetchVoid"],
              message: "Use a domain API client in src/lib/api/ instead of calling apiFetch directly.",
            },
            {
              name: "@/lib/api/internal/fetch",
              message: "Internal fetch module is reserved for src/lib/api/** clients. Use a domain API client instead.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
