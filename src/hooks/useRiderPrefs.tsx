import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '@/lib/auth';
import { clearLocalPrefs, loadLocalPrefs, loadRemotePrefs, savePrefs, track, type RiderPrefs } from '@/lib/rider-data';

type Value = {
  ready: boolean;
  prefs: RiderPrefs | null;
  save: (prefs: RiderPrefs) => Promise<void>;
  /** back to the question screen */
  reset: () => Promise<void>;
};

const RiderPrefsContext = createContext<Value | null>(null);

export function RiderPrefsProvider({ children }: { children: ReactNode }) {
  const { session, membership } = useAuth();
  const [prefs, setPrefs] = useState<RiderPrefs | null>(null);
  const [ready, setReady] = useState(false);
  const userId = session?.user.id;

  useEffect(() => {
    let active = true;
    loadLocalPrefs().then((local) => {
      if (!active) return;
      if (local) {
        setPrefs(local);
        setReady(true);
      }
      if (!userId) return setReady(true);
      loadRemotePrefs(userId)
        .then((remote) => active && remote && setPrefs(remote))
        .catch(() => undefined)
        .finally(() => active && setReady(true));
    });
    return () => {
      active = false;
    };
  }, [userId]);

  const save = useCallback(
    async (next: RiderPrefs) => {
      if (!userId || !membership) return;
      await savePrefs(userId, membership.college_id, next);
      setPrefs(next);
      track('rider_set_stop');
    },
    [userId, membership],
  );

  const reset = useCallback(async () => {
    await clearLocalPrefs();
    setPrefs(null);
  }, []);

  const value = useMemo(() => ({ ready, prefs, save, reset }), [ready, prefs, save, reset]);
  return <RiderPrefsContext.Provider value={value}>{children}</RiderPrefsContext.Provider>;
}

export function useRiderPrefs(): Value {
  const value = useContext(RiderPrefsContext);
  if (!value) throw new Error('useRiderPrefs must be used inside RiderPrefsProvider');
  return value;
}
