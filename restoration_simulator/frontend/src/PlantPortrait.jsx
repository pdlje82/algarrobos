import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const [expanded, setExpanded] = useState(false);
  return (
    <span className="plant-portrait">
      {!failed && (
        <button
          type="button"
          className="plant-portrait-open"
          aria-label={`View original-size illustration of ${illustration.scientific_name}`}
          aria-haspopup="dialog"
          title="View original-size illustration"
          onClick={() => setExpanded(true)}
        >
          <img
            src={illustration.image}
            alt={`${illustration.scientific_name}: ${illustration.features}`}
            width="88"
            height="88"
            loading="lazy"
            onError={() => setFailed(true)}
          />
        </button>
      )}
      {failed && <small role="alert">Illustration unavailable. Identification references remain in Details.</small>}
      {expanded && createPortal(
        <PlantImageViewer illustration={illustration} onClose={() => setExpanded(false)} />,
        document.body,
      )}
    </span>
  );
}

function PlantImageViewer({ illustration, onClose }) {
  const dialog = useRef(null);
  const titleId = useId();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    dialog.current.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="plant-image-viewer"
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) dialog.current.close();
      }}
    >
      <header className="plant-image-heading">
        <div id={titleId}>
          <strong lang="es">{illustration.spanish_name}</strong>
          <i>{illustration.scientific_name}</i>
          <small>Original size · scroll if needed</small>
        </div>
        <button type="button" autoFocus onClick={() => dialog.current.close()}>Close</button>
      </header>
      <div className="plant-image-scroll">
        {failed ? (
          <p role="alert">Illustration could not be loaded. Close and open it again to retry.</p>
        ) : (
          <img
            src={illustration.image}
            alt={`${illustration.scientific_name}: ${illustration.features}`}
            onError={() => setFailed(true)}
          />
        )}
      </div>
    </dialog>
  );
}
