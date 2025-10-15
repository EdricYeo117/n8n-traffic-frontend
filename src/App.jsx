// src/App.jsx
import "./App.css";
import React, { useMemo } from "react";

import SingaporeTrafficMap from "./SingaporeTrafficMap";
import Dashboard from "./Dashboard";
import useWebhookData from "./hooks/useWebhookData";
import JSONPanel from "./JSONPanel";

// turn incidents payload into [{ lat, lon, severity, title }]
const normalizeIncidents = (raw) => {
  const root = Array.isArray(raw) ? raw[0] : raw;
  const rows = Array.isArray(root?.rows) ? root.rows : Array.isArray(raw) ? raw : [];
  return rows
    .filter((r) => (r.KIND ?? r.kind) === "INCIDENT" && r.LAT != null && r.LON != null)
    .map((r) => ({
      lat: Number(r.LAT),
      lon: Number(r.LON),
      severity: Number(r.SEVERITY ?? r.SPEED_LEVEL ?? 1),
      title: r.ROAD_KEY || r.ROAD_NAME || "Incident",
    }));
};

const coerceSpeedData = (raw) => {
  if (!raw) return { rows: [] };
  if (Array.isArray(raw?.rows)) return raw;
  if (Array.isArray(raw) && Array.isArray(raw[0]?.rows)) return raw[0];
  if (Array.isArray(raw)) return { rows: raw };
  return { rows: [] };
};

const API_BASE =
  process.env.REACT_APP_API_BASE ??
  import.meta?.env?.VITE_API_BASE ??
  "http://localhost:5678";

const SPEED_URL = `${API_BASE}/webhook/speed-bands`;
const INCIDENT_URL = `${API_BASE}/webhook/incidents`;

function App() {
  // ❌ no polling: refreshMs omitted (or set to 0/null)
  const {
    data: speedRaw,
    error: speedErr,
    loading: speedLoading,
    refresh: refreshSpeed,
  } = useWebhookData(SPEED_URL, { refreshMs: 0, fetchOnMount: true });

  const {
    data: incRaw,
    error: incErr,
    loading: incLoading,
    refresh: refreshInc,
  } = useWebhookData(INCIDENT_URL, { refreshMs: 0, fetchOnMount: true });

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
      </div>

      {(speedErr || incErr) && (
        <div style={{ marginBottom: 10, color: "#b91c1c", fontSize: 13 }}>
          {speedErr ? `Speed webhook error: ${speedErr.message}. ` : ""}
          {incErr ? `Incidents webhook error: ${incErr.message}.` : ""}
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

        {/* Dashboard */}
        <div>
          <Dashboard speedData={speedData} incidents={incidents} />
        </div>
      </div>

      {/* JSON inspection panels */}
      <JSONPanel title="Speed JSON (raw)" data={speedRaw} />
      <JSONPanel title="Incidents JSON (raw)" data={incRaw} />
    </div>
  );
}

export default App;
