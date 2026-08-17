// import js from "@eslint/js";
// import globals from "globals";
// import tseslint from "typescript-eslint";
// import { defineConfig } from "eslint/config";

// export default defineConfig([
//   { files: ["**/*.{js,mjs,cjs,ts,mts,cts}"], plugins: { js }, extends: ["js/recommended"], languageOptions: { globals: globals.browser } },
//   { files: ["**/*.js"], languageOptions: { sourceType: "script" } },
//   tseslint.configs.recommended,
// ]);


import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";


/** @type {import('eslint').Linter.Config[]} */
export default [
  {files: ["**/*.{js,mjs,cjs,ts}"]},
  {languageOptions: { globals: globals.node }},
  {
    ignores: ['node_modules', 'dist'],
    rules: {
      'no-unused-vars': 'error',
      'no-undef': 'error',
      'no-unused-expressions': 'error',
      'prefer-const': 'error',
      'no-console': 'warn',
       "endOfLine": "lf"
    },
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
];