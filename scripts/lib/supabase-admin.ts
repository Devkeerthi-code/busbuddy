import { createClient, type SupabaseClient } from '@supabase/supabase-js';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set. See .env.example.`);
  return value;
}

export const supabaseUrl = () => required('EXPO_PUBLIC_SUPABASE_URL');
export const publishableKey = () => required('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY');

/** Bypasses RLS. Scripts only: never import this from app code. */
export function adminClient(): SupabaseClient {
  return createClient(supabaseUrl(), required('SUPABASE_SECRET_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function userClient(): SupabaseClient {
  return createClient(supabaseUrl(), publishableKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Finds a user by email, creating it (already confirmed) if missing, and sets the password. */
export async function upsertUser(admin: SupabaseClient, email: string, password: string, name: string): Promise<string> {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email === email);
    if (found) {
      const { error: updateError } = await admin.auth.admin.updateUserById(found.id, { password, email_confirm: true });
      if (updateError) throw updateError;
      return found.id;
    }
    if (data.users.length < 200) break;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { name },
  });
  if (error) throw error;
  return data.user.id;
}
