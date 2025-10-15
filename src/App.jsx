// src/App.js
import "./App.css";
import data from "./traffic.json"; // <- static import
import speedBandJson from "./speed-band.json"; // <- static import
import SingaporeTrafficMap from "./SingaporeTrafficMap"; // <- your map component

function App() {
  // Your payload is an array with a single object that has { metaData, rows }
  const rows = Array.isArray(data) ? data[0]?.rows ?? [] : [];

  return (
    <div className="App">
      <header className="App-header" style={{ alignItems: "flex-start" }}>
        <p>Loaded <strong>{rows.length}</strong> points from traffic.json</p>

        {/* show a tiny preview so you know it worked */}
        <pre
          style={{
            textAlign: "left",
            maxHeight: "50vh",
            overflow: "auto",
            width: "100%",
            background: "#111",
            padding: "1rem",
            borderRadius: 8
          }}
        >
{JSON.stringify(rows.slice(0, 8), null, 2)}
        </pre>

        {/* If you already have a <HeatmapSingapore /> component, pass it in: */}
        <SingaporeTrafficMap
  speedData={speedBandJson}        // your pasted JSON
  incidents={[
    { lat: 1.2969, lon: 103.852, severity: 4, title: "Major collision" },
    { lat: 1.303,  lon: 103.833, severity: 2, title: "Stalled vehicle" },
    { lat: 1.295,  lon: 103.839, severity: 1, title: "Minor hazard" },
  ]}
/>
      </header>
    </div>
  );
}

export default App;
