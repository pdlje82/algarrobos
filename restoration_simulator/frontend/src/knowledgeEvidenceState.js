// Read-only display contracts and request lifecycle; no project-editing commands.
import registration from "../../knowledge/feature-consumers-v1.json" with {type:"json"};
import documents from "../../scenarios/documents.json" with {type:"json"};

export function validateKnowledgeEvidence(value,consumer){
  const fail=path=>{throw Error(`Current evidence is incompatible at ${path}. Check the knowledge data, restart Python and reload the app, then retry. Your draft is retained.`);};
  const need=(ok,path)=>{if(!ok)fail(path);};
  const object=v=>v!==null&&typeof v==="object"&&!Array.isArray(v);
  const text=v=>typeof v==="string"&&v.trim()!=="";
  const hash=v=>typeof v==="string"&&/^[a-f0-9]{64}$/.test(v);
  const strings=v=>Array.isArray(v)&&v.every(text)&&new Set(v).size===v.length;
  const keys=(v,names)=>object(v)&&Object.keys(v).length===names.length&&names.every(k=>Object.hasOwn(v,k));
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const date=v=>text(v)&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
  need(registration.version===1&&object(registration.consumers)&&Object.hasOwn(registration.consumers,consumer),"consumer registration");
  need(keys(value,["version","dataset_id","dataset_hash","reviewed_on","coverage","consumer_id","consumer_registry_hash","context_order","contexts"]),"response fields");
  need(value.version===1&&value.dataset_id===registration.dataset_id&&value.consumer_id===consumer&&hash(value.dataset_hash)&&hash(value.consumer_registry_hash)&&date(value.reviewed_on),"response identity");
  need(keys(value.coverage,["mode","root_entities","excluded"])&&value.coverage.mode==="registered-pilot-only"&&strings(value.coverage.root_entities)&&value.coverage.root_entities.length>0&&strings(value.coverage.excluded)&&value.coverage.excluded.length>0,"coverage");
  const evidence=refs=>{
    need(Array.isArray(refs),"evidence list");
    for(const ref of refs){
      need(keys(ref,["citation_id","passage_id","document_id","page","label","role","sha256","verified_on"]),"evidence fields");
      const doc=documents.documents.find(d=>d.id===ref.document_id);
      need(text(ref.citation_id)&&text(ref.label)&&text(ref.role)&&date(ref.verified_on)&&hash(ref.sha256)&&doc!==undefined&&doc.sha256===ref.sha256&&Number.isInteger(ref.page)&&ref.page>=1&&ref.page<=doc.pages,"document edition/page");
      need(ref.passage_id===`${ref.document_id}@${ref.sha256}:pdf:${ref.page}`,"passage identity");
    }
  };
  const binding=b=>need(keys(b,["id","adapter","native_id","label","aliases","value","authority","explanation"])&&text(b.id)&&text(b.adapter)&&text(b.native_id)&&text(b.label)&&strings(b.aliases)&&text(b.explanation)&&object(b.value)&&keys(b.authority,["file","record_hash"])&&text(b.authority.file)&&hash(b.authority.record_hash),"native binding");
  const expected=registration.consumers[consumer].contexts;
  need(same(value.context_order,registration.consumers[consumer].context_order),"context order");
  need(keys(value.contexts,Object.keys(expected)),"display contexts");
  for(const [id,spec] of Object.entries(expected)){
    const context=value.contexts[id];
    need(keys(context,["binding","claims","entities","relations","issues"]),id);
    binding(context.binding);need(context.binding.id===spec.binding_id,id+" binding");
    for(const [field,ids] of [["claims",spec.claim_ids],["entities",spec.entity_ids],["relations",spec.relation_ids]])
      need(Array.isArray(context[field])&&context[field].every(object)&&same(context[field].map(r=>r.id),ids),id+" "+field+" membership/order");
    const entityIds=new Set(spec.entity_ids),claimIds=new Set(spec.claim_ids);
    const types=new Set(["programme","funding_route","funding_call","species","restoration_approach","planting_palette","vegetation_series","treatment","strategy_need","designer_rule","example_activity"]);
    for(const e of context.entities){
      need(keys(e,["id","type","native_id","binding_id","aliases","availability","citation_ids","limitations","label","authority","evidence"])&&types.has(e.type)&&text(e.label)&&strings(e.aliases)&&strings(e.limitations)&&strings(e.citation_ids)&&text(e.native_id)&&text(e.binding_id),"entity");binding(e.authority);evidence(e.evidence);
      need(e.binding_id===e.authority.id&&e.native_id===e.authority.native_id,"entity native identity");
      need(e.availability===(["programme","funding_route","funding_call"].includes(e.type)?"not_assessed":"not_applicable"),"availability");
      need(same(e.citation_ids.slice().sort(),e.evidence.map(r=>r.citation_id).sort()),"entity citations");
      if(e.type==="example_activity")need(e.authority.adapter==="illustration"&&text(e.authority.value.description),"illustrative activity");
    }
    for(const c of context.claims){
      need(keys(c,["id","subject_ids","statement","evidence_kind","context","review_status","reviewed_on","limitations","citation_ids","configuration_ids","review_targets","evidence","configuration_values"]),"claim fields");
      need(strings(c.subject_ids)&&c.subject_ids.length>0&&c.subject_ids.every(e=>entityIds.has(e))&&text(c.statement)&&text(c.context)&&date(c.reviewed_on)&&c.reviewed_on<=value.reviewed_on&&strings(c.limitations)&&strings(c.review_targets)&&strings(c.citation_ids)&&strings(c.configuration_ids),"claim context");
      need(["official_requirement","official_strategy","guidance","project_assumption","research_gap"].includes(c.evidence_kind)&&["curated","unresolved"].includes(c.review_status),"claim classification");
      evidence(c.evidence);need(same(c.citation_ids.slice().sort(),c.evidence.map(r=>r.citation_id).sort()),"claim citations");
      need(Array.isArray(c.configuration_values)&&c.configuration_values.every(object)&&same(c.configuration_ids.slice().sort(),c.configuration_values.map(b=>b.id).sort()),"configuration references");
      if(c.evidence_kind==="project_assumption"){
        need(c.evidence.length===0&&c.configuration_values.length>0,"assumption evidence");
        for(const b of c.configuration_values){
          binding(b);need(b.value.basis==="project_assumption"&&text(b.value.ruleset_id)&&text(b.value.unit),"assumption provenance");
          if(b.adapter==="carob_density")need(b.native_id==="carob"&&b.value.unit==="plants_per_hectare"&&Number.isFinite(b.value.value)&&b.value.value>0,"density value");
          else if(b.adapter==="mr2_geometry"){
            const geometry=b.value.value;
            need(b.native_id==="mr2"&&object(geometry)&&Array.isArray(geometry.mr2_centres)&&geometry.mr2_centres.length>0&&geometry.mr2_centres.every(pair=>Array.isArray(pair)&&pair.length===2&&pair.every(n=>Number.isFinite(n)&&n>=0&&n<=1)),"drawing centres");
            need(object(geometry.rainfall_capture)&&[geometry.rainfall_capture.island_width,geometry.rainfall_capture.island_depth].every(n=>Number.isFinite(n)&&n>0),"drawing width/length");
          }else fail("unsupported assumption adapter");
        }
      }else need(c.evidence.length>0&&c.configuration_values.length===0,"source evidence");
      if(c.evidence_kind==="research_gap")need(c.review_status==="unresolved","gap status");
    }
    const relationTypes={programme_contains_route:["programme","funding_route"],call_context_for:["funding_call","programme"],approach_has_palette:["restoration_approach","planting_palette"],palette_starter_species:["planting_palette","species"],palette_optional_species:["planting_palette","species"],approach_treatment_guidance:["restoration_approach","treatment"],example_uses_approach:["example_activity","restoration_approach"],example_mentions_species:["example_activity","species"],example_considers_route:["example_activity","funding_route"],example_may_address_need:["example_activity","strategy_need"]};
    for(const r of context.relations){
      need(keys(r,["id","type","source","target","claim_ids","citation_ids","basis","context","limitations","evidence"])&&Object.hasOwn(relationTypes,r.type)&&entityIds.has(r.source)&&entityIds.has(r.target)&&strings(r.claim_ids)&&r.claim_ids.every(c=>claimIds.has(c))&&strings(r.citation_ids)&&text(r.context)&&strings(r.limitations),"relationship");
      need(same([context.entities.find(e=>e.id===r.source).type,context.entities.find(e=>e.id===r.target).type],relationTypes[r.type]),"relationship endpoint types");
      need(r.basis===(r.type.startsWith("example_")||["palette_starter_species","palette_optional_species"].includes(r.type)?"project_assumption":"source_reference"),"relationship basis");evidence(r.evidence);
      need(same(r.citation_ids.slice().sort(),r.evidence.map(e=>e.citation_id).sort()),"relationship citations");
    }
    need(Array.isArray(context.issues),"issues");
    const unresolved=new Set();
    for(const issue of context.issues){
      need(keys(issue,["id","type","claim_ids","status","explanation","limitations"])&&text(issue.id)&&["source_tension","evidence_gap"].includes(issue.type)&&issue.status==="unresolved"&&strings(issue.claim_ids)&&issue.claim_ids.length>0&&issue.claim_ids.every(c=>claimIds.has(c))&&text(issue.explanation)&&strings(issue.limitations),"unresolved issue");
      if(issue.type==="source_tension")need(issue.claim_ids.length>=2,"complete stock tension");
      for(const cid of issue.claim_ids){need(context.claims.find(c=>c.id===cid).review_status==="unresolved","issue claim status");unresolved.add(cid);}
    }
    need(new Set(context.issues.map(i=>i.id)).size===context.issues.length,"duplicate issues");
    need(same([...unresolved].sort(),context.claims.filter(c=>c.review_status==="unresolved").map(c=>c.id).sort()),"complete unresolved issues");
  }
  return value;
}

