# `supabase.ts`

**File:** `src/lib/supabase.ts`

The one Supabase client.

- Reads `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (never the secret key).
- Stores the session in AsyncStorage and refreshes tokens only while the app is in the foreground.

See also: [security-model.md](../security-model.md)
