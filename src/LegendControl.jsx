// LegendControl.jsx (or inline in the same file)
import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

const bandColor = {1:"#d73027",2:"#fc8d59",3:"#fee08b",4:"#d9ef8b",5:"#91cf60",6:"#1a9850"};
const bandRange = {1:"0–9",2:"10–19",3:"20–29",4:"30–39",5:"40–49",6:"50–59"};

export default function LegendControl() {
  const map = useMap();
  useEffect(() => {
    const ctrl = L.control({ position: "bottomright" });
    ctrl.onAdd = () => {
      const div = L.DomUtil.create("div", "leaflet-control legend");
      div.innerHTML = `
        <div class="legend-title">Speed band (km/h)</div>
        ${[1,2,3,4,5,6].map(b =>
          `<div class="legend-row">
             <span class="swatch" style="background:${bandColor[b]}"></span>
             <span>Band ${b} (${bandRange[b]})</span>
           </div>`).join("")}
        <hr/>
        <div class="legend-row"><span class="dot"></span><span>Incidents (circle size ≈ severity)</span></div>
      `;
      // keep map draggable when cursor over legend
      L.DomEvent.disableClickPropagation(div);
      L.DomEvent.disableScrollPropagation(div);
      return div;
    };
    ctrl.addTo(map);
    return () => ctrl.remove();
  }, [map]);
  return null;
}
