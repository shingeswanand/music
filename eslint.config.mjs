import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["server/**/*.js"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  // Generated service workers and browser reports are not application source.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "public/workbox-*.js",
    "test-results/**",
    "playwright-report/**",
    ".arena/**",
  ]),
]);

export default eslintConfig;
