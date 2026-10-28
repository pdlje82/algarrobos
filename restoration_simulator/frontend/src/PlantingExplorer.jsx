import React, { useId, useLayoutEffect, useRef, useState } from "react";
import guideData from "./carob-planting-guide.json";
import { plantIllustration } from "./PlantPortrait.jsx";
import { validatePlantingGuide } from "./plantingGuide.js";
import { Evidence, References, GuideCard, GuidePhotograph } from "./ExplorerContent.jsx";
import { LearningDialog } from "./LearningDialog.jsx";
import { RestorationModelContent } from "./RestorationModelExplorer.jsx";
import "./PlantingExplorer.css";

export function PlantingExplorer() {
  const [open, setOpen] = useState(false);
  const opener = useRef(null);
  return (
    <>
      <button ref={opener} type="button" className="plant-guide-open" aria-label="Planting information for Algarrobo" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <span aria-hidden="true">↗</span> Planting information
      </button>
      {open && <ExplorerDialog onClose={() => setOpen(false)} opener={opener} />}
    </>
  );
}

function ExplorerDialog({ onClose, opener }) {
  const titleId = useId();
  const descriptionId = useId();
  const modelsHeading = useId();
  const modelsDescription = useId();
  const [modelsOpen, setModelsOpen] = useState(false);
  const modelsTrigger = useRef(null);
  const previouslyModels = useRef(false);
  const closeModels = () => setModelsOpen(false);
  useLayoutEffect(() => {
    if (!modelsOpen && previouslyModels.current) modelsTrigger.current.focus({ preventScroll: true });
    previouslyModels.current = modelsOpen;
  }, [modelsOpen]);
  const illustration = plantIllustration("carob");
  const [imageFailed, setImageFailed] = useState(false);
  const [content] = useState(() => {
    try {
      return { guide: validatePlantingGuide(guideData), error: null };
    } catch (error) {
      return { guide: null, error: error.message };
    }
  });
  return (
    <LearningDialog labelledBy={modelsOpen ? modelsHeading : titleId} describedBy={modelsOpen ? modelsDescription : descriptionId}
      onDismiss={modelsOpen ? closeModels : onClose} returnFocusRef={opener}>
      <div className="explorer-session-panel" hidden={modelsOpen} data-explorer-panel="plant">
      <header className="explorer-heading">
        <div className="explorer-identity">
          <div className="explorer-portrait" hidden={imageFailed}>
            <img src={illustration.whole_image} alt="Algarrobo, representative mature form" width="72" height="72" onError={() => setImageFailed(true)} />
          </div>
          <div>
            <p className="explorer-eyebrow">Planting Explorer</p>
            <h2 id={titleId}><span lang="es">Algarrobo</span> · Carob · <i>{illustration.scientific_name}</i></h2>
            <p id={descriptionId}>Read and explore · seed-grown, ungrafted restoration</p>
            {imageFailed && <p role="alert" className="explorer-image-error">Plant image unavailable. Close and reopen to retry; the guidance remains readable.</p>}
          </div>
        </div>
        <button type="button" autoFocus onClick={onClose}>Close</button>
      </header>
      {content.error !== null ? (
        <div className="explorer-body"><p className="error" role="alert">Planting guide could not be opened: {content.error} Your checklist is retained. Close this guide and reload the application to retry.</p></div>
      ) : <GuideViews guide={content.guide} onExploreModels={() => setModelsOpen(true)} modelsTrigger={modelsTrigger} />}
      </div>
      {modelsOpen && <RestorationModelContent headingId={modelsHeading} descriptionId={modelsDescription}
        onDismiss={closeModels} onBackToPlant={closeModels} />}
    </LearningDialog>
  );
}

