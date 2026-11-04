import {RESEARCH_ADAPTERS,validateResearchRecord} from "./irrigationResearchState.js";
import documents from "../../scenarios/documents.json" with {type:"json"};

export const ENTITY_TYPES={programme:"Programme",funding_route:"Funding route",funding_call:"Published call",species:"Species",restoration_approach:"Restoration approach",planting_palette:"Planting palette",vegetation_series:"Vegetation series",treatment:"Treatment",strategy_need:"Strategy need",designer_rule:"Designer rule",example_activity:"Illustrative activity",irrigation_profile:"Plant irrigation profile",reservoir_system:"Reservoir system",drone_platform:"Drone platform",drone_base:"Water/power base",research_topic:"Research work package",research_scenario:"Prepared research scenario",cluster_template:"Prepared cluster template"};
export const EVIDENCE_KINDS={official_requirement:"Official requirement",official_strategy:"Strategy context",guidance:"Source guidance",project_assumption:"Project assumption",research_gap:"Evidence gap"};
export const RELATION_TYPES={programme_contains_route:["programme","funding_route"],call_context_for:["funding_call","programme"],approach_has_palette:["restoration_approach","planting_palette"],palette_starter_species:["planting_palette","species"],palette_optional_species:["planting_palette","species"],approach_treatment_guidance:["restoration_approach","treatment"],example_uses_approach:["example_activity","restoration_approach"],example_mentions_species:["example_activity","species"],example_considers_route:["example_activity","funding_route"],example_may_address_need:["example_activity","strategy_need"],irrigation_profile_for_species:["irrigation_profile","species"]};
export const EVIDENCE_ENTRY_TOPICS={selection_guidance:{"route-34":"route:LEADER-AL20-3.4"},project_concept:{"restoration-34":"example_activity:carob-mr2-demonstrator"},delivery_plan:{"novelty-34":"route:LEADER-AL20-3.4","publication-34":"route:LEADER-AL20-3.4"},designer:{mr2:"approach:mr2",carob:"species:carob"}};
const TYPE_PREFIX={programme:"programme",funding_route:"route",funding_call:"call",species:"species",restoration_approach:"approach",planting_palette:"palette",vegetation_series:"series",treatment:"treatment",strategy_need:"need",designer_rule:"rule",example_activity:"example_activity",irrigation_profile:"irrigation_profile",reservoir_system:"reservoir_system",drone_platform:"drone_platform",drone_base:"drone_base",research_topic:"research_topic",research_scenario:"research_scenario",cluster_template:"cluster_template"};
const fail=path=>{throw Error(`Knowledge Explorer is incompatible at ${path}. Check the registered knowledge, restart Python and reload the app, then retry. Your editing drafts are retained.`);};
const need=(ok,path)=>{if(!ok)fail(path);};
const object=v=>v!==null&&typeof v==="object"&&!Array.isArray(v);
const text=v=>typeof v==="string"&&v.trim()!=="";
const hash=v=>typeof v==="string"&&/^[a-f0-9]{64}$/.test(v);
const strings=v=>Array.isArray(v)&&v.every(text)&&new Set(v).size===v.length;
const canonical=v=>Array.isArray(v)?v.map(canonical):v!==null&&typeof v==="object"?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
const keys=(v,names)=>object(v)&&Object.keys(v).length===names.length&&names.every(k=>Object.hasOwn(v,k));
const date=v=>text(v)&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
function header(v,version){need(object(v)&&v.version===version&&text(v.dataset_id)&&hash(v.dataset_hash)&&date(v.reviewed_on),"dataset identity/version");need(keys(v.coverage,["mode","root_entities","excluded"])&&v.coverage.mode==="registered-pilot-only"&&strings(v.coverage.root_entities)&&v.coverage.root_entities.length>0&&strings(v.coverage.excluded)&&v.coverage.excluded.length>0,"coverage");}
function sources(refs){
  need(Array.isArray(refs),"evidence");
  for(const r of refs){
    need(keys(r,["citation_id","passage_id","document_id","page","label","role","sha256","verified_on"]),"citation fields");
    const doc=documents.documents.find(d=>d.id===r.document_id);
    need(text(r.citation_id)&&text(r.label)&&text(r.role)&&hash(r.sha256)&&date(r.verified_on)&&doc!==undefined&&doc.sha256===r.sha256&&Number.isInteger(r.page)&&r.page>=1&&r.page<=doc.pages,"citation edition/page");
    need(r.passage_id===`${r.document_id}@${r.sha256}:pdf:${r.page}`,"passage identity");
  }
  need(new Set(refs.map(r=>r.citation_id)).size===refs.length,"duplicate citation use");
}
const ADAPTERS=new Set([...Object.keys(ENTITY_TYPES).filter(t=>t!=="example_activity"),"carob_density","mr2_geometry","illustration","reference_model","route_guidance","delivery_topic","concept_template","research_guide"]);
function binding(b){need(keys(b,["id","adapter","native_id","label","aliases","value","authority","explanation"])&&[b.id,b.adapter,b.native_id,b.label,b.explanation].every(text)&&ADAPTERS.has(b.adapter)&&strings(b.aliases)&&object(b.value)&&keys(b.authority,["file","record_hash"])&&text(b.authority.file)&&hash(b.authority.record_hash),"native binding");if(RESEARCH_ADAPTERS.has(b.adapter))validateResearchRecord(b.adapter,b.value);}
function claim(c){
  need(keys(c,["id","subject_ids","statement","evidence_kind","context","review_status","reviewed_on","limitations","citation_ids","configuration_ids","review_targets","evidence","configuration_values"]),"claim fields");
  need(text(c.id)&&c.id.startsWith("claim:")&&strings(c.subject_ids)&&c.subject_ids.length>0&&text(c.statement)&&text(c.context)&&Object.hasOwn(EVIDENCE_KINDS,c.evidence_kind)&&["curated","unresolved"].includes(c.review_status)&&date(c.reviewed_on)&&strings(c.limitations)&&strings(c.citation_ids)&&strings(c.configuration_ids)&&strings(c.review_targets),"claim context/status");
  sources(c.evidence);need(same(c.citation_ids.slice().sort(),c.evidence.map(r=>r.citation_id).sort()),"claim evidence references");
  need(Array.isArray(c.configuration_values)&&c.configuration_values.every(object)&&same(c.configuration_ids.slice().sort(),c.configuration_values.map(b=>b.id).sort()),"configuration references");
  if(c.evidence_kind==="project_assumption"){
    need(c.evidence.length===0&&c.configuration_values.length>0,"assumption source");
    for(const b of c.configuration_values){
      binding(b);if(["research_scenario","cluster_template"].includes(b.adapter)){need(b.value.adoption==="prepared_not_adopted","research assumption adoption");continue;}need(b.value.basis==="project_assumption"&&text(b.value.ruleset_id)&&text(b.value.unit),"assumption provenance");
      if(b.adapter==="carob_density")need(Number.isFinite(b.value.value)&&b.value.value>0&&b.value.unit==="plants_per_hectare","density reference");
      else if(b.adapter==="mr2_geometry"){
        const v=b.value.value;need(object(v)&&object(v.rainfall_capture)&&[v.rainfall_capture.island_width,v.rainfall_capture.island_depth].every(n=>Number.isFinite(n)&&n>0)&&Array.isArray(v.mr2_centres)&&v.mr2_centres.length>0&&v.mr2_centres.every(pair=>Array.isArray(pair)&&pair.length===2&&pair.every(n=>Number.isFinite(n)&&n>=0&&n<=1)),"geometry reference");
      }else fail("assumption adapter");
    }
  }else need(c.evidence.length>0&&c.configuration_values.length===0,"source claim");
  if(c.evidence_kind==="research_gap")need(c.review_status==="unresolved","gap review");
}
function entity(e){
  need(keys(e,["id","type","native_id","binding_id","aliases","availability","citation_ids","limitations","label"])&&text(e.id)&&text(e.native_id)&&text(e.binding_id)&&text(e.label)&&Object.hasOwn(ENTITY_TYPES,e.type)&&strings(e.aliases)&&strings(e.citation_ids)&&strings(e.limitations),"entity");
  need(e.id===`${TYPE_PREFIX[e.type]}:${e.native_id}`,"typed entity identity");
  need(e.availability===(["programme","funding_route","funding_call"].includes(e.type)?"not_assessed":"not_applicable"),"availability");
}
function relation(r){need(keys(r,["id","type","source","target","claim_ids","citation_ids","basis","context","limitations"])&&text(r.id)&&Object.hasOwn(RELATION_TYPES,r.type)&&text(r.source)&&text(r.target)&&strings(r.claim_ids)&&strings(r.citation_ids)&&text(r.context)&&strings(r.limitations),"relationship");need(r.basis===(r.type.startsWith("example_")||["palette_starter_species","palette_optional_species"].includes(r.type)?"project_assumption":"source_reference"),"relationship basis");}
function issue(i){need(keys(i,["id","type","claim_ids","status","explanation","limitations","claims"])&&text(i.id)&&["source_tension","evidence_gap"].includes(i.type)&&i.status==="unresolved"&&strings(i.claim_ids)&&i.claim_ids.length>0&&text(i.explanation)&&strings(i.limitations)&&Array.isArray(i.claims),"issue");need(same(i.claim_ids.slice().sort(),i.claims.map(c=>c.id).sort()),"complete issue claims");if(i.type==="source_tension")need(i.claim_ids.length>=2,"source tension");i.claims.forEach(claim);need(i.claims.every(c=>c.review_status==="unresolved"),"unresolved claims");}

