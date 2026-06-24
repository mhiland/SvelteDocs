import js from '@eslint/js'
import svelte from 'eslint-plugin-svelte'
import svelteParser from 'svelte-eslint-parser'
import globals from 'globals'

export default [
  {
    ignores: ['node_modules/', 'demo-dist/', 'demo/public/docs-content/', 'package-lock.json'],
  },
  js.configs.recommended,
  ...svelte.configs['flat/recommended'],

  // ES modules everywhere.
  {
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'module',
    },
  },

  // Runtime engine — runs in the browser.
  {
    files: ['src/**/*.js', 'src/**/*.svelte'],
    languageOptions: {
      globals: { ...globals.browser },
    },
  },

  // Build toolkit + root config files — run in Node.
  {
    files: ['build/**/*.js', '*.config.js'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // Demo — a browser app (Vite entry + components).
  {
    files: ['demo/**/*.js', 'demo/**/*.svelte'],
    languageOptions: {
      globals: { ...globals.browser },
    },
  },

  // Svelte parser for component files.
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parser: svelteParser,
      parserOptions: { extraFileExtensions: ['.svelte'] },
    },
  },

  // Deliberate, reviewed engine patterns that the svelte recommended config
  // flags. Scoped narrowly and documented rather than suppressed inline.
  {
    files: ['src/**/*.js', 'src/**/*.svelte'],
    rules: {
      // The engine uses plain Set/Map/URL as non-reactive data structures
      // (session caches, lookup sets, local URL parsing) — not reactive state —
      // so SvelteSet/SvelteMap/SvelteURL would add overhead for no benefit.
      'svelte/prefer-svelte-reactivity': 'off',
      // The svelte-ignore comments here silence the Svelte *compiler's* a11y
      // warnings on click-to-close scrims/overlays (which have keyboard
      // equivalents elsewhere). eslint-plugin-svelte can't see those, so it
      // wrongly reports the comments as unused.
      'svelte/no-unused-svelte-ignore': 'off',
    },
  },

  // Page injects build-time-sanitized, first-party HTML via {@html} by design
  // (rehype-sanitize, no allowDangerousHtml). Keep the rule on everywhere else.
  {
    files: ['src/components/Page.svelte'],
    rules: {
      'svelte/no-at-html-tags': 'off',
    },
  },
]