function GuideViews({ guide, onExploreModels, modelsTrigger }) {
  const [view, setView] = useState(guide.presentation.initial_view);
  const [feature, setFeature] = useState(guide.presentation.initial_feature);
  const id = useId();
  const tabs = useRef([]);
  const body = useRef(null);
  function chooseView(next) {
    setView(next);
    body.current.scrollTop = 0;
  }
  function moveTab(event, index) {
    let next;
    if (event.key === "ArrowRight") next = (index + 1) % guide.views.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + guide.views.length) % guide.views.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = guide.views.length - 1;
    else return;
    event.preventDefault();
    chooseView(guide.views[next].id);
    tabs.current[next].focus();
  }
  return (
    <>
      <div className="explorer-tabs" role="tablist" aria-label="Planting guide views">
        {guide.views.map((item, index) => (
          <button key={item.id} ref={element => { tabs.current[index] = element; }} type="button" role="tab" id={`${id}-tab-${item.id}`}
            aria-controls={`${id}-panel-${item.id}`} aria-selected={view === item.id} tabIndex={view === item.id ? 0 : -1}
            onClick={() => chooseView(item.id)} onKeyDown={event => moveTab(event, index)}>{item.label}</button>
        ))}
      </div>
      <div className="explorer-body" ref={body}>
        <p className="explorer-readonly">A learning guide. No planting choices are saved, calculated or applied to your project.</p>
        {guide.views.map(item => (
          <section key={item.id} id={`${id}-panel-${item.id}`} className="explorer-view" role="tabpanel" aria-labelledby={`${id}-tab-${item.id}`} hidden={view !== item.id} tabIndex={0}>
            {item.id === "planting" && <PlantingView guide={guide} feature={feature} setFeature={setFeature} />}
            {item.id === "buying" && <BuyingView guide={guide} />}
            {item.id === "care" && <CareView guide={guide} />}
            {item.id === "evidence" && <EvidenceView guide={guide} onExploreModels={onExploreModels} modelsTrigger={modelsTrigger} />}
          </section>
        ))}
        <details className="explorer-limitations">
          <summary>Evidence limitations</summary>
          <ul>{guide.limitations.map(text => <li key={text}>{text}</li>)}</ul>
        </details>
        <footer className="explorer-source">
          <a href={guide.source.publication_url} target="_blank" rel="noreferrer">{guide.source.title}</a>
          <p>{guide.source.authors}. Guide reviewed {guide.reviewed}.</p>
          <details><summary>Research basis and illustration credits</summary>
            <p>{guide.source.research}</p>
            <p>The section diagram is an original geometric explanation, not measured roots or a site specification. The identity image is an AI-generated botanical illustration, not to scale. Example photographs are original handbook extracts, credited to QUERAT (2024) under CC BY-NC-SA 4.0. Select a photograph to open its original pixels; the adjacent book link opens its source page.</p>
          </details>
        </footer>
      </div>
    </>
  );
}

function PlantingView({ guide, feature, setFeature }) {
  const selected = guide.features.find(item => item.id === feature);
  return (
    <>
      <h3>Understand the planting section</h3>
      <p>Select a numbered feature or its label. The explanation follows your selection.</p>
      <div className="explorer-planting-layout">
        <figure className="explorer-diagram">
          <PlantingSection guide={guide} selected={feature} onSelect={setFeature} />
          <figcaption>Conceptual section · not to scale. No hole size or mature rooting depth is implied.</figcaption>
          <div className="explorer-feature-buttons" aria-label="Planting diagram features">
            {guide.features.map(item => <button type="button" key={item.id} aria-pressed={feature === item.id} onClick={() => setFeature(item.id)}>
              <span aria-hidden="true">{item.number}</span>{item.label}
            </button>)}
          </div>
        </figure>
        <article className="explorer-feature-detail" aria-live="polite" aria-atomic="true">
          <Evidence kind={selected.kind} />
          <h4>{selected.number}. {selected.label}</h4>
          <p>{selected.text}</p>
          <p className="explorer-basis">{selected.basis}</p>
          <References guide={guide} pages={selected.pages} />
        </article>
      </div>
      <h3>Two preparation examples, two contexts</h3>
      <div className="explorer-card-grid">{guide.preparations.map(card => <GuideCard key={card.title} guide={guide} card={card} heading="h4" />)}</div>
      <p className="explorer-caution"><strong>Choose from the soil diagnosis and the actual root ball.</strong> These dimensions do not form a container-size lookup table. Keep nursery substrate separate from field backfill.</p>
    </>
  );
}

