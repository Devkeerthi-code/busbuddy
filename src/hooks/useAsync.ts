import { useCallback, useEffect, useState } from 'react';
import { friendlyError } from '@/lib/errors';

type State<T> = { data: T | null; error: string | null; loading: boolean };

/**
 * Loads data when `load` changes and exposes `reload` for pull-to-refresh.
 * Keeps the last good data on a failed refresh, so a flaky network never blanks a screen.
 * Pass a stable function (useCallback) so it doesn't refetch on every render.
 */
export function useAsync<T>(load: () => Promise<T>) {
  const [state, setState] = useState<State<T>>({ data: null, error: null, loading: true });

  const apply = useCallback(
    (promise: Promise<T>, isActive: () => boolean = () => true) =>
      promise.then(
        (data) => {
          if (isActive()) setState({ data, error: null, loading: false });
        },
        (error: unknown) => {
          if (isActive()) setState((s) => ({ ...s, error: friendlyError(error), loading: false }));
        },
      ),
    [],
  );

  useEffect(() => {
    let active = true;
    void apply(load(), () => active);
    return () => {
      active = false;
    };
  }, [load, apply]);

  const reload = useCallback(() => apply(load()), [load, apply]);
  return { ...state, reload };
}