export function validateExplorerGraph(v){
  header(v,1);need(keys(v,["version","dataset_id","dataset_hash","reviewed_on","coverage","consumer_registry_hash","nodes","edges","issues","entity_types","relation_types"])&&hash(v.consumer_registry_hash),"graph fields");
  need(same(v.entity_types,TYPE_PREFIX)&&keys(v.relation_types,Object.keys(RELATION_TYPES))&&Object.values(v.relation_types).every(text),"registered types");
  need(Array.isArray(v.nodes)&&v.nodes.length>0&&Array.isArray(v.edges)&&Array.isArray(v.issues),"graph collections");
  const nodes=new Map(),edges=new Set(),citations=new Map();
  for(const n of v.nodes){need(keys(n,["id","kind","label","details"])&&text(n.id)&&text(n.label)&&["entity","claim","passage"].includes(n.kind)&&object(n.details)&&!nodes.has(n.id),"graph node");nodes.set(n.id,n);}
  for(const n of v.nodes){
    const d=n.details;
    if(n.kind==="entity"){
      need(keys(d,["entity","authority","evidence","claims","relations","issues"]),"entity details");entity(d.entity);binding(d.authority);sources(d.evidence);
      need(n.id===d.entity.id&&n.label===d.entity.label&&d.authority.id===d.entity.binding_id&&d.authority.native_id===d.entity.native_id,"native identity");
      need(same(d.entity.citation_ids.slice().sort(),d.evidence.map(r=>r.citation_id).sort())&&Array.isArray(d.claims)&&Array.isArray(d.relations)&&Array.isArray(d.issues),"entity references");
      d.claims.forEach(claim);d.relations.forEach(relation);d.issues.forEach(issue);
      for(const c of d.claims)need(nodes.has(c.id)&&nodes.get(c.id).kind==="claim"&&same(nodes.get(c.id).details,c),"entity claim projection");
      if(d.entity.type==="example_activity")need(text(d.authority.value.description),"illustration");
    }else if(n.kind==="claim"){
      claim(d);need(n.id===d.id&&n.label===d.statement&&d.subject_ids.every(id=>nodes.has(id)&&nodes.get(id).kind==="entity")&&d.reviewed_on<=v.reviewed_on,"claim subjects/identity");
    }else{
      need(keys(d,["document","passage_id","page","page_basis","citation_uses"])&&object(d.document),"passage details");
      const doc=d.document,registered=documents.documents.find(r=>r.id===doc.id);
      need(keys(doc,["id","title","filename","pages","sha256","aliases","printed_pages","mapping_note"])&&registered!==undefined&&same(doc,registered)&&text(doc.title)&&text(doc.mapping_note)&&strings(doc.aliases)&&object(doc.printed_pages),"document registration");
      need(d.passage_id===n.id&&d.page_basis==="pdf"&&Number.isInteger(d.page)&&d.page>=1&&d.page<=doc.pages&&n.id===`${doc.id}@${doc.sha256}:pdf:${d.page}`,"registered passage");sources(d.citation_uses);need(d.citation_uses.length>0&&d.citation_uses.every(r=>r.passage_id===n.id),"passage citation uses");
      for(const r of d.citation_uses){need(!citations.has(r.citation_id),"citation identity");citations.set(r.citation_id,r);}
    }
  }
  const checkRefs=refs=>{for(const r of refs)need(citations.has(r.citation_id)&&same(citations.get(r.citation_id),r),"citation projection");};
  const expected=new Set();
  for(const n of v.nodes){
    if(n.kind==="passage")continue;
    const d=n.details,refs=n.kind==="claim"?d.evidence:d.evidence;checkRefs(refs);
    if(n.kind==="claim")for(const eid of d.subject_ids)expected.add(JSON.stringify(["claim_subject",n.id,eid]));
    for(const pid of new Set(refs.map(r=>r.passage_id)))expected.add(JSON.stringify([n.kind==="claim"?"claim_cites":"entity_cites",n.id,pid]));
  }
  const seen=new Set();
  for(const e of v.edges){
    need(keys(e,["id","kind","source","target","label","details"])&&text(e.id)&&text(e.label)&&!edges.has(e.id)&&!nodes.has(e.id)&&nodes.has(e.source)&&nodes.has(e.target)&&object(e.details),"edge identity/endpoints");edges.add(e.id);
    const a=nodes.get(e.source),b=nodes.get(e.target);
    if(e.kind==="relationship"){
      need(keys(e.details,["id","type","source","target","claim_ids","citation_ids","basis","context","limitations","evidence"]),"relationship detail fields");
      const {evidence,...r}=e.details;relation(r);sources(evidence);checkRefs(evidence);
      need(a.kind==="entity"&&b.kind==="entity"&&same([a.details.entity.type,b.details.entity.type],RELATION_TYPES[r.type])&&r.source===e.source&&r.target===e.target&&r.id===e.id&&e.label===v.relation_types[r.type],"typed relationship endpoints");
      need(r.claim_ids.every(id=>nodes.has(id)&&nodes.get(id).kind==="claim")&&same(r.citation_ids.slice().sort(),evidence.map(r=>r.citation_id).sort()),"relationship references");
    }else{
      need(["claim_subject","claim_cites","entity_cites"].includes(e.kind)&&keys(e.details,["evidence"]),"derived edge kind");sources(e.details.evidence);checkRefs(e.details.evidence);
      const key=JSON.stringify([e.kind,e.source,e.target]);need(expected.has(key)&&!seen.has(key),"derived connection");seen.add(key);
      const refs=e.kind==="claim_subject"?[]:a.details.evidence.filter(r=>r.passage_id===b.id);
      need(e.label===(e.kind==="claim_subject"?"about":"cites")&&same(refs.map(r=>r.citation_id).sort(),e.details.evidence.map(r=>r.citation_id).sort()),"derived provenance");
    }
  }
  need(seen.size===expected.size,"complete derived connections");
  for(const n of v.nodes.filter(n=>n.kind==="entity"))for(const r of n.details.relations)need(v.edges.some(e=>e.id===r.id&&e.kind==="relationship"&&same(Object.fromEntries(Object.entries(e.details).filter(([k])=>k!=="evidence")),r)),"registered relationship projection");
  v.issues.forEach(issue);need(new Set(v.issues.map(i=>i.id)).size===v.issues.length,"duplicate issue");
  const unresolved=new Set();for(const i of v.issues)for(const c of i.claims){need(nodes.has(c.id)&&same(nodes.get(c.id).details,c),"issue projection");unresolved.add(c.id);}
  need(same([...unresolved].sort(),v.nodes.filter(n=>n.kind==="claim"&&n.details.review_status==="unresolved").map(n=>n.id).sort()),"complete unresolved issues");
  for(const n of v.nodes.filter(n=>n.kind==="entity")){
    const claims=v.nodes.filter(c=>c.kind==="claim"&&c.details.subject_ids.includes(n.id));
    need(same(claims.map(c=>c.id).sort(),n.details.claims.map(c=>c.id).sort()),"complete entity claims");
    need(same(v.edges.filter(e=>e.kind==="relationship"&&[e.source,e.target].includes(n.id)).map(e=>e.id).sort(),n.details.relations.map(r=>r.id).sort()),"complete entity relationships");
    need(same(v.issues.filter(i=>i.claims.some(c=>c.subject_ids.includes(n.id))),n.details.issues),"complete entity issues");
  }
  need(v.coverage.root_entities.every(id=>nodes.has(id)&&nodes.get(id).kind==="entity"),"coverage roots");return v;
}
export function validateExplorerSearch(v){header(v,1);need(keys(v,["version","dataset_id","dataset_hash","reviewed_on","coverage","matches","ambiguous"])&&Array.isArray(v.matches)&&typeof v.ambiguous==="boolean"&&v.ambiguous===(v.matches.length>1),"search response");v.matches.forEach(entity);need(new Set(v.matches.map(e=>e.id)).size===v.matches.length,"duplicate search identity");return v;}
export function validateExplorerImpact(v){
  header(v,2);need(keys(v,["version","dataset_id","dataset_hash","reviewed_on","coverage","consumer_registry_hash","target","claim_ids","entity_ids","relation_ids","validation_dependencies","review_targets","feature_dependencies"])&&hash(v.consumer_registry_hash)&&keys(v.target,["kind","id"])&&["claim","passage"].includes(v.target.kind)&&text(v.target.id),"impact response");
  for(const name of ["claim_ids","entity_ids","relation_ids"])need(strings(v[name]),"impact identities");
  for(const name of ["validation_dependencies","review_targets","feature_dependencies"])need(Array.isArray(v[name]),"impact dependencies");
  for(const d of v.validation_dependencies)need(keys(d,["consumer_id","citation_ids","effect","file","explanation"])&&["selection_guidance","project_concept","delivery_plan","knowledge_pilot"].includes(d.consumer_id)&&strings(d.citation_ids)&&d.effect==="citation_validation_dependency"&&text(d.file)&&text(d.explanation),"validation dependency");
  for(const d of [...v.review_targets,...v.feature_dependencies]){need(object(d)&&text(d.explanation)&&Array.isArray(d.path)&&d.path.length>0&&d.path.every(p=>keys(p,["kind","id"])&&text(p.kind)&&text(p.id)),"impact path");}
  for(const d of v.review_targets){need(keys(d,["claim_id","binding_id","effect","path","target","explanation"])&&text(d.claim_id)&&text(d.binding_id)&&d.effect==="review_required","manual review target");binding(d.target);}
  for(const d of v.feature_dependencies)need(keys(d,["consumer_id","context_id","binding_id","effect","path","explanation"])&&Object.hasOwn(EVIDENCE_ENTRY_TOPICS,d.consumer_id)&&Object.hasOwn(EVIDENCE_ENTRY_TOPICS[d.consumer_id],d.context_id)&&text(d.binding_id)&&d.effect==="shared_evidence_dependency","display dependency");return v;
}
export function assertSameSnapshot(snapshot,response,impact=false){
  if(snapshot.dataset_id!==response.dataset_id||snapshot.dataset_hash!==response.dataset_hash||(impact&&snapshot.consumer_registry_hash!==response.consumer_registry_hash))throw Error("Knowledge changed while this view was open. Refresh the explorer before searching or inspecting usage again; different editions were not combined.");
  if(!impact){for(const e of response.matches)need(snapshot.nodes.some(n=>n.kind==="entity"&&n.id===e.id&&same(n.details.entity,e)),"search returned an unknown or changed topic; refresh explorer");}
  else{
    const exists=(kind,id)=>kind==="relation"?snapshot.edges.some(e=>e.kind==="relationship"&&e.id===id):snapshot.nodes.some(n=>n.kind===kind&&n.id===id);
    need(exists(response.target.kind,response.target.id),"usage target");
    for(const [field,kind] of [["claim_ids","claim"],["entity_ids","entity"],["relation_ids","relation"]])need(response[field].every(id=>exists(kind,id)),"usage identities");
    for(const d of [...response.review_targets,...response.feature_dependencies]){
      need(same(d.path[0],response.target),"usage path origin");
      for(const p of d.path.slice(0,-1))need(exists(p.kind,p.id),"usage path reference");
      const end=d.path.at(-1);need(d.effect==="review_required"?end.kind==="review_target"&&end.id===d.binding_id&&d.target.id===d.binding_id:end.kind==="feature_context"&&end.id===`${d.consumer_id}/${d.context_id}`,"usage path destination");
    }
  }
}
export function initialExplorerView(){return {root:null,selected:null,expanded:[],category:"all",status:"all",relationTypes:Object.keys(RELATION_TYPES),layout:"lanes",mode:"auto"};}
export function visibleExplorerGraph(graph,view){
  const allowed=new Set(graph.nodes.filter(n=>n.kind!=="claim"||(view.category==="all"||n.details.evidence_kind===view.category)&&(view.status==="all"||n.details.review_status===view.status)).map(n=>n.id));
  if(view.root===null)return {nodes:[],edges:[],filtered:graph.nodes.length-allowed.size,hidden:allowed.size};
  need(graph.nodes.some(n=>n.id===view.root&&n.kind==="entity"),"requested topic is unavailable; choose a topic or reset the view");
  need(view.expanded.every(id=>graph.nodes.some(n=>n.id===id)),"an expanded record is unavailable; choose a topic or reset the view");
  const edges=graph.edges.filter(e=>(e.kind!=="relationship"||view.relationTypes.includes(e.details.type))&&allowed.has(e.source)&&allowed.has(e.target));
  const visible=new Set([view.root]),done=new Set(),queue=[view.root],expanded=new Set(view.expanded);
  while(queue.length){const id=queue.shift();if(done.has(id))continue;done.add(id);for(const e of edges){if(e.source!==id&&e.target!==id)continue;const other=e.source===id?e.target:e.source;visible.add(other);if(expanded.has(other)||(id===view.root&&expanded.has(view.root)))queue.push(other);}}
  return {nodes:graph.nodes.filter(n=>visible.has(n.id)),edges:edges.filter(e=>visible.has(e.source)&&visible.has(e.target)),filtered:graph.nodes.length-allowed.size,hidden:allowed.size-visible.size};
}
export function explorerLayout(graph,root,mode){
  need(["lanes","network"].includes(mode)&&graph.nodes.some(n=>n.id===root&&n.kind==="entity"),"layout/root");const distance=new Map([[root,0]]),queue=[root];
  while(queue.length){const id=queue.shift();for(const e of graph.edges){if(e.source!==id&&e.target!==id)continue;const other=e.source===id?e.target:e.source;if(!distance.has(other)){distance.set(other,distance.get(id)+1);queue.push(other);}}}
  const sorted=graph.nodes.slice().sort((a,b)=>(distance.has(a.id)?distance.get(a.id):Infinity)-(distance.has(b.id)?distance.get(b.id):Infinity)||a.kind.localeCompare(b.kind)||a.id.localeCompare(b.id));
  const positions={};let width=1240,height=200;
  if(mode==="lanes"){
    const rows={entity:0,claim:0,passage:0},columns={entity:180,claim:540,passage:900};
    for(const n of sorted){positions[n.id]={x:columns[n.kind],y:64+rows[n.kind]++*140};height=Math.max(height,positions[n.id].y+160);}
  }else{
    const rings=new Map();for(const n of sorted){const ring=distance.has(n.id)?distance.get(n.id):graph.nodes.length; if(!rings.has(ring))rings.set(ring,[]);rings.get(ring).push(n);}
    let radius=0;
    for(const [index,rows] of [...rings].sort((a,b)=>a[0]-b[0])){
      if(index===0){positions[root]={x:-110,y:-52};continue;}
      radius=Math.max(radius+300,rows.length>1?290/(2*Math.sin(Math.PI/rows.length)):300);
      rows.forEach((n,i)=>{const angle=-Math.PI/2+2*Math.PI*i/rows.length;positions[n.id]={x:radius*Math.cos(angle)-110,y:radius*Math.sin(angle)-52};});
    }
    const minX=Math.min(...Object.values(positions).map(p=>p.x))-100,minY=Math.min(...Object.values(positions).map(p=>p.y))-80;
    for(const p of Object.values(positions)){p.x-=minX;p.y-=minY;}
    width=Math.max(...Object.values(positions).map(p=>p.x))+320;height=Math.max(...Object.values(positions).map(p=>p.y))+180;
  }
  return {positions,width,height,nodeWidth:220,nodeHeight:104};
}