function PlantingSection({ guide, selected, onSelect }) {
  const title = useId();
  const description = useId();
  const positions = [[280,156], [280,221], [100,156], [280,293], [422,342], [387,220]];
  function activate(event, id) {
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelect(id); }
  }
  return (
    <svg className={`explorer-section selected-${selected}`} viewBox="0 0 560 420" role="group" aria-labelledby={title} aria-describedby={description}>
      <title id={title}>Interactive planting section</title>
      <desc id={description}>Six numbered buttons identify the root collar, root ball, final soil surface, stable support, preparation depth and root-ball dimensions. The soil preparation is wider and deeper than the root ball; the collar stays at the surface. Equivalent labelled buttons follow the diagram.</desc>
      <rect className="explorer-soil" x="36" y="156" width="488" height="230" rx="5" />
      <rect className="explorer-prepared" x="80" y="156" width="400" height="230" />
      <path className="explorer-stem" d="M280 58V156M280 90L260 76M280 112L300 94" />
      <path className="explorer-surface" d="M36 156H524" />
      <rect className="explorer-ball" x="220" y="156" width="120" height="119" />
      <path className="explorer-support" d="M212 278H348" />
      <path className="explorer-measure" d="M220 128H340M220 120V136M340 120V136M359 156V275M351 156H367M351 275H367" />
      <path className="explorer-depth" d="M498 156V386M490 156H506M490 386H506" />
      {guide.features.map((item, index) => (
        <g key={item.id} className={`explorer-diagram-control ${selected === item.id ? "is-selected" : ""}`} role="button" tabIndex={0}
          aria-label={`Highlight ${item.label.toLowerCase()}`} aria-pressed={selected === item.id} onClick={() => onSelect(item.id)} onKeyDown={event => activate(event, item.id)}>
          <circle cx={positions[index][0]} cy={positions[index][1]} r="23" />
          <text x={positions[index][0]} y={positions[index][1] + 9} textAnchor="middle">{item.number}</text>
        </g>
      ))}
    </svg>
  );
}

function BuyingView({ guide }) {
  return (
    <>
      <h3>What to ask the nursery</h3>
      <Evidence kind="guidance" />
      <p>These are buying checks to read through, not confirmations saved to your project.</p>
      <ol className="explorer-buying-list">{guide.buying_checks.map(card => <li key={card.title}>
        <h4>{card.title}</h4><p>{card.text}</p><References guide={guide} pages={card.pages} />
      </li>)}</ol>
      <h3>Compare container formats</h3>
      <div className="explorer-container-grid">{guide.containers.map(card => <article className="explorer-card" key={card.size}>
        <Evidence kind={card.kind} /><h4 className="explorer-size">{card.size}</h4><strong>{card.label}</strong><p>{card.text}</p><References guide={guide} pages={card.pages} />
      </article>)}</div>
      <p className="explorer-caution"><strong>No universal optimum.</strong> Ask for internal dimensions, root inspection and time in the container before deciding. Larger does not automatically mean better.</p>
      <GuideCard guide={guide} card={guide.substrate} />
    </>
  );
}

function CareView({ guide }) {
  return (
    <>
      <h3>Plan for establishment, then review</h3>
      <div className="explorer-card-grid">{guide.care.map(card => <GuideCard key={card.title} guide={guide} card={card} heading="h4" />)}</div>
      <h3>Nutrition and root–fungus associations</h3>
      {guide.treatments.map(card => <details className="explorer-treatment" key={card.title}>
        <summary>{card.title}</summary><Evidence kind={card.kind} /><p>{card.text}</p><References guide={guide} pages={card.pages} />
      </details>)}
    </>
  );
}

function EvidenceView({ guide, onExploreModels, modelsTrigger }) {
  return (
    <>
      <h3>Learn from the Almería examples</h3>
      <p><button type="button" ref={modelsTrigger} onClick={onExploreModels}>Explore restoration models</button> <span className="muted">Compare parcel-level approaches, then return to this guide.</span></p>
      <p>The rainfall ranges are reported climate descriptions, not a site forecast. None of these examples isolates the effects of one planting treatment.</p>
      <div className="explorer-example-grid">{guide.examples.map(example => <article className="explorer-card" key={example.id}>
        <Evidence kind="observation" /><h4>{example.title}</h4><strong>Annual rainfall: {example.rainfall}</strong>
        <GuidePhotograph guide={guide} photo={example.photo} page={example.photo_page} subject={example.title} sourceLabel="Landscape photographs" />
        <dl>{[["Vegetation", example.vegetation], ["Water", example.water], ["Management", example.management]].map(([label, text]) => (
          <React.Fragment key={label}><dt>{label}</dt><dd>{text}</dd></React.Fragment>
        ))}</dl>
        <p>{example.lesson}</p><References guide={guide} pages={example.pages} />
      </article>)}</div>
      <GuideCard guide={guide} card={guide.oak} />
      <GuidePhotograph guide={guide} photo={guide.oak.photo} page={guide.oak.photo_page} subject="mixed oak–carob dehesa" sourceLabel="Mixed oak–carob dehesa photograph" />
    </>
  );
}

