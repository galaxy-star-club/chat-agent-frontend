import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [
        { group: ["@prisma/*", "prisma", "@agentic-chat/backend", "@agentic-chat/backend/*", "**/backend/**"], message: "Use the typed backend HTTP contract; backend code must not enter the frontend." },
      ] }],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/http.ts", "src/**/*.test.ts", "src/**/*.test.tsx", "src/test/**"],
    rules: {
      "no-restricted-syntax": ["error",
        { selector: "CallExpression[callee.name='fetch']", message: "First-party requests belong in src/lib/http.ts." },
        { selector: "CallExpression[callee.property.name='fetch']", message: "First-party requests belong in src/lib/http.ts." },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
