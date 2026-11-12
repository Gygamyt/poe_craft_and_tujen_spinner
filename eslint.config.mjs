import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import vue from "eslint-plugin-vue";
import tseslint from "typescript-eslint";
import featureBoundaries from "./tools/eslint/feature-boundaries.mjs";

export default defineConfig(
  { ignores: ["out/**", "tmp/**"] },
  {
    files: ["**/*.mjs"],
    extends: [js.configs.recommended],
  },
  {
    files: ["**/*.ts", "**/*.vue"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
  },
  ...vue.configs["flat/recommended"],
  {
    files: ["src/**/*.ts", "src/**/*.vue"],
    plugins: { architecture: { rules: { "feature-boundaries": featureBoundaries } } },
    rules: { "architecture/feature-boundaries": "error" },
  },
  {
    files: ["**/*.vue"],
    languageOptions: {
      globals: { window: "readonly" },
      parserOptions: { parser: tseslint.parser },
    },
    // Prettier owns template layout; keep Vue's semantic checks enabled.
    rules: {
      // vue-tsc resolves TypeScript names, including DOM-only types such as KeyboardEvent.
      "no-undef": "off",
      "vue/html-closing-bracket-newline": "off",
      "vue/html-indent": "off",
      "vue/max-attributes-per-line": "off",
      "vue/singleline-html-element-content-newline": "off",
      "vue/html-self-closing": "off",
    },
  },
);
