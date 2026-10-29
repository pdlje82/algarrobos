import React from "react";
import { designerHelp } from "./designerHelp.js";
import {DocumentLink} from "./DocumentLink.jsx";

export function SourceLinks({refs,sources}) {
  return <p>{refs.map(ref=>{
    const source=sources[ref.id];
    if(source===undefined||typeof source.sha256!=="string"||! /^[a-f0-9]{64}$/.test(source.sha256))return <span key={ref.id} role="alert">Reference {ref.id} cannot be opened: its saved document checksum is missing or invalid. Reload after checking the source data.</span>;
    return <span key={ref.id}>{ref.pages.map(page=><DocumentLink key={page} expectedSha256={source.sha256} href={`/api/designer/sources/${ref.id}#page=${page}`} target="_blank" rel="noreferrer">{ref.id} p. {page} </DocumentLink>)}</span>;
  })}</p>;
}

export function PocketHelp({facts,showCrowns}) {
  const help=designerHelp.features.pocket;
  return <div className="designer-plain-help"><p>{help.text} {help.states[facts.state]}</p>
    {facts.plotted&&<p>{showCrowns?help.crown:help.crown_hidden}</p>}
    {facts.extra_quantity>0&&<p>{facts.extra_quantity} additional encina{facts.extra_quantity===1?"":"s"}. {help.extra}</p>}
    <p className="muted">{help.caution}</p></div>;
}

export function DensityHelp({defaults}) {
  const help=designerHelp.features.density;
  return <><p>{help.text}</p>{defaults===null?<p>This historical design has no saved density defaults; it uses recorded plant counts.</p>:<p>Saved starting values, per species: algarrobo <strong>{defaults.carob}/ha</strong>, shrubs <strong>{defaults.shrub}/ha</strong>, other trees <strong>{defaults.tree}/ha</strong>, grasses <strong>{defaults.grass}/ha</strong>. You can change each species separately.</p>}<p>{help.example}</p></>;
}

export function FeatureHelp({id}) {
  const value=designerHelp.features[id];
  return value===undefined?<p className="error" role="alert">Help unavailable for {id}. Update designer-help.json.</p>:<><p>{value.text}</p>{value.caution&&<p className="muted">{value.caution}</p>}</>;
}

function RuleHelp({id,evaluation,showCrowns}) {
  const rule=designerHelp.rules[id];
  if(rule===undefined)return <p className="error" role="alert">Help unavailable for rule {id}. Update designer-help.json.</p>;
  if(rule.feature==="pocket")return <PocketHelp facts={evaluation.display.pocket} showCrowns={showCrowns}/>;
  if(rule.feature==="density")return <DensityHelp defaults={evaluation.display.density_defaults}/>;
  if(rule.feature!==undefined)return <FeatureHelp id={rule.feature}/>;
  if(rule.sections!==undefined)return rule.sections.map(section=><section key={section.title}><h4>{section.title}</h4>{section.paragraphs.map(p=><p key={p}>{p}</p>)}</section>);
  return <><p>{rule.text}</p>{rule.caution&&<p className="muted">{rule.caution}</p>}</>;
}

export function DesignGuide({evaluation,showCrowns,onReference}) {
  const {draft}=evaluation;
  const combinations=draft.bundle.vegetation_combinations.filter(c=>draft.combinations.includes(c.id)||draft.approaches.some(id=>c.id===id+"_mix"));
  return <section className="designer-guide"><h2>Design guide</h2>
    <p>Read about the drawing and the planting choices.</p>
    <div className="designer-reference-links"><button type="button" onClick={()=>onReference("plant")}>Algarrobo Planting Explorer</button><button type="button" onClick={()=>onReference("models")}>Restoration Model Explorer</button></div>
    {evaluation.rules.filter(r=>r.id!=="density_scenarios").map(r=><details key={r.id}><summary>{designerHelp.rules[r.id]===undefined?r.title:designerHelp.rules[r.id].title}</summary>
      <RuleHelp id={r.id} evaluation={evaluation} showCrowns={showCrowns}/>
      <details className="designer-source-details"><summary>Sources and details</summary><p>{r.description}</p><p>{r.limitations}</p><SourceLinks refs={r.sources} sources={draft.bundle.sources}/>
        {r.id==="density"&&evaluation.rules.filter(rule=>rule.id==="density_scenarios").map(rule=><React.Fragment key={rule.id}><p>{rule.description}</p><p>{rule.limitations}</p><SourceLinks refs={rule.sources} sources={draft.bundle.sources}/></React.Fragment>)}
        {r.id==="autumn"&&<p>For container comparisons, the Níjar example and differences between specifications, open Buying plants and Establishment care in the Algarrobo Planting Explorer.</p>}
      </details>
    </details>)}
    <details><summary>Vegetation combinations</summary><FeatureHelp id="combinations"/>{combinations.map(c=><section key={c.id}><h4>{c.title}</h4><p>{designerHelp.combinations[c.id]===undefined?`Help unavailable for combination ${c.id}.`:designerHelp.combinations[c.id]}</p><details><summary>Sources and details</summary><p>{c.description}</p><SourceLinks refs={c.sources} sources={draft.bundle.sources}/></details></section>)}</details>
    <details><summary>Unplaced plants</summary><FeatureHelp id="unplaced"/></details>
    <details className="designer-technical"><summary>Technical details</summary>
      <p>Saved rules, original placement explanations and edit records. These remain unchanged by wording updates.</p>
      <pre>{JSON.stringify({ruleset:draft.bundle.manifest,rules:evaluation.rules,combinations,placement_notes:draft.version===3?draft.placement_notes:null,edits:draft.overrides},null,2)}</pre>
    </details>
  </section>;
}
