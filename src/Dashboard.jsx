// src/Dashboard.jsx
import React, { useMemo } from "react";

const bandColor = {
  1: "#d73027",
  2: "#fc8d59",
  3: "#fee08b",
  4: "#d9ef8b",
  5: "#91cf60",
  6: "#1a9850",
};
const bandRange = {
  1: "0–9",
  2: "10–19",
  3: "20–29",
  4: "30–39",
  5: "40–49",
  6: "50–59",
};

// robustly pluck rows from your speed-band payload
const extractRows = (obj) =>
  Array.isArray(obj?.rows)
    ? obj.rows
    : Array.isArray(obj)
    ? obj[0]?.rows || []
    : [];

function Stat({ label, value }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #eee", borderRadius: 12,
      padding: "12px 14px"
    }}>
      <div style={{ fontSize: 12, color: "#666" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: "#111" }}>{value}</div>
    </div>
  );
}

function LegendCard() {
  return (
    <div style={{
      background: "#fff", border: "1px solid #eee", borderRadius: 12,
      padding: 14
    }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Speed Bands (km/h)</div>
      <div className="section grid-3" style={{ display: "grid", gap: 8 }}>
        {[1,2,3,4,5,6].map(b => (
          <div key={b} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 28, height: 10, borderRadius: 4, background: bandColor[b] }} />
            <div style={{ fontSize: 12, color: "#333" }}>
              Band {b}: {bandRange[b]} km/h
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid #eee", fontSize: 12, color: "#333" }}>
        <span style={{
          display: "inline-block", width: 12, height: 12, borderRadius: 9999,
          background: "#dc2626", opacity: 0.35, marginRight: 8, verticalAlign: "middle"
        }} />
        Incidents (size = severity)
      </div>
    </div>
  );
}

function BandDistribution({ rows }) {
  const counts = useMemo(() => {
    const c = {1:0,2:0,3:0,4:0,5:0,6:0};
    rows.forEach(r => { const b = Number(r.SPEED_BAND); if (c[b] != null) c[b]++; });
    return c;
  }, [rows]);

  const max = Math.max(1, ...Object.values(counts));
  return (
    <div style={{
      background: "#fff", border: "1px solid #eee", borderRadius: 12,
      padding: 14
    }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Band Distribution</div>
      <div style={{ display: "grid", gap: 8 }}>
        {[1,2,3,4,5,6].map(b => {
          const pct = (counts[b] / max) * 100;
          return (
            <div key={b}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#555" }}>
                <span>Band {b}</span><span>{counts[b]}</span>
              </div>
              <div style={{ height: 8, background: "#f0f0f0", borderRadius: 6 }}>
                <div style={{
                  width: `${pct}%`, height: "100%", background: bandColor[b],
                  borderRadius: 6, transition: "width .3s"
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SlowestList({ rows }) {
  const slowest = useMemo(() => {
    return [...rows]
      .map(r => {
        const avg = (Number(r.MINIMUM_SPEED) + Number(r.MAXIMUM_SPEED)) / 2 || 0;
        return { road: r.ROAD_NAME || "Unnamed", avg, link: r.LINK_ID };
      })
      .sort((a,b) => a.avg - b.avg)
      .slice(0, 6);
  }, [rows]);

  return (
    <div style={{
      background: "#fff", border: "1px solid #eee", borderRadius: 12,
      padding: 14
    }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>Slowest Segments</div>
      <div className="section grid-3" style={{  display: "grid", gap: 8 }}>
        {slowest.map((s, i) => (
          <div key={i} style={{
            background: "#fafafa", border: "1px solid #eee", borderRadius: 8,
            padding: "8px 10px"
          }}>
            <div style={{ fontSize: 12, color: "#111", fontWeight: 600, marginBottom: 2 }}>
              {s.road}
            </div>
            <div style={{ fontSize: 12, color: "#555" }}>
              Avg ~ {Math.round(s.avg)} km/h {s.link ? `• #${s.link}` : ""}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard({ speedData, incidents = [] }) {
  const rows = useMemo(() => extractRows(speedData), [speedData]);

  const stats = useMemo(() => {
    const totalRoads = rows.length;
    const congested = rows.filter(r => Number(r.SPEED_BAND) <= 2).length;
    const flowing   = rows.filter(r => Number(r.SPEED_BAND) >= 5).length;
    const avgSpeed  = totalRoads
      ? Math.round(rows.reduce((acc, r) =>
          acc + ((Number(r.MINIMUM_SPEED) + Number(r.MAXIMUM_SPEED)) / 2 || 0), 0) / totalRoads)
      : 0;
    return { totalRoads, congested, flowing, avgSpeed, totalIncidents: incidents.length };
  }, [rows, incidents]);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Stat label="Total Road Links" value={stats.totalRoads} />
        <Stat label="Active Incidents" value={stats.totalIncidents} />
        <Stat label="Avg Speed" value={`${stats.avgSpeed} km/h`} />
        <Stat label="Congested (<20 km/h)" value={stats.congested} />
      </div>

      <LegendCard />
      <BandDistribution rows={rows} />
      <SlowestList rows={rows} />
    </div>
  );
}
