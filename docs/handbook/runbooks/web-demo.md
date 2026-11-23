# Publish the web demo

**When:** Updating the GitHub Pages site.

1. Pages source must be **GitHub Actions** and the repo needs the `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` secrets.
2. Push to `main`; the "Web demo (GitHub Pages)" workflow tests, exports and deploys.
3. Laptop link: `https://<user>.github.io/busbuddy/`. Phone link: `.../busbuddy/phone/`.
4. Deep links work because the workflow copies `index.html` to `404.html`.
