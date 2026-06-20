import js from "@eslint/js";
import tseslint from "typescript-eslint";

const eslintConfig = [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: [".next/**", "node_modules/**", "out/**", "data/**"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off"
    }
  }
];

export default eslintConfig;
