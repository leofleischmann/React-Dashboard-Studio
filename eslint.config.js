import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

// Minimal, high-signal lint: catch the regressions automated checks should catch
// (leftover console logging, debugger, broken hook usage) without flooding the
// existing code with stylistic noise.
export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'custom_components/**',
      'docs/**',
      'scripts/**',
      '**/*.generated.ts',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaFeatures: { jsx: true }, sourceType: 'module' },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'no-new-func': 'error',
      'react-hooks/rules-of-hooks': 'error',
    },
  },
  {
    files: ['src/sdk/debug/db.ts'],
    rules: { 'no-console': 'off' },
  },
);
