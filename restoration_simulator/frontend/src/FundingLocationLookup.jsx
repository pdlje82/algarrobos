import React,{useEffect,useState} from "react";
import {SelectionSources} from "./FundingSelection.jsx";
import {validateStatisticsResponse} from "./fundingStatisticsState.js";

export function FundingLocationLookup({criterion,assessment,municipality,request,onApply,onManual,disabled}){
  const [loaded,setLoaded]=useState(null),[settings,setSettings]=useState(null),[error,setError]=useState(""),[loading,setLoading]=useState(false),[reload,setReload]=useState(0);
  const stored=Object.hasOwn(assessment,"location_lookup")?assessment.location_lookup:null;
  useEffect(()=>{
    let current=true;setLoading(true);setError("");
    (async()=>{try{
      const value=validateStatisticsResponse(await request("funding/statistics"));
      const initial=stored===null?{...value.dataset.defaults,municipality:value.dataset.municipalities.some(row=>row.name===municipality)?municipality:null}:stored.settings;
      if(current){setLoaded(value);setSettings(previous=>previous===null?initial:previous);}
    }catch(e){if(current)setError(`Population/business lookup unavailable: ${e.message}`);}finally{if(current)setLoading(false);}})();
    return()=>{current=false;};
  },[reload]);
  const automated=stored===null?[]:stored.automated;
  async function apply(next,criteria){
    setLoading(true);setError("");
    try{await onApply(next,criteria,loaded.dataset_hash);}catch(e){setError(e.message);}finally{setLoading(false);}
  }
  function change(next){setSettings(next);if(automated.length&&next.municipality!==null)apply(next,automated);}
  function manual(){onManual(criterion);}
  const busy=disabled||loading;
  return <section className="funding-location-lookup" aria-label="AL20 population and business lookup">
    <h4>Population and business lookup</h4>
    {error&&<p role="alert">{error}<button type="button" disabled={loading} onClick={()=>setReload(n=>n+1)}>Reload statistics</button></p>}
    {loaded===null||settings===null?<p role="status">{loading?"Loading published municipality figures…":"The lookup has not loaded. Manual choices remain available."}</p>:<>
      <p>Published {loaded.dataset.year} guide tables · provisional self-assessment. The local criteria refer to 2023; confirm the applicable year before relying on this score.</p>
      {stored!==null&&stored.settings.municipality!==municipality&&loaded.dataset.municipalities.some(row=>row.name===municipality)&&<p className="reason">This route’s lookup uses {stored.settings.municipality}; the activity municipality is {municipality}. Change the lookup municipality below if this assessment should follow the activity location.</p>}
      <label>Lookup municipality<select aria-label="Lookup municipality" value={settings.municipality===null?"":settings.municipality} disabled={busy} onChange={e=>change({...settings,municipality:e.target.value===""?null:e.target.value})}><option value="">Choose an AL20 municipality</option>{loaded.dataset.municipalities.map(row=><option key={row.name} value={row.name}>{row.name}</option>)}</select></label>
      {settings.municipality!==null&&<MunicipalityFigures data={loaded.dataset} municipality={settings.municipality}/>}
      <label>Population basis for AT.3<select aria-label="Population basis for AT.3" value={settings.population_mode} disabled={busy} onChange={e=>{const mode=e.target.value;const next={...settings,population_mode:mode,settlement_name:mode==="settlement"?"":null,population:null,population_year:mode==="settlement"?loaded.dataset.year:null};setSettings(next);if(mode!=="settlement"&&automated.length&&next.municipality!==null)apply(next,automated);}}><option value="unconfirmed">Settlement population not confirmed — leave AT.3 unanswered</option><option value="municipality_proxy">Use municipality total as a provisional settlement proxy</option><option value="settlement">Enter the actual settlement (núcleo) population</option></select></label>
      {settings.population_mode==="settlement"&&<>
        <label>Settlement name<input maxLength={300} value={settings.settlement_name} disabled={busy} onChange={e=>setSettings({...settings,settlement_name:e.target.value})}/></label>
        <label>Settlement population ({loaded.dataset.year})<input type="number" min="0" step="1" value={settings.population===null?"":settings.population} disabled={busy} onChange={e=>setSettings({...settings,population:e.target.value===""?null:Number(e.target.value)})}/></label>
        <p>The guide does not list individual settlements. Check the actual núcleo in the INE Nomenclátor, using the same reference year.</p>
      </>}
      {settings.population_mode==="municipality_proxy"&&<p className="reason">A municipality total may include several settlements. This proxy is an explicit assumption, not a verified núcleo count.</p>}
      <p>AT.3 uses population medians: AL20 {loaded.dataset.benchmarks.population_zrl_median}; Andalusia {loaded.dataset.benchmarks.population_andalusia_median}. RD.5 uses the business average {loaded.dataset.benchmarks.businesses_zrl_mean}, not the business median {loaded.dataset.benchmarks.businesses_zrl_median}.</p>
      <p role="status">{automated.includes(criterion)?`${criterion} is set from this location. Changing the lookup recalculates it.`:`${criterion} uses manual answers.`} Changing this route does not change another route.</p>
      <div className="funding-actions"><button type="button" disabled={busy||settings.municipality===null} onClick={()=>apply(settings,["AT.3","RD.5"])}>Set AT.3 and RD.5 from this location</button><button type="button" disabled={busy||!automated.includes(criterion)} onClick={manual}>Use manual answers for {criterion}</button></div>
      <p>The lookup replaces these two criteria’s selections for this route. Notes and references are retained. Editing a choice switches that criterion to manual.</p>
      {stored!==null&&JSON.stringify(settings)!==JSON.stringify(stored.settings)&&<p role="status">Lookup settings have not been applied. Complete the inputs and use “Set AT.3 and RD.5 from this location”.</p>}
      <details><summary>All 32 municipalities, sources and limitations</summary>{loaded.dataset.limitations.map(t=><p key={t}>{t}</p>)}<SelectionSources sources={loaded.dataset.sources}/><div className="funding-statistics-table"><table><thead><tr><th>Municipality</th><th>Population</th><th>Businesses</th></tr></thead><tbody>{loaded.dataset.municipalities.map(r=><tr key={r.name}><th scope="row">{r.name}</th><td>{r.population}</td><td>{r.businesses}</td></tr>)}</tbody></table></div></details>
    </>}
  </section>;
}

function MunicipalityFigures({data,municipality}){
  const row=data.municipalities.find(r=>r.name===municipality);
  if(row===undefined)throw Error("The selected AL20 municipality is missing from the statistics dataset. Reload the lookup.");
  return <p>{row.name}: {row.population} inhabitants · {row.businesses} businesses ({data.year}).</p>;
}
