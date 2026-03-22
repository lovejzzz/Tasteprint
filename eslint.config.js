import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^(React|_)" }],
      "no-empty": ["error", { allowEmptyCatch: false }],
    },
  },
  {
    // Vitest globals: matches `globals: true` in vitest.config.js so test files
    // can use describe/it/expect/vi without explicit imports and without no-undef errors.
    files: ["src/__tests__/**"],
    languageOptions: {
      globals: {
        describe: "readonly",
        it: "readonly",
        expect: "readonly",
        test: "readonly",
        vi: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
      },
    },
  },
  {
    files: ["src/components/chatAI.js"],
    rules: {
      // Prototype-heavy module with intentionally parked heuristics and placeholders.
      // Keep lint signal strong elsewhere while avoiding warning noise here.
      "no-unused-vars": "off",
    },
  },
  {
    ignores: ["dist/**", ".next/**", "coverage/**"],
  },
];
