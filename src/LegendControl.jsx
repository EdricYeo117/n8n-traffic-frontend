// LegendControl.jsx
import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

const bandColor = {1:"#d73027",2:"#fc8d59",3:"#fee08b",4:"#d9ef8b",5:"#91cf60",6:"#1a9850"};
const bandRange = {1:"0–9",2:"10–19",3:"20–29",4:"30–39",5:"40–49",6:"50–59"};

export default function LegendControl({ minKmh, maxKmh }) {
  const map = useMap();

  useEffect(() => {
    const ctrl = L.control({ position: "bottomright" });

    ctrl.onAdd = () => {
      const div = L.DomUtil.create("div", "leaflet-control legend");

      const gradient = `linear-gradient(
        to right,
        ${bandColor[1]},${bandColor[2]},${bandColor[3]},
        ${bandColor[4]},${bandColor[5]},${bandColor[6]}
      )`;

      div.innerHTML = `
        <div class="legend-title">Speed band (km/h)</div>
        ${[1,2,3,4,5,6].map(b => `
          <div class="legend-row">
            <span class="swatch" style="background:${bandColor[b]}"></span>
            <span>Band ${b} (${bandRange[b]})</span>
          </div>`).join("")}

        <hr/>

        <div class="legend-title" style="margin-top:6px">Incident color = nearby speed</div>
        <div class="gradient" style="background:${gradient}"></div>
        <div class="legend-scale">
          <span>${Number.isFinite(minKmh) ? minKmh : "slow"}</span>
          <span>${Number.isFinite(maxKmh) ? maxKmh : "fast"}</span>
        </div>

        <div class="legend-row" style="margin-top:6px">
          <span class="dot"></span>
          <span>Circle size ≈ severity</span>
        </div>
      `;

      // keep map draggable when cursor is over the legend
      L.DomEvent.disableClickPropagation(div);
      L.DomEvent.disableScrollPropagation(div);
      return div;
    };

    ctrl.addTo(map);
    return () => ctrl.remove();
  }, [map, minKmh, maxKmh]);

  return null;
}
