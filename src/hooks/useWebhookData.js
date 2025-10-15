// src/hooks/useWebhookData.js
import { useCallback, useEffect, useRef, useState } from "react";

export default function useWebhookData(
  url,
  { refreshMs = null, fetchOnMount = true } = {}
) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!!fetchOnMount);
  const [error, setError] = useState(null);
  const controllerRef = useRef(null);

  const fetchOnce = useCallback(async () => {
    // cancel any in-flight request
    if (controllerRef.current) controllerRef.current.abort();
    const ctrl = new AbortController();
    controllerRef.current = ctrl;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      if (e.name !== "AbortError") setError(e);
    } finally {
      setLoading(false);
    }
  }, [url]);

  // fetch once on mount (if desired)
  useEffect(() => {
    if (fetchOnMount) fetchOnce();
    // cleanup: cancel in-flight on unmount
    return () => controllerRef.current?.abort();
  }, [fetchOnMount, fetchOnce]);

  // optional polling — only if refreshMs is a positive number
  useEffect(() => {
    if (!refreshMs || refreshMs <= 0) return;
    const id = setInterval(fetchOnce, refreshMs);
    return () => clearInterval(id);
  }, [refreshMs, fetchOnce]);

  return { data, loading, error, refresh: fetchOnce };
}
