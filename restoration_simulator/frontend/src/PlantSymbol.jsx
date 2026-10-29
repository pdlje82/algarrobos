import React from "react";
import { symbolForGroup, symbolForPlant, symbolPath, symbolScheme } from "./plantSymbols.js";

export function PlantSymbol({ appearance }) {
  const path = symbolPath(appearance.shape, 0, 0);
  return <svg className="plant-symbol-key plant-symbol-colours" style={appearance.style} viewBox="-.4 -.4 .8 .8" aria-hidden="true" focusable="false">
    <path d={path} className="designer-symbol-halo" vectorEffect="non-scaling-stroke"/>
    <path d={path} className="designer-plant-symbol" vectorEffect="non-scaling-stroke"/>
  </svg>;
}

export function PlantSymbolLegend({ plants }) {
  return <div className="plant-symbol-legend">
    <div className="plant-symbol-families" aria-label="Plant symbol colour families">{Object.entries(symbolScheme.groups).map(([id, group])=>
      <span key={id}><PlantSymbol appearance={symbolForGroup(id)}/><strong>{group.label}</strong><small>{group.family}</small></span>
    )}</div>
    {plants.length > 0 && <details className="plant-symbol-species-key"><summary>Species colour key ({plants.length})</summary>
      <p>Each species keeps its colour. Shapes identify growth forms; names identify similar shades.</p>
      <div>{Object.entries(symbolScheme.groups).map(([id,group])=>{
        const members = plants.filter(p=>p.group===id);
        return members.length === 0 ? null : <section key={id}><h3>{group.label}</h3><ul>{members.map(plant=>
          <li key={plant.id}><PlantSymbol appearance={symbolForPlant(plant)}/><span>{plant.label}{plant.id.startsWith("custom-")&&<small>Custom plant</small>}</span></li>
        )}</ul></section>;
      })}</div>
    </details>}
  </div>;
}

