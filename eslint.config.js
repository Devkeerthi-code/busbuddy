const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // The edge function runs on Deno (npm: specifiers); it is checked with `deno check` instead.
    // The map worker is a vendored maplibre bundle copied into public/ at build time.
    ignores: ['dist/*', 'coverage/*', 'supabase/functions/ingest-position/*', 'public/maplibre-gl-worker.mjs', '.expo/*'],
  },
  {
    files: ['scripts/**/*.js'],
    languageOptions: { globals: { __dirname: 'readonly', require: 'readonly' } },
  },
]);
