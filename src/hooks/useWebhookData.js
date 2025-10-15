import { useEffect, useRef, useState } from "react";

export default function useWebhookData(
  url,
  { refreshMs = 30000, method = "GET", body = null, headers = {} } = {}
) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);
  const abortRef = useRef(null);

  const fetchOnce = async (signal) => {
    try {
      // only show "loading" spinner if we don't have any data yet
      setLoading((prev) => (data == null ? true : prev));
      const res = await fetch(
        method === "GET" ? `${url}?t=${Date.now()}` : url,
        {
          method,
          headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...headers },
          body: body && method !== "GET" ? JSON.stringify(body) : undefined,
          cache: "no-store",
          mode: "cors",
          credentials: "omit",
          signal,
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (e) {
      if (e.name !== "AbortError") setError(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // cancel any in-flight call
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // initial fetch
    fetchOnce(controller.signal);

    // polling
    if (refreshMs > 0) {
      timerRef.current = setInterval(() => {
        const c = new AbortController();
        abortRef.current = c;
        fetchOnce(c.signal);
      }, refreshMs);
    }
    return () => {
      controller.abort();
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, method, refreshMs]);

  const refresh = () => {
    const c = new AbortController();
    abortRef.current?.abort();
    abortRef.current = c;
    return fetchOnce(c.signal);
  };

  return { data, error, loading, refresh };
}
