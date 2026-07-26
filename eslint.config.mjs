// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import { FlatCompat } from "@eslint/eslintrc";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import storybook from "eslint-plugin-storybook";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  ...storybook.configs["flat/recommended"]
];

const isProduction = process.env.NODE_ENV === "production";

eslintConfig.push({
  plugins: {
    "jsx-a11y": jsxA11y,
    "simple-import-sort": simpleImportSort,
    "react-hooks": reactHooks,
  },
  rules: {
    // In production builds treat any console usage as an error to avoid
    // leaking sensitive data (warnings during development remain helpful).
    "no-console": isProduction ? ["error", { allow: ["warn", "error"] }] : "warn",
    "jsx-a11y/control-has-associated-label": "error",
    "jsx-a11y/interactive-supports-focus": "error",
    "simple-import-sort/imports": "error",
    "simple-import-sort/exports": "error",
    ...reactHooks.configs.recommended.rules,
  },
});

export default eslintConfig;
