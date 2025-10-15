import "./App.css";
import React, { useMemo } from "react";

import SingaporeTrafficMap from "./SingaporeTrafficMap";
import Dashboard from "./Dashboard";
import useWebhookData from "./hooks/useWebhookData";

// turn incidents payload into [{ lat, lon, severity, title }]
const normalizeIncidents = (raw) => {
  // accept {rows:[...]} or [ {rows:[...]} ]
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

// helper so children keep working (expects an object with .rows)
const coerceSpeedData = (raw) => {
  if (!raw) return { rows: [] };
  if (Array.isArray(raw?.rows)) return raw;
  if (Array.isArray(raw) && Array.isArray(raw[0]?.rows)) return raw[0];
  if (Array.isArray(raw)) return { rows: raw }; // last resort
  return { rows: [] };
};

// Allow env override for base URL (CRA or Vite)
const API_BASE =
  process.env.REACT_APP_API_BASE ??
  import.meta?.env?.VITE_API_BASE ??
  "http://localhost:5678";

const SPEED_URL = `${API_BASE}/webhook/speed-bands`;
const INCIDENT_URL = `${API_BASE}/webhook/incidents`;

function App() {
  // fetch speed bands every 30s, incidents a bit faster (10s)
  const {
    data: speedRaw,
    error: speedErr,
    loading: speedLoading,
    refresh: refreshSpeed,
  } = useWebhookData(SPEED_URL, { refreshMs: 30000 });

  const {
    data: incRaw,
    error: incErr,
    loading: incLoading,
    refresh: refreshInc,
  } = useWebhookData(INCIDENT_URL, { refreshMs: 10000 });

  const speedData = useMemo(() => coerceSpeedData(speedRaw), [speedRaw]);
  const incidents = useMemo(() => normalizeIncidents(incRaw), [incRaw]);

  const previewRows = useMemo(() => {
    const root = Array.isArray(speedRaw) ? speedRaw[0] : speedRaw;
    return Array.isArray(root?.rows) ? root.rows : [];
  }, [speedRaw]);

  return (
    <div className="App" style={{ padding: 16 }}>
      <h2 style={{ margin: "8px 0 16px" }}>Singapore Traffic Monitor</h2>

      {/* simple status + manual refresh */}
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: "#666" }}>
          Speed: {speedLoading ? "Loading…" : speedErr ? "Error" : "Live"}
        </span>
        <button onClick={refreshSpeed}>Refresh speed</button>
        <span style={{ fontSize: 12, color: "#666" }}>
          Incidents: {incLoading ? "Loading…" : incErr ? "Error" : "Live"}
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

      {/* optional debug preview */}
      <div
        style={{
          marginTop: 18,
          background: "#111",
          color: "#ddd",
          padding: 12,
          borderRadius: 8,
          textAlign: "left",
          maxHeight: 280,
          overflow: "auto",
        }}
      >
        <div style={{ marginBottom: 8 }}>
          Loaded <strong>{previewRows.length}</strong> rows from <code>/webhook/speed-bands</code>
        </div>
        <pre style={{ margin: 0 }}>
          {JSON.stringify(previewRows.slice(0, 6), null, 2)}
        </pre>
      </div>
    </div>
  );
}

export default App;