export function createEvidenceStore(request){
  if(typeof request!=="function")throw Error("Evidence requires a registered request function.");
  const entries=new Map(Object.keys(registration.consumers).map(id=>[id,{state:{status:"idle",value:null,error:""},serial:0,readers:0}]));
  const listeners=new Set();let disposed=false;
  function entry(id){if(!entries.has(id))throw Error(`Unregistered evidence consumer ${id}.`);return entries.get(id);}
  function publish(row,state){row.state=state;for(const listener of listeners)listener();}
  async function load(id){
    const row=entry(id),serial=++row.serial;publish(row,{status:"loading",value:null,error:""});
    try{
      const value=validateKnowledgeEvidence(await request(`knowledge/feature-evidence/${id}`),id);
      if(!disposed&&serial===row.serial)publish(row,{status:"ready",value,error:""});
    }catch(error){if(!disposed&&serial===row.serial)publish(row,{status:"error",value:null,error:error instanceof Error?error.message:String(error)});}
  }
  return {
    get:id=>entry(id).state,
    subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);},
    watch(id){const row=entry(id);row.readers++;if(row.state.status==="idle")void load(id);return()=>{row.readers--;if(row.readers===0&&row.state.status==="loading"){row.serial++;publish(row,{status:"idle",value:null,error:""});}};},
    refresh:load,
    dispose(){disposed=true;for(const row of entries.values())row.serial++;listeners.clear();},
  };
}

export function retainedEvidenceDesign(evaluation){
  const fail=()=>{throw Error("Saved design provenance is incompatible. Reload the retained design; do not substitute current rules.");};
  const draft=evaluation.draft,defaults=draft.bundle.defaults,ruleset=draft.bundle.manifest.ruleset_id;
  if(typeof ruleset!=="string"||ruleset.trim()==="")fail();
  const saved=evaluation.display.density_defaults;
  if(saved!==null&&(!Number.isFinite(saved.carob)||saved.carob<=0))fail();
  let geometry=null; // Historical bundles explicitly may predate this drawing overlay.
  if(Object.hasOwn(defaults,"rainfall_capture")){
    const value=defaults.rainfall_capture;
    if(value===null||typeof value!=="object"||![value.island_width,value.island_depth].every(n=>Number.isFinite(n)&&n>0))fail();
    geometry={width:value.island_width,length:value.island_depth};
  }
  return {ruleset,density:saved===null?null:saved.carob,geometry};
}
