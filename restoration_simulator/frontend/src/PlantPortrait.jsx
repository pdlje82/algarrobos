import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import illustrations from "./plant-illustrations.json";
import { properties, required } from "./contracts.js";

export function plantIllustration(id) {
  required(illustrations.version === 2, "Unsupported plant illustration metadata.");
  const value = illustrations.plants.find((plant) => plant.id === id);
  required(value !== undefined, `Missing botanical illustration for ${id}.`);
  properties(value, ["spanish_name", "scientific_name", "image", "features", "whole_image", "habit", "references"], `plant illustration ${id}`);
  for (const key of ["spanish_name", "scientific_name", "image", "features", "whole_image", "habit"])
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
        <button
          type="button"
          className="plant-portrait-open"
          aria-label={`View plant illustrations of ${illustration.scientific_name}`}
          aria-haspopup="dialog"
          title="Compare whole plant and botanical detail"
          onClick={() => setExpanded(true)}
        >
          <img
            src={illustration.whole_image}
            alt={`${illustration.scientific_name}, representative mature form: ${illustration.habit}`}
            width="88"
            height="88"
            loading="lazy"
            onError={() => setFailed(true)}
            hidden={failed}
          />
          {failed && <small role="alert">Whole-plant image unavailable. Open views for details.</small>}
        </button>
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
          <small>Whole plant and botanical detail · illustrations not to scale</small>
        </div>
        <button type="button" autoFocus onClick={() => dialog.current.close()}>Close</button>
      </header>
      <div className="plant-image-pair">
        <PlantImagePanel
          title="Representative mature form"
          image={illustration.whole_image}
          scientificName={illustration.scientific_name}
          description={`${illustration.habit} Form varies with age, site and management.`}
        />
        <PlantImagePanel
          title="Botanical detail"
          image={illustration.image}
          scientificName={illustration.scientific_name}
          description={illustration.features}
        />
      </div>
    </dialog>
  );
}

function PlantImagePanel({ title, image, scientificName, description }) {
  const [originalSize, setOriginalSize] = useState(false);
  const [failed, setFailed] = useState(false);
  const captionId = useId();
  return (
    <figure className="plant-image-panel">
      <figcaption className="plant-view-caption" id={captionId}>
        <strong>{title}</strong>
        <button
          type="button"
          aria-label={`${originalSize ? "Fit" : "Show original-size"} ${title.toLowerCase()} of ${scientificName}`}
          aria-pressed={originalSize}
          disabled={failed}
          onClick={() => setOriginalSize((current) => !current)}
        >
          {originalSize ? "Fit view" : "Original size"}
        </button>
      </figcaption>
      <div
        className={`plant-image-scroll ${originalSize ? "plant-image-original" : ""}`}
        role="region"
        aria-labelledby={captionId}
        tabIndex={originalSize ? 0 : undefined}
      >
        {failed ? (
          <p role="alert">{title} image could not be loaded. Close and open the viewer to retry.</p>
        ) : (
          <img
            src={image}
            alt={`${scientificName}: ${description}`}
            onError={() => setFailed(true)}
          />
        )}
      </div>
      <p className="plant-view-description">{description}</p>
    </figure>
  );
}
