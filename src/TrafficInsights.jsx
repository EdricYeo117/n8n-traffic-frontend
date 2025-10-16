import React, { useMemo } from "react";

/* ---------- small UI primitives ---------- */
function Card({ title, children, footer, accent = false }) {
  return (
    <div className={`card card--padded ${accent ? "card--accent" : ""}`}>
      {title && <div className="card-title">{title}</div>}
      <div>{children}</div>
      {footer && <div className="card-footer">{footer}</div>}
    </div>
  );
}

const bandColor = {
  1: "#d73027", 2: "#fc8d59", 3: "#fee08b",
  4: "#d9ef8b", 5: "#91cf60", 6: "#1a9850",
};
const bandLabel = {
  1: "gridlock", 2: "very slow", 3: "slow",
  4: "moderate", 5: "fast", 6: "very fast",
};

/* ---------- helpers ---------- */
function tidyText(s) {
  let t = String(s || "");
  t = t.replace(/\r/g, "");
  t = t.replace(/[ \t]+\n/g, "\n");   // trim trailing spaces
  t = t.replace(/\n{3,}/g, "\n\n");   // collapse >2 newlines
  t = t.replace(/\s+([.,;:!?])/g, "$1");      // no space before punctuation
  t = t.replace(/([.,;:!?])(?=\S)/g, "$1 ");  // ensure space after punctuation
  t = t.replace(/\(\s+/g, "(").replace(/\s+\)/g, ")"); // ( )
  t = t.replace(/\s{2,}/g, " ");
  return t.trim();
}

function extractBulletsFromProse(prose) {
  // Remove any fenced code & any JSON-like tail that starts with generated keys
  const cleaned = String(prose || "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\{\s*"(generatedAt|topHotspots|advice)"[\s\S]*$/i, "");

  const match = cleaned.match(/Actionable\s+Advice\.?\s*\n([\s\S]*)$/i);
  const section = match ? match[1] : "";
  const lines = section
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => /^[-•]\s+/.test(s))
    .map((s) =>
      s
        .replace(/^[-•]\s+/, "")
        .replace(/\{\s*"(generatedAt|topHotspots|advice)"[\s\S]*$/i, "")
        .trim()
    );

  return lines.map((line) => {
    // Try to infer a ROAD-looking phrase (ALL CAPS words)
    const m =
      line.match(/\b([A-Z][A-Z\s'./-]{3,})\b/) ||
      line.match(/\b(on|along|near|via|towards)\s+([A-Z][A-Z\s'./-]{3,})\b/i);
    const road = m ? (m[2] || m[1]).trim().replace(/\s{2,}/g, " ") : null;
    return { road, action: line };
  });
}

/* ---------- parsing (new shape + robust cleaning) ---------- */
function parseInsights(raw) {
  const root = Array.isArray(raw) ? raw[0] : raw;

  // Prefer new shape: { prose, generatedAt, topHotspots, advice }
  const proseRaw = String(root?.prose ?? root?.output ?? "");

  // Strip any embedded fenced JSON and any trailing JSON payload appended to prose
  const proseSansJson = tidyText(
    proseRaw
      .replace(/```[\s\S]*?```/g, "")
      .replace(/\{\s*"(generatedAt|topHotspots|advice)"[\s\S]*$/i, "")
  );

  // Keep only the descriptive part; drop the "Actionable Advice" section from prose
  const advHeaderIdx = proseSansJson.search(/Actionable\s+Advice\.?/i);
  const summaryOnly =
    advHeaderIdx >= 0 ? proseSansJson.slice(0, advHeaderIdx).trim() : proseSansJson;

  // Prefer structured arrays from server; otherwise, pull bullets from prose
  const topHotspots = Array.isArray(root?.topHotspots) ? root.topHotspots : [];
  const adviceFromServer = Array.isArray(root?.advice) ? root.advice : [];
  const advice =
    adviceFromServer.length ? adviceFromServer : extractBulletsFromProse(proseRaw);

  return {
    prose: summaryOnly,
    generatedAt: root?.generatedAt || null,
    topHotspots,
    advice,
    rawJson: root || null,
  };
}

/* ---------- sections ---------- */
function Summary({ prose, generatedAt }) {
  const ts = useMemo(() => {
    if (!generatedAt) return null;
    try { return new Date(generatedAt).toLocaleString(); } catch { return null; }
  }, [generatedAt]);

  return (
    <Card title="AI Summary" footer={ts ? `Generated at ${ts}` : undefined} accent>
      <div className="summary">{prose || "No summary available."}</div>
    </Card>
  );
}

function Hotspots({ rows }) {
  if (!rows?.length) return <Card title="Top Hotspots">No hotspots detected.</Card>;

  return (
    <Card title="Top Hotspots">
      <div className="section">
        {rows.map((h, i) => {
          const b = Number(h.band) || 1;
          const clr = bandColor[b] || "#aaa";
          const lbl = (h.bandLabel || bandLabel[b] || "").toString();
          const min = Number.isFinite(h.avgMin) ? Math.round(h.avgMin) : null;
          const max = Number.isFinite(h.avgMax) ? Math.round(h.avgMax) : null;

          return (
            <div key={i} className="hotspot-row">
              <div>
                <div className="hotspot-road">{h.road || "Unnamed road"}</div>
                <div className="hotspot-meta">
                  Band {b} – {lbl}
                  {Number.isFinite(min) && Number.isFinite(max) && <> • Avg {min}–{max} km/h</>}
                  {" • "}Works={h.works ?? 0} • Incidents={h.incidents ?? 0}
                </div>
              </div>
              <div className="chip" style={{ "--c": clr }}>
                <span className="dot" style={{ background: clr }} />
                Band {b}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// Replace your existing Advice component with this one-column version
function Advice({ items }) {
  const clean = (s) =>
    String(s || "")
      .replace(/\{\s*"(generatedAt|topHotspots|advice)"[\s\S]*$/i, "")
      .trim();

  const normalized = Array.isArray(items)
    ? items.map((x) =>
        typeof x === "string" ? { road: null, action: clean(x) } : { ...x, action: clean(x.action) }
      )
    : [];

  if (!normalized.length) return <Card title="Actionable Advice">No advice available.</Card>;

  return (
    <Card title="Actionable Advice">
      <ul className="list-clean">
        {normalized.map((a, i) => (
          <li key={i}>
            {a.road ? <span className="list-road">{a.road}: </span> : null}
            {a.action || "—"}
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ---------- main ---------- */
export default function TrafficInsights({ data, loading, error, onRefresh }) {
  const parsed = useMemo(() => parseInsights(data), [data]);
  const { prose, topHotspots, advice, generatedAt } = parsed;

  return (
    <div className="section">
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <span className="muted">
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
