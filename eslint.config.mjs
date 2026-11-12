import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import vue from "eslint-plugin-vue";
import tseslint from "typescript-eslint";

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
    files: ["**/*.vue"],
    languageOptions: {
      globals: { window: "readonly" },
      parserOptions: { parser: tseslint.parser },
    },
    // Prettier owns template layout; keep Vue's semantic checks enabled.
    rules: {
      "vue/html-closing-bracket-newline": "off",
      "vue/html-indent": "off",
      "vue/max-attributes-per-line": "off",
      "vue/singleline-html-element-content-newline": "off",
      "vue/html-self-closing": "off",
    },
  },
);
