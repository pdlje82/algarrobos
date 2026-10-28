import React, { useId, useLayoutEffect, useRef, useState } from "react";
import plantingGuide from "./carob-planting-guide.json";
import modelData from "./restoration-models.json";
import { LearningDialog } from "./LearningDialog.jsx";
import { Evidence, References, GuideCard, GuidePhotograph } from "./ExplorerContent.jsx";
import { validateRestorationModels } from "./restorationModels.js";
import "./RestorationModelExplorer.css";

export function RestorationModelExplorer() {
  const [open, setOpen] = useState(false);
  const opener = useRef(null);
  const heading = useId();
  const description = useId();
  return (
    <>
      <button type="button" ref={opener} className="plant-guide-open" aria-haspopup="dialog" onClick={() => setOpen(true)}>Explore restoration models</button>
      {open && <LearningDialog labelledBy={heading} describedBy={description} returnFocusRef={opener} onDismiss={() => setOpen(false)}>
        <RestorationModelContent headingId={heading} descriptionId={description} onDismiss={() => setOpen(false)} onBackToPlant={null} />
      </LearningDialog>}
    </>
  );
}

export function RestorationModelContent({ headingId, descriptionId, onDismiss, onBackToPlant }) {
  const [content] = useState(() => {
    try { return { guide: validateRestorationModels(modelData, plantingGuide), error: null }; }
    catch (error) { return { guide: null, error: error.message }; }
  });
  return (
    <div className="explorer-session-panel restoration-models" data-explorer-panel="models">
      <header className="explorer-heading">
        <div><p className="explorer-eyebrow">The parcel and its landscape</p>
          <h2 id={headingId}>Restoration Model Explorer</h2>
          <p id={descriptionId}>Read and compare · carob-based reference models from Andalusia</p>
        </div>
        <div className="model-heading-actions">
          {onBackToPlant !== null && <button type="button" onClick={onBackToPlant}>← Back to planting information</button>}
          <button type="button" autoFocus onClick={onDismiss}>Close</button>
        </div>
      </header>
      {content.error !== null ? <div className="explorer-body"><p className="error" role="alert">Restoration models could not be opened: {content.error} Your project and planting guide are retained. Close this view and reload the application to retry.</p></div>
        : <ModelsBody guide={content.guide} />}
    </div>
  );
}

