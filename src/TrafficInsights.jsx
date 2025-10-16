import React, { useMemo } from "react";

/* ---------- small UI primitive ---------- */
function Card({ title, children, footer }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 14 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>{title}</div>
      <div>{children}</div>
      {footer && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #eee", fontSize: 12, color: "#666" }}>
          {footer}
        </div>
      )}
    </div>
  );
}

const bandColor = {
  1: "#d73027", 2: "#fc8d59", 3: "#fee08b", 4: "#d9ef8b", 5: "#91cf60", 6: "#1a9850",
};
const bandLabel = {
  1: "gridlock", 2: "very slow", 3: "slow", 4: "moderate", 5: "fast", 6: "very fast",
};

/* ---------- parsing ---------- */
function parseInsights(raw) {
  const root = Array.isArray(raw) ? raw[0] : raw;
  const out = (root?.output ?? "").toString();

  // prose: remove any fenced code blocks
  const prose = out.replace(/```[\s\S]*?```/g, "").trim();

  // try fenced JSON first
  const m = out.match(/```json\s*([\s\S]*?)```/i) || out.match(/```([\s\S]*?)```/i);
  let obj = null;
  if (m?.[1]) {
    try { obj = JSON.parse(m[1]); } catch {}
  }
  // fallback: first {...} block
  if (!obj) {
    const a = out.indexOf("{"), b = out.lastIndexOf("}");
    if (a >= 0 && b > a) {
      try { obj = JSON.parse(out.slice(a, b + 1)); } catch {}
    }
  }

  const topHotspots = Array.isArray(obj?.topHotspots) ? obj.topHotspots : [];
  const advice = Array.isArray(obj?.advice) ? obj.advice : [];

  return {
    prose,
    generatedAt: obj?.generatedAt || null,
    topHotspots,
    advice,
    rawJson: obj || null,
  };
}

/* ---------- subviews ---------- */
function Summary({ prose, generatedAt }) {
  const ts = useMemo(() => {
    if (!generatedAt) return null;
    try { return new Date(generatedAt).toLocaleString(); } catch { return null; }
  }, [generatedAt]);

  return (
    <Card title="AI Summary" footer={ts ? `Generated at ${ts}` : undefined}>
      <div style={{ fontSize: 13, color: "#111", whiteSpace: "pre-wrap" }}>
        {prose || "No summary available."}
      </div>
    </Card>
  );
}

function Hotspots({ rows }) {
  if (!rows?.length) return <Card title="Top Hotspots">No hotspots detected.</Card>;

  return (
    <Card title="Top Hotspots">
      <div style={{ display: "grid", gap: 8 }}>
        {rows.map((h, i) => {
          const b = Number(h.band) || 1;
          const clr = bandColor[b] || "#aaa";
          const lbl = (h.bandLabel || bandLabel[b] || "").toString();
          const min = Number.isFinite(h.avgMin) ? Math.round(h.avgMin) : null;
          const max = Number.isFinite(h.avgMax) ? Math.round(h.avgMax) : null;

          return (
            <div key={i} style={{
              display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center",
              background: "#fafafa", border: "1px solid #eee", borderRadius: 8, padding: "8px 10px"
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{h.road || "Unnamed road"}</div>
                <div style={{ fontSize: 12, color: "#555" }}>
                  Band {b} – {lbl}
                  {Number.isFinite(min) && Number.isFinite(max) && <> • Avg {min}–{max} km/h</>}
                  {" • "}Works={h.works ?? 0} • Incidents={h.incidents ?? 0}
                </div>
              </div>
              <div title={`Band ${b}: ${lbl}`} style={{ width: 28, height: 10, borderRadius: 4, background: clr, justifySelf: "end" }} />
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function Advice({ items }) {
  if (!items?.length) return <Card title="Actionable Advice">No advice available.</Card>;
  return (
    <Card title="Actionable Advice">
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "#111" }}>
        {items.map((a, i) => (
          <li key={i}><b>{a.road || "Unnamed road"}:</b> {a.action || "—"}</li>
        ))}
      </ul>
    </Card>
  );
}

/* ---------- main (hooks always run) ---------- */
export default function TrafficInsights({ data, loading, error, onRefresh }) {
  // Hooks are called unconditionally before any early returns
  const parsed = useMemo(() => parseInsights(data), [data]);
  const { prose, topHotspots, advice, generatedAt } = parsed;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ fontSize: 12, color: "#666" }}>
          Insights: {loading ? "Loading…" : error ? "Error" : "Loaded"}
        </span>
        {onRefresh && <button onClick={onRefresh}>Refresh insights</button>}
      </div>

      {error ? (
        <Card title="AI Insights">
          <div style={{ color: "#b91c1c", fontSize: 13 }}>
            {error.message || "Failed to load insights."}
          </div>
        </Card>
      ) : (
        <>
          <Summary prose={prose} generatedAt={generatedAt} />
          <Hotspots rows={topHotspots} />
          <Advice items={advice} />
        </>
      )}
    </div>
  );
}
