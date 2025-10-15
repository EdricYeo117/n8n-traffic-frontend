import { useCallback, useEffect, useRef, useState } from "react";

const useRetrieveSpeedBands = (url, { refreshMs = 60000 } = {}) => {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const abortRef = useRef(null);

  const load = useCallback(async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      setLoading(true);
      setError(null);
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: { "cache-control": "no-cache" },
        mode: "cors",
      });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const json = await res.json();
      setData(json);
      setUpdatedAt(new Date());
    } catch (e) {
      if (e.name !== "AbortError") setError(e);
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, [load]);

  useEffect(() => {
    if (!refreshMs) return;
    const id = setInterval(load, refreshMs);
    return () => clearInterval(id);
  }, [load, refreshMs]);

  return { data, loading, error, updatedAt, refresh: load };
};

export default useRetrieveSpeedBands;