function ModelsBody({ guide }) {
  const [view, setView] = useState(guide.presentation.initial_view);
  const [selected, setSelected] = useState(guide.presentation.initial_model);
  const body = useRef(null);
  const tabs = useRef([]);
  const modelButtons = useRef({});
  const focusModelOnReturn = useRef(false);
  const id = useId();
  const model = guide.models.find(item => item.id === selected);
  useLayoutEffect(() => {
    if (focusModelOnReturn.current && view === "models") {
      modelButtons.current[selected].focus({ preventScroll: true });
      focusModelOnReturn.current = false;
    }
  }, [selected, view]);
  function chooseView(next) { setView(next); body.current.scrollTop = 0; }
  function chooseModel(next) { focusModelOnReturn.current = view === "compare"; setSelected(next); setView("models"); body.current.scrollTop = 0; }
  function moveTab(event, index) {
    let next;
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") next = (index + 1) % guide.views.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = guide.views.length - 1;
    else return;
    event.preventDefault(); chooseView(guide.views[next].id); tabs.current[next].focus();
  }
  return (
    <>
      <div className="explorer-tabs model-tabs" role="tablist" aria-label="Restoration model views">
        {guide.views.map((item, index) => <button type="button" role="tab" key={item.id} id={`${id}-tab-${item.id}`} ref={element => { tabs.current[index] = element; }}
          aria-selected={view === item.id} aria-controls={`${id}-panel-${item.id}`} tabIndex={view === item.id ? 0 : -1}
          onClick={() => chooseView(item.id)} onKeyDown={event => moveTab(event, index)}>{item.label}</button>)}
      </div>
      <div className="explorer-body" ref={body}>
        <p className="explorer-readonly">Reading does not select a project strategy, change plants, calculate costs or assess funding. Book order is not a suitability ranking.</p>
        <div className="model-choice-cards" role="group" aria-label="Models to explore">
          {guide.models.map(item => <button type="button" key={item.id} ref={element => { modelButtons.current[item.id] = element; }} aria-pressed={selected === item.id} onClick={() => chooseModel(item.id)}>
            <span className="model-code">{item.code}</span><strong>{item.title}</strong><span>{item.summary}</span>
            <small>{selected === item.id ? "Currently viewing" : "Read this model"}</small>
          </button>)}
        </div>
        <section id={`${id}-panel-models`} role="tabpanel" className="explorer-view" aria-labelledby={`${id}-tab-models`} hidden={view !== "models"} tabIndex={0}>
          <ModelDetail guide={guide} model={model} />
        </section>
        <section id={`${id}-panel-compare`} role="tabpanel" className="explorer-view" aria-labelledby={`${id}-tab-compare`} hidden={view !== "compare"} tabIndex={0}>
          <ModelComparison guide={guide} selected={selected} chooseModel={chooseModel} />
        </section>
        <aside className="model-combination"><Evidence kind={guide.combination.kind} /><h3>These approaches can work together</h3><p>{guide.combination.text}</p><References guide={guide} pages={guide.combination.pages} /></aside>
        <details className="explorer-treatment model-related"><summary>Related landscape: oak–carob dehesa enrichment (MP1)</summary>
          <GuideCard guide={guide} card={guide.related} />
          <GuidePhotograph guide={guide} photo={guide.oak.photo} page={guide.oak.photo_page} subject="mixed oak–carob dehesa" sourceLabel="Mixed dehesa photograph" />
        </details>
        <details className="explorer-treatment"><summary>Production models in section 5.5</summary>
          <p>These describe productive uses. They provide context and do not redefine the restoration models as grant categories.</p>
          {guide.production_context.map(item => <div key={item.code} className="model-context-item"><h4>{item.code} · {item.title}</h4><p>{item.text}</p><References guide={guide} pages={item.pages} /></div>)}
        </details>
        <details className="explorer-treatment"><summary>How this relates to your planning controls</summary>
          <dl className="model-relationships">{guide.relationships.map(item => <React.Fragment key={item.title}><dt>{item.title}</dt><dd>{item.text}</dd></React.Fragment>)}</dl>
        </details>
        <details className="explorer-limitations"><summary>Evidence limitations and source conflicts</summary><ul>{guide.limitations.map(text => <li key={text}>{text}</li>)}</ul></details>
        <footer className="explorer-source"><a href={guide.source.publication_url} target="_blank" rel="noreferrer">{guide.source.title}</a>
          <p>{guide.source.authors}. Sections 5.5–5.6; reference reviewed {guide.reviewed}. Based on LEARN-008 and the companion soil research.</p>
          <p>Parcel diagrams are original conceptual sketches, not surveys or site prescriptions. Photographs retain their handbook credits and CC BY-NC-SA 4.0 terms.</p>
        </footer>
      </div>
    </>
  );
}

function ModelDetail({ guide, model }) {
  const purpose = model.topics.find(topic => topic.id === "purpose");
  return (
    <>
      <h3 className="model-detail-heading">{model.code} · {model.title}</h3>
      <div className="model-diagram-layout">
        <figure className="model-diagram"><ParcelDiagram model={model} />
          <figcaption>Conceptual parcel · not to scale. Symbol counts, crown sizes and areas do not specify planting density.</figcaption>
          <ul className="model-legend"><li><span className="model-symbol new" aria-hidden="true" />New carob / tree group</li><li><span className="model-symbol existing" aria-hidden="true" />Existing trees</li><li><span className="model-symbol shrub" aria-hidden="true" />Native shrubs</li></ul>
          {model.id === "mr2" && <ol className="model-water-legend"><li>Donor catchment supplies run-on.</li><li>Planting islands receive and infiltrate water.</li><li>Assess a safe overflow route.</li></ol>}
          <p className="model-diagram-note">{model.diagram_note}</p>
        </figure>
        <GuideCard guide={guide} card={purpose} heading="h4" />
      </div>
      <div className="explorer-card-grid">{model.topics.filter(topic => topic.id !== "purpose").map(topic => <GuideCard key={topic.id} guide={guide} card={topic} heading="h4" />)}</div>
      <h3>What needs checking on the actual parcel?</h3><ul className="model-site-questions">{model.questions.map(text => <li key={text}>{text}</li>)}</ul>
      <h3>Finca observations</h3>
      <div className="model-finca-grid">{model.example_ids.map(id => {
        const example = guide.examples.find(item => item.id === id);
        return <article className="explorer-card" key={id}><Evidence kind="observation" /><h4>{example.title}</h4><strong>Annual rainfall: {example.rainfall}</strong>
          <GuidePhotograph guide={guide} photo={example.photo} page={example.photo_page} subject={example.title} sourceLabel="Source photograph" />
          <dl className="model-relationships"><dt>Vegetation</dt><dd>{example.vegetation}</dd><dt>Water</dt><dd>{example.water}</dd><dt>Management</dt><dd>{example.management}</dd></dl>
          <p>{example.lesson}</p><References guide={guide} pages={example.pages} />
        </article>;
      })}</div>
    </>
  );
}

