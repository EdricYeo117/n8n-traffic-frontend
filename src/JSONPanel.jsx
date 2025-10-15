// src/components/JSONPanel.jsx
import React, { useMemo, useState } from "react";

/* ---------- styles ---------- */
const wrapStyle = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  marginTop: 12,
  overflow: "hidden",
};

const headerStyle = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  justifyContent: "space-between",
  padding: "10px 14px",
  background: "#f8fafc",
  borderBottom: "1px solid #e5e7eb",
};

const viewerStyle = {
  background: "#0b1220",
  color: "#e6edf3",
  maxHeight: 360,
  overflow: "auto",
  padding: 0,
};

const lineStyle = {
  display: "grid",
  gridTemplateColumns: "56px 1fr", // gutter + content
  gap: 0,
  padding: "0 0", // no extra padding per line
  whiteSpace: "pre",
  fontFamily:
    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  fontSize: 12.5,
  lineHeight: 1.6,
};

const gutterStyle = {
  background: "#0f172a",
  color: "#7c93b2",
  padding: "0 12px",
  textAlign: "right",
  userSelect: "none",
  borderRight: "1px solid #0b132a",
};

const contentStyle = {
  padding: "0 16px", // ← nice left/right padding so it’s not flush-left
};

/* ---------- tiny highlighter ---------- */
function highlightJSON(str) {
  // escape HTML
  const esc = (s) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // basic JSON highlighting
  let html = esc(str)
    .replace(
      /"(\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(?=\s*:)/g,
      (m) => `<span style="color:#7cc7ff">${m}</span>` // keys
    )
    .replace(
      /"(\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"/g,
      (m) => `<span style="color:#a5d6ff">${m}</span>` // strings
    )
    .replace(/\b(true|false)\b/g, `<span style="color:#f59e0b">$1</span>`)
    .replace(/\b(null)\b/g, `<span style="color:#94a3b8">$1</span>`)
    .replace(/-?\b\d+(\.\d+)?\b/g, `<span style="color:#22d3ee">$&</span>`);

  return html.split("\n");
}

/* ---------- component ---------- */
export default function JSONPanel({ title, data }) {
  const [open, setOpen] = useState(true);
  const [mode, setMode] = useState("rows"); // 'rows' | 'meta' | 'raw'

  // normalize common webhook shapes
  const root = useMemo(() => (Array.isArray(data) ? data[0] : data) ?? {}, [data]);
  const rows = useMemo(
    () =>
      Array.isArray(root?.rows)
        ? root.rows
        : Array.isArray(data)
        ? data
        : [],
    [root, data]
  );
  const meta = useMemo(() => root?.metaData ?? [], [root]);

  const toShow = mode === "rows" ? rows : mode === "meta" ? meta : data ?? {};
  const jsonText = useMemo(() => JSON.stringify(toShow, null, 2), [toShow]);
  const lines = useMemo(() => highlightJSON(jsonText), [jsonText]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(jsonText);
    } catch {}
  };

  const download = () => {
    const blob = new Blob([jsonText], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const suffix = mode === "rows" ? "rows" : mode === "meta" ? "meta" : "raw";
    a.href = url;
    a.download = `${title.replace(/\s+/g, "_").toLowerCase()}_${suffix}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={wrapStyle}>
      <div style={headerStyle}>
        <div style={{ fontWeight: 700 }}>{title}</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label style={{ fontSize: 12, color: "#555" }}>
            View:&nbsp;
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              style={{ fontSize: 12 }}
            >
              <option value="rows">
                Rows only ({Array.isArray(rows) ? rows.length : 0})
              </option>
              <option value="meta">
                MetaData ({Array.isArray(meta) ? meta.length : 0})
              </option>
              <option value="raw">Raw</option>
            </select>
          </label>
          <button onClick={copy}>Copy</button>
          <button onClick={download}>Download</button>
          <button onClick={() => setOpen((v) => !v)}>{open ? "Hide" : "Show"}</button>
        </div>
      </div>

      {open && (
        <div style={viewerStyle}>
          {/* Lines */}
          {lines.map((html, i) => (
            <div key={i} style={lineStyle}>
              <div style={gutterStyle}>{i + 1}</div>
              <div
                style={contentStyle}
                dangerouslySetInnerHTML={{ __html: html || "&nbsp;" }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
