import "./App.css";
import React, { useMemo } from "react";

import SingaporeTrafficMap from "./SingaporeTrafficMap";
import Dashboard from "./Dashboard";
import useWebhookData from "./hooks/useWebhookData";
import JSONPanel from "./JSONPanel";
import TrafficInsights from "./TrafficInsights";

// ---- incidents normalizer (kept from your current app) ----
const normalizeIncidents = (raw) => {
  const root = Array.isArray(raw) ? raw[0] : raw;
  const rows = Array.isArray(root?.rows) ? root.rows : Array.isArray(raw) ? raw : [];
  const sevFromType = (t) => {
    const x = (t || "").toUpperCase();
    if (x.includes("ACCIDENT")) return 5;
    if (x.includes("VEHICLE BREAKDOWN")) return 2;
    if (x.includes("HEAVY TRAFFIC")) return 3;
    if (x.includes("ROADWORK")) return 1;
    return 1;
  };
  return rows
    .filter((r) => r.LATITUDE != null && r.LONGITUDE != null)
    .map((r) => {
      const type = r.INCIDENT_TYPE ?? r.type ?? "";
      const msg  = r.MESSAGE ?? r.message ?? "";
      const ts   = r.APPROX_TIME ?? r.timestamp ?? null;
      return {
        kind: "INCIDENT",
        lat: Number(r.LATITUDE),
        lon: Number(r.LONGITUDE),
        severity: sevFromType(type),
        title: type || "Incident",
        type,
        message: msg,
        timestamp: ts,
        id: r.INCIDENT_ID ?? undefined,
      };
    });
};

const coerceSpeedData = (raw) => {
  if (!raw) return { rows: [] };
  if (Array.isArray(raw?.rows)) return raw;
  if (Array.isArray(raw) && Array.isArray(raw[0]?.rows)) return raw[0];
  if (Array.isArray(raw)) return { rows: raw };
  return { rows: [] };
};

// ---- endpoints ----
const API_BASE =
  process.env.REACT_APP_API_BASE ??
  import.meta?.env?.VITE_API_BASE ??
  "http://localhost:5678";

const SPEED_URL = `${API_BASE}/webhook/speed-bands`;
const INCIDENT_URL = `${API_BASE}/webhook/incidents`;

// Your insights webhook (as provided). If your path differs, edit below.
const INSIGHTS_URL = `${API_BASE}/webhook/AgentResponse`;

function App() {
  // Speed Bands
  const {
    data: speedRaw,
    error: speedErr,
    loading: speedLoading,
    refresh: refreshSpeed,
  } = useWebhookData(SPEED_URL, { refreshMs: 0, fetchOnMount: true });

  // Incidents
  const {
    data: incRaw,
    error: incErr,
    loading: incLoading,
    refresh: refreshInc,
  } = useWebhookData(INCIDENT_URL, { refreshMs: 0, fetchOnMount: true });

  // Insights (LLM output with prose + JSON)
  const {
    data: insightsRaw,
    error: insightsErr,
    loading: insightsLoading,
    refresh: refreshInsights,
  } = useWebhookData(INSIGHTS_URL, { refreshMs: 0, fetchOnMount: true });

  const speedData = useMemo(() => coerceSpeedData(speedRaw), [speedRaw]);
  const incidents = useMemo(() => normalizeIncidents(incRaw), [incRaw]);

  const previewRows = useMemo(() => {
    const root = Array.isArray(speedRaw) ? speedRaw[0] : speedRaw;
    return Array.isArray(root?.rows) ? root.rows : [];
  }, [speedRaw]);

  return (
    <div className="App" style={{ padding: 16 }}>
      <h2 style={{ margin: "8px 0 16px" }}>Singapore Traffic Monitor</h2>

      {/* status + manual refresh */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: "#666" }}>
          Speed: {speedLoading ? "Loading…" : speedErr ? "Error" : "Loaded"}
        </span>
        <button onClick={refreshSpeed}>Refresh speed bands</button>

        <span style={{ fontSize: 12, color: "#666" }}>
          Incidents: {incLoading ? "Loading…" : incErr ? "Error" : "Loaded"}
        </span>
        <button onClick={refreshInc}>Refresh incidents</button>

        <span style={{ fontSize: 12, color: "#666" }}>
          Insights: {insightsLoading ? "Loading…" : insightsErr ? "Error" : "Loaded"}
        </span>
        <button onClick={refreshInsights}>Refresh insights</button>
      </div>

      {(speedErr || incErr || insightsErr) && (
        <div style={{ marginBottom: 10, color: "#b91c1c", fontSize: 13 }}>
          {speedErr ? `Speed webhook error: ${speedErr.message}. ` : ""}
          {incErr ? `Incidents webhook error: ${incErr.message}. ` : ""}
          {insightsErr ? `Insights webhook error: ${insightsErr.message}.` : ""}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 16,
          alignItems: "stretch",
        }}
      >
        {/* Map */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #eee",
            borderRadius: 12,
            padding: 8,
            height: 600,
          }}
        >
          <SingaporeTrafficMap speedData={speedData} incidents={incidents} />
        </div>

        {/* Right rail: dashboard + insights */}
        <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
          <Dashboard speedData={speedData} incidents={incidents} />
          <TrafficInsights
            data={insightsRaw}
            loading={insightsLoading}
            error={insightsErr}
            onRefresh={refreshInsights}
          />
        </div>
      </div>

      {/* JSON inspection panels */}
      <JSONPanel title="Speed JSON (raw)" data={speedRaw} />
      <JSONPanel title="Incidents JSON (raw)" data={incRaw} />
      <JSONPanel title="Insights JSON (raw)" data={insightsRaw} />
    </div>
  );
}

export default App;
