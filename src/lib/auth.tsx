import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase } from './supabase';
import type { Membership } from './types';

type AuthValue = {
  ready: boolean;
  session: Session | null;
  membership: Membership | null;
  isPlatformAdmin: boolean;
  refreshMembership: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

async function loadMembership(userId: string) {
  const [membership, platform] = await Promise.all([
    supabase
      .from('memberships')
      .select('college_id, role, display_name, colleges(name, campus_name, is_demo, timezone)')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase.from('platform_admins').select('user_id').eq('user_id', userId).maybeSingle(),
  ]);
  if (membership.error) throw membership.error;
  return { membership: (membership.data as Membership | null) ?? null, isPlatformAdmin: !!platform.data };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [isPlatformAdmin, setPlatformAdmin] = useState(false);

  const refreshFor = useCallback(async (next: Session | null) => {
    if (!next) {
      setMembership(null);
      setPlatformAdmin(false);
      return;
    }
    try {
      const result = await loadMembership(next.user.id);
      setMembership(result.membership);
      setPlatformAdmin(result.isPlatformAdmin);
    } catch {
      // Offline at launch: keep whatever we had; screens show their own offline state.
    }
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await refreshFor(data.session);
      if (active) setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      // Never call Supabase inside this callback: it runs while the auth lock is held and
      // can deadlock other requests. Defer to the next tick instead (per supabase-js docs).
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') setTimeout(() => void refreshFor(next), 0);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [refreshFor]);

  const value = useMemo<AuthValue>(
    () => ({
      ready,
      session,
      membership,
      isPlatformAdmin,
      refreshMembership: () => refreshFor(session),
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [ready, session, membership, isPlatformAdmin, refreshFor],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