function ModelComparison({ guide, selected, chooseModel }) {
  return (
    <>
      <h3>Compare the approaches</h3><p>Compare purpose and management in their source contexts. On a narrow screen, scroll the table horizontally.</p>
      <div className="model-comparison-scroll" role="region" aria-label="Restoration model comparison, horizontally scrollable" tabIndex={0}>
        <table className="model-comparison"><caption>Three reference models · no suitability score</caption>
          <thead><tr><th scope="col">Question</th>{guide.models.map(model => <th scope="col" key={model.id} className={selected === model.id ? "model-current" : ""}>
            {model.code} · {model.title}<button type="button" onClick={() => chooseModel(model.id)}>Read {model.code}</button>
          </th>)}</tr></thead>
          <tbody>{guide.comparison.map(row => <tr key={row.id}><th scope="row">{row.label}</th>{guide.models.map(model => {
            const topic = model.topics.find(item => item.id === row.id);
            return <td key={model.id}><Evidence kind={topic.kind} /><p>{topic.text}</p><References guide={guide} pages={topic.pages} /></td>;
          })}</tr>)}
            <tr><th scope="row">Supporting examples</th>{guide.models.map(model => <td key={model.id}>{model.example_ids.map(id => {
              const example = guide.examples.find(item => item.id === id);
              return <p key={id}><strong>{example.title}</strong><br />Annual rainfall: {example.rainfall}<br /><References guide={guide} pages={example.pages} /></p>;
            })}</td>)}</tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

function ParcelDiagram({ model }) {
  const title = useId(), description = useId(), arrow = useId();
  const points = model.id === "mr1" ? [[170,105],[355,170],[535,105],[445,285]] : model.id === "mr2" ? [[160,215],[380,240],[595,265]] : [[390,255],[645,150]];
  return (
    <svg className="model-map" viewBox="0 0 720 400" role="img" aria-labelledby={title} aria-describedby={description}>
      <title id={title}>{model.code}: {model.title} · conceptual parcel diagram</title><desc id={description}>{model.diagram_description}</desc>
      <defs><marker id={arrow} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" className="model-arrowhead" /></marker></defs>
      <rect x="18" y="20" width="684" height="350" rx="15" className="model-ground" />
      {model.id === "mr1" && <><path d="M85 30Q275 130 240 225T355 360" className="model-drain" /><ExistingTree x={90} y={290} /><ExistingTree x={620} y={285} /></>}
      {model.id === "mr2" && <>
        <rect x="45" y="40" width="630" height="85" rx="10" className="model-donor" />
        {points.map(([x,y]) => <React.Fragment key={x}><path d={`M${x} 90L${x} ${y-48}`} className="model-flow" markerEnd={`url(#${arrow})`} /><path d={`M${x-65} ${y-10}Q${x} ${y+95} ${x+65} ${y-10}`} className="model-retention" /></React.Fragment>)}
        <path d="M440 248L490 310" className="model-overflow" markerEnd={`url(#${arrow})`} />
        {[[70,80,"1"],[295,220,"2"],[510,320,"3"]].map(([x,y,n]) => <g key={n}><circle cx={x} cy={y} r="19" className="model-map-label" /><text x={x} y={y+7} textAnchor="middle">{n}</text></g>)}
      </>}
      {model.id === "mr3" && <>
        {[100,255].map(y => <path key={y} d={`M65 ${y}H565`} className="model-crop-row" />)}
        {[100,255].flatMap(y => [110,250,390,530].filter(x => !(x === 390 && y === 255)).map(x => <ExistingTree key={`${x}-${y}`} x={x} y={y} />))}
      </>}
      {points.map(([x,y]) => <g key={x}><circle cx={x} cy={y} r="25" className="model-new-tree" />{[[-44,14],[38,32],[-18,53]].map(([dx,dy]) => <Shrub key={dx} x={x+dx} y={y+dy} />)}</g>)}
      {[[85,185],[540,325],[260,335]].map(([x,y]) => <Shrub key={x} x={x} y={y} />)}
    </svg>
  );
}
function ExistingTree({ x, y }) { return <g><circle cx={x} cy={y} r="25" className="model-existing-tree" /><circle cx={x} cy={y} r="8" className="model-existing-centre" /></g>; }
function Shrub({ x, y }) { return <g className="model-shrub"><circle cx={x} cy={y} r="7" /><circle cx={x+9} cy={y+6} r="5" /><circle cx={x-6} cy={y+7} r="4" /></g>; }
