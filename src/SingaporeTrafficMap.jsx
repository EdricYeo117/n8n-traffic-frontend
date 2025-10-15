// SingaporeTrafficMap.jsx
import React, { useMemo, useRef, useEffect } from "react";
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

// average speed for a link (fallbacks included)
const midKmh = (r) => {
  const min = Number(r.MINIMUM_SPEED ?? r.min_kmh ?? r.minSpeed);
  const max = Number(r.MAXIMUM_SPEED ?? r.max_kmh ?? r.maxSpeed);
  const v = (min + max) / 2;
  return Number.isFinite(v) ? v : NaN;
};

// simple HSL ramp: 0 (red) -> 120 (green)
const kmhToColor = (kmh, minK, maxK) => {
  if (
    !Number.isFinite(kmh) ||
    !Number.isFinite(minK) ||
    !Number.isFinite(maxK) ||
    maxK <= minK
  ) {
    return "#dc2626"; // fallback red
  }
  const t = Math.max(0, Math.min(1, (kmh - minK) / (maxK - minK)));
  const hue = 120 * t; // 0..120
  const sat = 85; // vibrant
  const light = 48; // mid lightness so it pops
  return `hsl(${hue}, ${sat}%, ${light}%)`;
};

// quick squared distance (fine for SG scale on one map)
const d2 = (aLat, aLon, bLat, bLon) => {
  const dx = aLat - bLat;
  const dy = aLon - bLon;
  return dx * dx + dy * dy;
};

/* ---------- hooks ---------- */

function useZoomScale(min = 0.9, max = 1.8) {
  const map = useMap();
  const [scale, setScale] = React.useState(1);
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

export function MapAutoFit({ rows = [], incidents = [], once = true }) {
  const map = useMap();
  const hasFit = useRef(false);
  const userMoved = useRef(false);

  useEffect(() => {
    const mark = () => {
      userMoved.current = true;
    };
    map.on("dragstart zoomstart", mark);
    return () => {
      map.off("dragstart", mark);
      map.off("zoomstart", mark);
    };
  }, [map]);

  useEffect(() => {
    if (once && hasFit.current) return;
    if (userMoved.current) return; // don't fight the user

    const pts = [];
    rows.forEach((r) => {
      if (r.START_LAT && r.START_LON && r.END_LAT && r.END_LON) {
        pts.push([r.START_LAT, r.START_LON], [r.END_LAT, r.END_LON]);
      }
    });
    incidents.forEach((i) => {
      const lat = i.lat ?? i.latitude ?? i.LAT ?? i.Latitude;
      const lon = i.lon ?? i.lng ?? i.longitude ?? i.LON ?? i.Longitude;
      if (Number.isFinite(lat) && Number.isFinite(lon)) pts.push([lat, lon]);
    });

    if (pts.length) {
      map.fitBounds(pts, { padding: [24, 24], maxZoom: 15, animate: false });
    } else {
      map.fitBounds(
        [
          [1.16, 103.6],
          [1.48, 104.12],
        ],
        { padding: [24, 24], animate: false }
      );
    }
    hasFit.current = true;
  }, [map, rows, incidents, once]);

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

function IncidentCircles({ items = [], scale = 1 }) {
  // larger base radius + halo + hover emphasis
  const baseRadius = (sev) => Math.max(10, 6 + 3 * (Number(sev) || 1)); // min 10px

  return (
    items
      // keep only true incidents (your traffic.json also has SPEED rows)
      .filter((d) => {
        const kind = (d.KIND ?? d.kind ?? "INCIDENT").toString().toUpperCase();
        return kind === "INCIDENT";
      })
      .filter(
        (d) =>
          (d.lat ?? d.latitude ?? d.Latitude ?? d.LAT) != null &&
          (d.lon ?? d.lng ?? d.longitude ?? d.Longitude ?? d.LON) != null
      )
      .map((d, i) => {
        const lat = d.lat ?? d.latitude ?? d.Latitude ?? d.LAT;
        const lon = d.lon ?? d.lng ?? d.longitude ?? d.Longitude ?? d.LON;
        const sev = d.severity ?? d.count ?? 1;
        const color = d._color || "#dc2626"; // computed upstream
        const r = Math.max(8, Math.round(baseRadius(sev) * scale));

        const onOver = (e) => {
          e.target.setStyle({ fillOpacity: 0.85, weight: 2.5, opacity: 1 });
          if (e.target.bringToFront) e.target.bringToFront();
        };
        const onOut = (e) => {
          e.target.setStyle({ fillOpacity: 0.6, weight: 1.5, opacity: 1 });
        };

        return (
          <React.Fragment key={`inc-${i}`}>
            {/* white halo so it stands out on busy tiles */}
            <CircleMarker
              center={[lat, lon]}
              radius={r + 4}
              pathOptions={{
                color: "#fff",
                weight: 3.5,
                opacity: 0.95,
                fillOpacity: 0,
              }}
              eventHandlers={{ mouseover: onOver, mouseout: onOut }}
            />
            {/* main colored circle */}
            <CircleMarker
              center={[lat, lon]}
              radius={r}
              className="leaflet-incident"
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: 0.6,
                opacity: 1,
                weight: 1.5,
              }}
              eventHandlers={{ mouseover: onOver, mouseout: onOut }}
            >
     <Tooltip direction="top" offset={[0, -6]} sticky>
  <div style={{ fontWeight: 700 }}>
    {(() => {
      // Priority for title/road display
      if (d.title && d.title !== "OTHER") return d.title;
      if (d.label && d.label !== "OTHER") return d.label;
      if (d._roadName && d._roadName !== "OTHER") return d._roadName;
      if (d.ROAD_KEY && d.ROAD_KEY !== "OTHER") return d.ROAD_KEY;
      return "Unnamed Road / Incident";
    })()}
  </div>

  {Number.isFinite(d._kmh) ? (
    <div style={{ fontSize: 12 }}>
      Nearest speed: <b>{Math.round(d._kmh)} km/h</b>
      {d._band ? ` (Band ${d._band})` : ""}
    </div>
  ) : (
    <div style={{ fontSize: 12, opacity: 0.75 }}>
      No nearby speed sample
    </div>
  )}
</Tooltip>
            </CircleMarker>
          </React.Fragment>
        );
      })
  );
}

