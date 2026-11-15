import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useApp } from '../ctx/AppContext';

/**
 * Load data for a screen. Reloads when the screen gains focus, when any data changes (app version bump), or when `deps` change.
 * `loading` is true only for the first load so lists do not flash skeletons on every refresh.
 */
export function useData<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const { version } = useApp();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);
  const run = useCallback(async () => {
    const n = ++seq.current;
    try { const d = await loader(); if (n === seq.current) { setData(d); setError(null); } }
    catch (e: any) { if (n === seq.current) setError(String(e?.message || e)); }
    finally { if (n === seq.current) setLoading(false); }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { run(); }, [run, version]);
  useFocusEffect(useCallback(() => { run(); }, [run]));
  return { data, loading, error, reload: run };
}

export function useDebounced<T>(value: T, ms = 220): T {
  const [v, setV] = useState(value);
  useEffect(() => { const id = setTimeout(() => setV(value), ms); return () => clearTimeout(id); }, [value, ms]);
  return v;
}
