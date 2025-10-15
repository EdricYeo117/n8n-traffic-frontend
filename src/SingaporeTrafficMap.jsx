// SingaporeTrafficMap.jsx
import React, { useMemo } from "react";
import "leaflet/dist/leaflet.css";
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  LayersControl,
  LayerGroup,
  Pane,
  Tooltip,
} from "react-leaflet";
import { useEffect } from "react";
import { useMap } from "react-leaflet";

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
    rows.forEach(r => {
      if (r.START_LAT && r.START_LON && r.END_LAT && r.END_LON) {
        pts.push([r.START_LAT, r.START_LON], [r.END_LAT, r.END_LON]);
      }
    });
    incidents.forEach(i => {
      if (i?.lat != null && (i.lon ?? i.lng) != null)
        pts.push([i.lat, i.lon ?? i.lng]);
    });
    if (pts.length) map.fitBounds(pts, { padding: [24, 24], maxZoom: 15 });
    else map.fitBounds([[1.16, 103.60], [1.48, 104.12]], { padding: [24, 24] });
  }, [map, rows, incidents]);
  return null;
}

const bandColor = {
  1: "#d73027", // 0–9 km/h
  2: "#fc8d59", // 10–19
  3: "#fee08b", // 20–29
  4: "#d9ef8b", // 30–39
  5: "#91cf60", // 40–49
  6: "#1a9850", // 50–59
};

// ------ helpers ------
const extractRows = (speedData) =>
  Array.isArray(speedData?.rows)
    ? speedData.rows
    : Array.isArray(speedData)
    ? speedData[0]?.rows || []
    : [];

// circle size/color by severity or count
const sevToRadius = (s) => Math.min(6 + 3 * (Number(s) || 1), 26);
const sevToColor = (s) =>
  (Number(s) || 1) >= 4
    ? "#bd0026"
    : (Number(s) || 1) >= 3
    ? "#f03b20"
    : (Number(s) || 1) >= 2
    ? "#fd8d3c"
    : "#feb24c";

// ------ sublayers ------
function SpeedLinks({ rows }) {
  return rows.map((r, i) => (
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
    />
  ));
}

function IncidentCircles({ items = [] }) {
  return items
    .filter(
      (d) =>
        (d.lat ?? d.latitude) != null &&
        (d.lon ?? d.lng ?? d.longitude) != null
    )
    .map((d, i) => {
      const lat = d.lat ?? d.latitude;
      const lon = d.lon ?? d.lng ?? d.longitude;
      const sev = d.severity ?? d.count ?? 1;
      const color = sevToColor(sev);
      return (
        <CircleMarker
          key={`inc-${i}`}
          center={[lat, lon]}
          radius={sevToRadius(sev)} // pixels
          pathOptions={{
            color,
            fillColor: color,
            fillOpacity: 0.28, // translucent
            weight: 1,
          }}
        >
          {(d.title || d.label) && <Tooltip>{d.title || d.label}</Tooltip>}
        </CircleMarker>
      );
    });
}

// ------ main map ------
export default function SingaporeTrafficMap({ speedData, incidents = [], center=[1.3521,103.8198], zoom=12 }) {
  const rows = useMemo(() => extractRows(speedData), [speedData]);

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: "100vh", width: "100%" }}
      preferCanvas
    >
      <TileLayer
        detectRetina
        attribution="&copy; OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <LayersControl position="topright">
        <LayersControl.Overlay checked name="Speed bands (roads)">
          {/* roads UNDER incidents */}
          <Pane name="roads" style={{ zIndex: 300 }}>
            <LayerGroup>
              <SpeedLinks rows={rows} />
            </LayerGroup>
          </Pane>
        </LayersControl.Overlay>

        <LayersControl.Overlay checked name="Incidents (circles)">
          {/* incidents ON TOP */}
          <Pane name="incidents" style={{ zIndex: 400 }}>
            <LayerGroup>
              <IncidentCircles items={incidents} />
            </LayerGroup>
          </Pane>
        </LayersControl.Overlay>
      </LayersControl>

      {/* 👇 make size correct + auto-fit to your data */}
      <MapResizer />
      <MapAutoFit rows={rows} incidents={incidents} />
    </MapContainer>
  );
}