export function revealExplorerRecord(graph,view,id){
  const edge=graph.edges.find(e=>e.id===id),targets=edge?[edge.source,edge.target]:[id],expanded=new Set(view.expanded);
  need(targets.every(id=>graph.nodes.some(n=>n.id===id)),"requested record");
  const parent=new Map([[view.root,null]]),queue=[view.root];
  while(queue.length){const current=queue.shift();for(const e of graph.edges){if(e.source!==current&&e.target!==current)continue;const other=e.source===current?e.target:e.source;if(!parent.has(other)){parent.set(other,current);queue.push(other);}}}
  for(const target of targets){let current=target;while(parent.has(current)&&parent.get(current)!==null){current=parent.get(current);if(current!==view.root)expanded.add(current);}}
  return {...view,selected:id,expanded:[...expanded]};
}

// Label buttons have their own collision boxes; overlapping native controls
// would make a connection impossible to select even when nodes are spaced.
export function explorerEdgeLabels(layout,edges){
  const occupied=Object.values(layout.positions).map(p=>({x:p.x-4,y:p.y-4,w:228,h:112})),labels={};
  const overlaps=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
  for(const e of edges.slice().sort((a,b)=>a.id.localeCompare(b.id))){
    const a=layout.positions[e.source],b=layout.positions[e.target],mid={x:(a.x+b.x)/2+47,y:(a.y+b.y)/2+35};let chosen=null;
    const xs=new Set([mid.x,0,layout.width-126]),ys=new Set([mid.y,0,layout.height-34]);
    for(const p of occupied){xs.add(p.x-130);xs.add(p.x+p.w+4);ys.add(p.y-38);ys.add(p.y+p.h+4);}
    // Each fixed-x row has the same sorted y order. Merge those rows by the
    // original distance/x/y ordering instead of materialising and sorting the
    // entire Cartesian grid (which grows with every placed label).
    const orderedY=[...ys].filter(y=>y>=0&&y+34<=layout.height).sort((a,b)=>Math.abs(a-mid.y)-Math.abs(b-mid.y)||a-b),heap=[];
    const compare=(a,b)=>a.cost-b.cost||a.x-b.x||orderedY[a.index]-orderedY[b.index];
    function push(entry){let i=heap.length;heap.push(entry);while(i>0){const parent=(i-1)>>1;if(compare(heap[parent],entry)<=0)break;heap[i]=heap[parent];i=parent;}heap[i]=entry;}
    function pop(){const first=heap[0],last=heap.pop();if(heap.length>0){let i=0;while(2*i+1<heap.length){let child=2*i+1;if(child+1<heap.length&&compare(heap[child+1],heap[child])<0)child++;if(compare(last,heap[child])<=0)break;heap[i]=heap[child];i=child;}heap[i]=last;}return first;}
    if(orderedY.length>0)for(const x of xs)if(x>=0&&x+126<=layout.width)push({x,index:0,cost:Math.abs(x-mid.x)+Math.abs(orderedY[0]-mid.y)});
    chosen=undefined;
    while(heap.length>0){
      const entry=pop(),y=orderedY[entry.index],box={x:entry.x,y,w:126,h:34};
      if(!occupied.some(p=>overlaps(box,p))){chosen=box;break;}
      const index=entry.index+1;if(index<orderedY.length)push({x:entry.x,index,cost:Math.abs(entry.x-mid.x)+Math.abs(orderedY[index]-mid.y)});
    }
    need(chosen!==undefined,'connection label layout');labels[e.id]={x:chosen.x,y:chosen.y};occupied.push(chosen);
  }
  return labels;
}

export function createExplorerResource(request,validate){
  let state={status:"idle",value:null,error:""},serial=0,disposed=false;const listeners=new Set();
  const publish=next=>{state=next;for(const listener of listeners)listener();};
  return {
    get:()=>state,
    subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);},
    async load(path,snapshot=null,impact=false){
      const token=++serial;publish({status:"loading",value:null,error:""});
      try{const value=validate(await request(path));if(snapshot!==null)assertSameSnapshot(snapshot,value,impact);if(impact){const params=new URLSearchParams(path.split("?")[1]);need(value.target.kind===params.get("target_kind")&&value.target.id===params.get("target_id"),"usage returned a different requested target");}if(!disposed&&token===serial)publish({status:"ready",value,error:""});}
      catch(error){if(!disposed&&token===serial)publish({status:"error",value:null,error:error instanceof Error?error.message:String(error)});}
    },
    cancel(){serial++;publish({status:"idle",value:null,error:""});},
    dispose(){disposed=true;serial++;listeners.clear();},
  };
}