function IncidentLayer({ items }) {
  const scale = useZoomScale(); // ✅ safe: runs under MapContainer
  return <IncidentCircles items={items} scale={scale} />;
}

/* ---------- main component ---------- */

export default function SingaporeTrafficMap({
  speedData,
  incidents = [],
  center = [1.3521, 103.8198],
  zoom = 12,
}) {
  const rows = useMemo(() => extractRows(speedData), [speedData]);

  // build speed midpoints once
const speedPts = useMemo(() => {
  return rows
    .filter(r => r.START_LAT && r.START_LON && r.END_LAT && r.END_LON)
    .map(r => {
      const kmh = midKmh(r);
      const lat = (Number(r.START_LAT) + Number(r.END_LAT)) / 2;
      const lon = (Number(r.START_LON) + Number(r.END_LON)) / 2;
      return {
        lat, lon,
        kmh,
        band: Number(r.SPEED_BAND) || null,
        roadName: r.ROAD_NAME || r.road_name || r.ROAD_KEY || null,
      };
    })
    .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lon) && Number.isFinite(p.kmh));
}, [rows]);
  // global min/max for color ramp
  const { minKmh, maxKmh } = useMemo(() => {
    if (!speedPts.length) return { minKmh: 0, maxKmh: 1 };
    const vals = speedPts.map((p) => p.kmh);
    return { minKmh: Math.min(...vals), maxKmh: Math.max(...vals) };
  }, [speedPts]);

  // enrich incidents with nearest speed -> color
  const incidentsWithSpeed = useMemo(() => {
  if (!incidents?.length || !speedPts.length) return incidents || [];
  return incidents.map((i) => {
    const lat = i.lat ?? i.latitude ?? i.Latitude ?? i.LAT;
    const lon = i.lon ?? i.lng ?? i.longitude ?? i.Longitude ?? i.LON;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return i;

    let best = Infinity, nearest = null;
    for (const p of speedPts) {
      const dist = (lat - p.lat) ** 2 + (lon - p.lon) ** 2;
      if (dist < best) { best = dist; nearest = p; }
    }

    const kmh  = nearest?.kmh;
    const band = nearest?.band ?? null;
    const color = Number.isFinite(kmh) ? kmhToColor(kmh, minKmh, maxKmh) : "#dc2626";
    const nearestName = nearest?.roadName || null;

    // avoid showing literal "OTHER"
    const fallbackKey = (i.ROAD_KEY && i.ROAD_KEY !== "OTHER") ? i.ROAD_KEY : null;

    return { ...i, _kmh: kmh, _band: band, _color: color, _roadName: nearestName || fallbackKey };
  });
}, [incidents, speedPts, minKmh, maxKmh]);

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: "100%", width: "100%" }}
      renderer={L.svg()}
      preferCanvas
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
              <IncidentLayer items={incidentsWithSpeed} />
            </LayerGroup>
          </Pane>
        </LayersControl.Overlay>
      </LayersControl>

      <LegendControl minKmh={Math.round(minKmh)} maxKmh={Math.round(maxKmh)} />
      <MapResizer />
      <MapAutoFit rows={rows} incidents={incidentsWithSpeed} once />
    </MapContainer>
  );
}
