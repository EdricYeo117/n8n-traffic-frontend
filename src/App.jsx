// src/App.js
import "./App.css";
import data from "./traffic.json";
import speedBandJson from "./speed-band.json";
import SingaporeTrafficMap from "./SingaporeTrafficMap";
import Dashboard from "./Dashboard";

// (optional) your sample incidents; replace with real ones when ready
const incidents = [
  { lat: 1.2969, lon: 103.852, severity: 4, title: "Major collision" },
  { lat: 1.303,  lon: 103.833, severity: 2, title: "Stalled vehicle" },
  { lat: 1.295,  lon: 103.839, severity: 1, title: "Minor hazard" },
];

function App() {
  // This preview is just to confirm your traffic.json loads
  const previewRows = Array.isArray(data) ? data[0]?.rows ?? [] : [];

  return (
    <div className="App" style={{ padding: 16 }}>
      <h2 style={{ margin: "8px 0 16px" }}>Singapore Traffic Monitor</h2>

      {/* Layout: map on the left, dashboard on the right */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: 16,
          alignItems: "stretch",
        }}
      >
        {/* Map area */}
        <div
          style={{
            background: "#fff",
            border: "1px solid #eee",
            borderRadius: 12,
            padding: 8,
            height: 600,
          }}
        >
          <SingaporeTrafficMap speedData={speedBandJson} incidents={incidents} />
        </div>

        {/* Dashboard (legend + stats + band distribution + slowest list) */}
        <div>
          <Dashboard speedData={speedBandJson} incidents={incidents} />
        </div>
      </div>

      {/* Debug preview of your traffic.json load (optional) */}
      <div style={{
        marginTop: 18, background: "#111", color: "#ddd", padding: 12,
        borderRadius: 8, textAlign: "left", maxHeight: 280, overflow: "auto",
      }}>
        <div style={{ marginBottom: 8 }}>
          Loaded <strong>{previewRows.length}</strong> rows from <code>traffic.json</code>
        </div>
        <pre style={{ margin: 0 }}>{JSON.stringify(previewRows.slice(0, 6), null, 2)}</pre>
      </div>
    </div>
  );
}

export default App;
