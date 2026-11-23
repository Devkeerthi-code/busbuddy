# Release a new Android build

**When:** After app changes that drivers or students need.

1. Bump `version` in `app.config.ts` for user-visible releases.
2. `eas build -p android --profile preview` for an installable APK.
3. Share the install page link; Android asks once to allow installs from the browser.
4. Drivers must update before their next trip if location code changed.
