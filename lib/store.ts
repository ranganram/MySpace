'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

/**
 * Loads a JSON value for the signed-in user under `key` from myspace_data_v2,
 * and writes through to Supabase on every setValue call. Mirrors the
 * key/value S.g()/S.s() pattern from the original app.
 */
export function useStore<T>(key: string, defaultValue: T) {
  const supabase = createClient();
  const [value, setValueState] = useState<T>(defaultValue);
  const [loaded, setLoaded] = useState(false);
  const userIdRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    userIdRef.current = user.id;
    const { data } = await supabase
      .from('myspace_data_v2')
      .select('value')
      .eq('user_id', user.id)
      .eq('key', key)
      .maybeSingle();
    if (data?.value !== undefined && data?.value !== null) setValueState(data.value as T);
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      userIdRef.current = user.id;
      const { data } = await supabase
        .from('myspace_data_v2')
        .select('value')
        .eq('user_id', user.id)
        .eq('key', key)
        .maybeSingle();
      if (!cancelled) {
        if (data?.value !== undefined && data?.value !== null) setValueState(data.value as T);
        setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const setValue = useCallback(
    (updater: T | ((prev: T) => T)) => {
      setValueState((prev) => {
        const next = typeof updater === 'function' ? (updater as (p: T) => T)(prev) : updater;
        const uid = userIdRef.current;
        if (uid) {
          supabase
            .from('myspace_data_v2')
            .upsert({ user_id: uid, key, value: next }, { onConflict: 'user_id,key' })
            .then(({ error }) => {
              if (error) console.warn('save failed for', key, error);
            });
        }
        return next;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  return { value, setValue, loaded, reload: load };
}
