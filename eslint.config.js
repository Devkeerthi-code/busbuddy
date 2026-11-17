const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // The edge function runs on Deno (npm: specifiers); it is checked with `deno check` instead.
    ignores: ['dist/*', 'coverage/*', 'supabase/functions/ingest-position/*'],
  },
]);
