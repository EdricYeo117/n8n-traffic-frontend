// SingaporeTrafficMap.jsx
import React, { useMemo, useState, useEffect } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  LayersControl,
  LayerGroup,
  Pane,
  Tooltip,
  useMap,
} from "react-leaflet";
import LegendControl from "./LegendControl";

/* ---------- utils / constants ---------- */

const bandColor = {
  1: "#d73027", // 0–9 km/h
  2: "#fc8d59", // 10–19
  3: "#fee08b", // 20–29
  4: "#d9ef8b", // 30–39
  5: "#91cf60", // 40–49
  6: "#1a9850", // 50–59
};

const bandRange = {
  1: "0–9",
  2: "10–19",
  3: "20–29",
  4: "30–39",
  5: "40–49",
  6: "50–59",
};

const extractRows = (speedData) =>
  Array.isArray(speedData?.rows)
    ? speedData.rows
    : Array.isArray(speedData)
    ? speedData[0]?.rows || []
    : [];

/* ---------- hooks ---------- */

function useZoomScale(min = 0.9, max = 1.8) {
  const map = useMap();
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const update = () => {
      const z = map.getZoom();
      const s = Math.min(max, Math.max(min, Math.pow(z / 12, 1.15)));
      setScale(s);
    };
    update();
    map.on("zoomend", update);
    return () => map.off("zoomend", update);
  }, [map, min, max]);
  return scale;
}

/* ---------- helpers ---------- */

const sevToRadius = (s) => Math.max(10, 6 + 3 * (Number(s) || 1)); // min 10px
const sevToColor = (s) =>
  (Number(s) || 1) >= 4
    ? "#bd0026"
    : (Number(s) || 1) >= 3
    ? "#f03b20"
    : (Number(s) || 1) >= 2
    ? "#fd8d3c"
    : "#feb24c";

/* ---------- internal components ---------- */

export function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const ro = new ResizeObserver(() => map.invalidateSize());
    ro.observe(map.getContainer());
    return () => ro.disconnect();
  }, [map]);
  return null;
}

export function MapAutoFit({ rows = [], incidents = [] }) {
  const map = useMap();
  useEffect(() => {
    const pts = [];
    rows.forEach((r) => {
      if (r.START_LAT && r.START_LON && r.END_LAT && r.END_LON) {
        pts.push([r.START_LAT, r.START_LON], [r.END_LAT, r.END_LON]);
      }
    });
    incidents.forEach((i) => {
      if (i?.lat != null && (i.lon ?? i.lng) != null)
        pts.push([i.lat, i.lon ?? i.lng]);
    });
    if (pts.length) map.fitBounds(pts, { padding: [24, 24], maxZoom: 15 });
    else map.fitBounds([[1.16, 103.6], [1.48, 104.12]], { padding: [24, 24] });
  }, [map, rows, incidents]);
  return null;
}

function SpeedLinks({ rows }) {
  return rows
    .filter((r) => r.START_LAT && r.START_LON && r.END_LAT && r.END_LON)
    .map((r, i) => (
      <Polyline
        key={`${r.LINK_ID ?? i}-${r.ROAD_NAME ?? ""}-${i}`}
        positions={[
          [r.START_LAT, r.START_LON],
          [r.END_LAT, r.END_LON],
        ]}
        pathOptions={{
          color: bandColor[r.SPEED_BAND] || "#888",
          weight: 4,
          opacity: 0.9,
        }}
        eventHandlers={{
          mouseover: (e) => e.target.setStyle({ weight: 7, opacity: 1 }),
          mouseout: (e) => e.target.setStyle({ weight: 4, opacity: 0.9 }),
        }}
      >
        <Tooltip sticky>
          <div style={{ fontWeight: 700 }}>{r.ROAD_NAME || "Unnamed road"}</div>
          <div style={{ fontSize: 12 }}>
            Band {r.SPEED_BAND}: {bandRange[r.SPEED_BAND]} km/h
          </div>
          {r.MINIMUM_SPEED != null && r.MAXIMUM_SPEED != null && (
            <div style={{ fontSize: 12 }}>
              Min–Max: {r.MINIMUM_SPEED}–{r.MAXIMUM_SPEED} km/h
            </div>
          )}
          {r.LINK_ID && (
            <div style={{ fontSize: 12, opacity: 0.7 }}>Link #{r.LINK_ID}</div>
          )}
        </Tooltip>
      </Polyline>
    ));
}

function IncidentCircles({ items = [] }) {
  const scale = useZoomScale(); // ✅ hook is inside a component
  const baseRadius = (sev) => sevToRadius(sev) * scale;

  return items
    .filter(
      (d) =>
        (d.lat ?? d.latitude ?? d.Latitude ?? d.LAT) != null &&
        (d.lon ?? d.lng ?? d.longitude ?? d.Longitude ?? d.LON) != null
    )
    .map((d, i) => {
      const lat = d.lat ?? d.latitude ?? d.Latitude ?? d.LAT;
      const lon = d.lon ?? d.lng ?? d.longitude ?? d.Longitude ?? d.LON;
      const sev = d.severity ?? d.count ?? 1;
      const color = sevToColor(sev);
      const r = baseRadius(sev);

      const onOver = (e) => {
        e.target.setStyle({ fillOpacity: 0.8, weight: 2.5, opacity: 1 });
        if (e.target.bringToFront) e.target.bringToFront();
      };
      const onOut = (e) => {
        e.target.setStyle({ fillOpacity: 0.55, weight: 1.5, opacity: 1 });
      };

      return (
        <React.Fragment key={`inc-${i}`}>
          {/* white halo */}
          <CircleMarker
            center={[lat, lon]}
            radius={r + 3}
            pathOptions={{ color: "#fff", weight: 3, opacity: 0.9, fillOpacity: 0 }}
            eventHandlers={{ mouseover: onOver, mouseout: onOut }}
          />
          {/* fill circle */}
          <CircleMarker
            center={[lat, lon]}
            radius={r}
            className="leaflet-incident"
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: 0.55,
              opacity: 1,
              weight: 1.5,
            }}
            eventHandlers={{ mouseover: onOver, mouseout: onOut }}
          >
            {(d.title || d.label) && (
              <Tooltip direction="top" offset={[0, -6]} sticky>
                {d.title || d.label}
              </Tooltip>
            )}
          </CircleMarker>
        </React.Fragment>
      );
    });
}

/* ---------- main component ---------- */

export default function SingaporeTrafficMap({
  speedData,
  incidents = [],
  center = [1.3521, 103.8198],
  zoom = 12,
}) {
  const rows = useMemo(() => extractRows(speedData), [speedData]);

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: "100%", width: "100%" }}
      renderer={L.svg()} // crisp SVG
    >
      <TileLayer
        detectRetina
        attribution="&copy; OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <LayersControl position="topright">
        <LayersControl.Overlay checked name="Speed bands (roads)">
          <Pane name="roads" style={{ zIndex: 300 }}>
            <LayerGroup>
              <SpeedLinks rows={rows} />
            </LayerGroup>
          </Pane>
        </LayersControl.Overlay>

        <LayersControl.Overlay checked name="Incidents (circles)">
          <Pane name="incidents" style={{ zIndex: 650, pointerEvents: "auto" }}>
            <LayerGroup>
              <IncidentCircles items={incidents} />
            </LayerGroup>
          </Pane>
        </LayersControl.Overlay>
      </LayersControl>

      <LegendControl />
      <MapResizer />
      <MapAutoFit rows={rows} incidents={incidents} />
    </MapContainer>
  );
}
