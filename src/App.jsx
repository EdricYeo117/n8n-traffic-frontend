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

  // Helper to get status class
  const getStatusClass = (loading, error) => {
    if (loading) return "loading";
    if (error) return "error";
    return "loaded";
  };

  return (
    <div className="App">
      <h2>Singapore Traffic Monitor</h2>

      {/* Compact status + manual refresh */}
      <div className="control-bar">
        <span className={`status-badge ${getStatusClass(speedLoading, speedErr)}`}>
          Speed: {speedLoading ? "Loading…" : speedErr ? "Error" : "✓"}
        </span>
        <button onClick={refreshSpeed}>↻ Speed</button>

        <span className={`status-badge ${getStatusClass(incLoading, incErr)}`}>
          Incidents: {incLoading ? "Loading…" : incErr ? "Error" : "✓"}
        </span>
        <button onClick={refreshInc}>↻ Incidents</button>

        <span className={`status-badge ${getStatusClass(insightsLoading, insightsErr)}`}>
          Insights: {insightsLoading ? "Loading…" : insightsErr ? "Error" : "✓"}
        </span>
        <button onClick={refreshInsights}>↻ Insights</button>
      </div>

      {(speedErr || incErr || insightsErr) && (
        <div className="error-message">
          {speedErr ? `Speed: ${speedErr.message}. ` : ""}
          {incErr ? `Incidents: ${incErr.message}. ` : ""}
          {insightsErr ? `Insights: ${insightsErr.message}.` : ""}
        </div>
      )}

      {/* Optimized GRID: Map on top, Dashboard below, Insights at bottom */}
      <div
        style={{
          display: "grid",
          gridTemplateAreas: `
            "main"
            "sidebar"
            "insights"
          `,
          gridTemplateColumns: "1fr",
          gap: 12,
          alignItems: "start",
        }}
      >
        {/* TOP: Map - full width */}
        <div style={{ gridArea: "main" }}>
          <div className="map-container">
            <SingaporeTrafficMap speedData={speedData} incidents={incidents} />
          </div>
        </div>

        {/* MIDDLE: Dashboard */}
        <div style={{ gridArea: "sidebar" }}>
          <Dashboard speedData={speedData} incidents={incidents} />
        </div>

        {/* BOTTOM: Traffic Insights */}
        <div style={{ gridArea: "insights" }}>
          <TrafficInsights
            data={insightsRaw}
            loading={insightsLoading}
            error={insightsErr}
            onRefresh={refreshInsights}
          />
        </div>
      </div>

      {/* JSON inspection panels - hidden by default, can be toggled */}
      <details style={{ marginTop: 16 }}>
        <summary style={{ 
          cursor: "pointer", 
          padding: "8px 12px", 
          background: "#f9fafb", 
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          fontWeight: 600,
          fontSize: 13
        }}>
          🔍 Debug: View Raw JSON Data
        </summary>
        <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
          <JSONPanel title="Speed JSON (raw)" data={speedRaw} />
          <JSONPanel title="Incidents JSON (raw)" data={incRaw} />
          <JSONPanel title="Insights JSON (raw)" data={insightsRaw} />
        </div>
      </details>
    </div>
  );
}

export default App;