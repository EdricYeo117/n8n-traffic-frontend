// src/App.js
import "./App.css";
import React, { useMemo } from "react";

import trafficJson from "./traffic.json";
import speedBandJson from "./speed-band.json";
import SingaporeTrafficMap from "./SingaporeTrafficMap";
import Dashboard from "./Dashboard";

// turn traffic.json shape into [{ lat, lon, severity, title }]
const normalizeIncidents = (raw) => {
  const root = Array.isArray(raw) ? raw[0] : raw;
  const rows = Array.isArray(root?.rows) ? root.rows : [];
  return rows
    .filter(r => (r.KIND ?? r.kind) === "INCIDENT" && r.LAT != null && r.LON != null)
    .map(r => ({
      lat: Number(r.LAT),
      lon: Number(r.LON),
      severity: Number(r.SEVERITY ?? r.SPEED_LEVEL ?? 1),
      title: r.ROAD_KEY || "Incident",
    }));
};

function App() {
  // preview just to confirm traffic.json loads
  const previewRows = useMemo(() => {
    const root = Array.isArray(trafficJson) ? trafficJson[0] : trafficJson;
    return Array.isArray(root?.rows) ? root.rows : [];
  }, []);

  // ✅ normalized incidents for the map/dashboard
  const incidents = useMemo(() => normalizeIncidents(trafficJson), []);

  return (
    <div className="App" style={{ padding: 16 }}>
      <h2 style={{ margin: "8px 0 16px" }}>Singapore Traffic Monitor</h2>

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
          <SingaporeTrafficMap
            speedData={speedBandJson}     // existing speed bands
            incidents={incidents}         // ✅ normalized incidents
          />
        </div>

        {/* Dashboard */}
        <div>
          <Dashboard
            speedData={speedBandJson}
            incidents={incidents}         // ✅ normalized incidents
          />
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
          Loaded <strong>{previewRows.length}</strong> rows from <code>traffic.json</code>
        </div>
        <pre style={{ margin: 0 }}>
          {JSON.stringify(previewRows.slice(0, 6), null, 2)}
        </pre>
      </div>
    </div>
  );
}

export default App;
