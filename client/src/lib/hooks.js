import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';

// Loads a GET endpoint, optionally polling. Keeps old data on screen while refreshing.
export function useFetch(path, { interval, enabled = true } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const seq = useRef(0);

  const load = useCallback(async (silent) => {
    if (!path) return;
    const id = ++seq.current;
    if (!silent) setState((s) => ({ ...s, loading: true }));
    try {
      const data = await api(path);
      if (id === seq.current) setState({ data, error: null, loading: false });
    } catch (error) {
      if (id === seq.current) setState((s) => ({ data: s.data, error, loading: false }));
    }
  }, [path]);

  useEffect(() => {
    if (!enabled) return undefined;
    load(false);
    if (!interval) return undefined;
    const t = setInterval(() => load(true), interval);
    return () => clearInterval(t);
  }, [load, interval, enabled]);

  return { ...state, reload: () => load(true) };
}

export function useServices() {
  const { data } = useFetch('/service/resources');
  const list = data?.services || [];
  return { list, name: (id) => list.find((s) => s.id === id)?.name || id };
}

export function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}
