import React, { useState } from "react";
import illustrations from "./plant-illustrations.json";
import { properties, required } from "./contracts.js";

export function plantIllustration(id) {
  required(illustrations.version === 1, "Unsupported plant illustration metadata.");
  const value = illustrations.plants.find((plant) => plant.id === id);
  required(value !== undefined, `Missing botanical illustration for ${id}.`);
  properties(value, ["spanish_name", "scientific_name", "image", "features", "references"], `plant illustration ${id}`);
  for (const key of ["spanish_name", "scientific_name", "image", "features"])
    required(typeof value[key] === "string" && value[key].trim().length > 0, `Invalid ${key} for ${id}.`);
  required(Array.isArray(value.references) && value.references.length > 0, `Missing botanical references for ${id}.`);
  return value;
}

export function PlantPortrait({ id }) {
  const illustration = plantIllustration(id);
  const [failed, setFailed] = useState(false);
  return (
    <span className="plant-portrait">
      <img
        src={illustration.image}
        alt={`${illustration.scientific_name}: ${illustration.features}`}
        width="88"
        height="88"
        loading="lazy"
        onError={() => setFailed(true)}
        hidden={failed}
      />
      {failed && <small role="alert">Illustration unavailable. Identification references remain in Details.</small>}
    </span>
  );
}
