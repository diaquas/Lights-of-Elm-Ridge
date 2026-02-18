import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Additional accessibility rules (jsx-a11y plugin is already included in next/core-web-vitals)
  {
    rules: {
      // Enforce alt text for images
      "jsx-a11y/alt-text": "error",
      // Ensure anchors have content
      "jsx-a11y/anchor-has-content": "error",
      // Ensure anchors are valid
      "jsx-a11y/anchor-is-valid": "warn",
      // Ensure aria attributes are valid
      "jsx-a11y/aria-props": "error",
      "jsx-a11y/aria-proptypes": "error",
      "jsx-a11y/aria-unsupported-elements": "error",
      // Require role attributes with valid values
      "jsx-a11y/role-has-required-aria-props": "error",
      "jsx-a11y/role-supports-aria-props": "error",
      // Interactive elements must be focusable
      "jsx-a11y/interactive-supports-focus": "warn",
      // Labels must have associated form controls
      "jsx-a11y/label-has-associated-control": "warn",
      // Media must have captions
      "jsx-a11y/media-has-caption": "warn",
      // No autofocus
      "jsx-a11y/no-autofocus": "warn",
      // Click handlers on non-interactive elements
      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/no-static-element-interactions": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Node CJS utility scripts (not part of the Next.js app)
    "scripts/**",
    // Supabase Edge Functions (Deno, not Node)
    "supabase/functions/**",
  ]),
]);

export default eslintConfig;
