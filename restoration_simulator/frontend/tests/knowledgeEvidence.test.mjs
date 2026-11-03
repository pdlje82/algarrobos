import test from "node:test";
import assert from "node:assert/strict";
import pilot from "../../knowledge/connected-pilot-v1.json" with {type:"json"};
import registration from "../../knowledge/feature-consumers-v1.json" with {type:"json"};
import defaults from "../../design_rules/defaults.json" with {type:"json"};
import manifest from "../../design_rules/manifest.json" with {type:"json"};
import {createEvidenceStore,validateKnowledgeEvidence,retainedEvidenceDesign} from "../src/knowledgeEvidenceState.js";
import {validateResponse} from "../src/contracts.js";

// Wire fixtures use the repository's source identities, not another claim library.
function fixture(consumer){
  const evidence=ids=>ids.slice().sort().map(id=>({citation_id:id,passage_id:`${pilot.sources[id].document_id}@${pilot.sources[id].sha256}:pdf:${pilot.sources[id].page}`,...structuredClone(pilot.sources[id])}));
  const binding=id=>{
    const b=pilot.bindings[id];let value={};
    if(b.adapter==="illustration")value={label:b.label,aliases:b.aliases,description:b.description};
    if(b.adapter==="carob_density")value={basis:"project_assumption",unit:"plants_per_hectare",ruleset_id:manifest.ruleset_id,value:defaults.density_defaults.carob};
    if(b.adapter==="mr2_geometry")value={basis:"project_assumption",unit:"configured fractions and metres",ruleset_id:manifest.ruleset_id,value:{mr2_centres:defaults.mr2_centres,rainfall_capture:defaults.rainfall_capture}};
    return {id,adapter:b.adapter,native_id:b.native_id,label:`Fixture ${b.native_id}`,aliases:[],value:structuredClone(value),authority:{file:"fixture authority",record_hash:"a".repeat(64)},explanation:b.explanation};
  };
  const contexts={};
  for(const [id,row] of Object.entries(registration.consumers[consumer].contexts))contexts[id]={
    binding:binding(row.binding_id),
    claims:row.claim_ids.map(id=>({id,...structuredClone(pilot.claims[id]),evidence:evidence(pilot.claims[id].citation_ids),configuration_values:pilot.claims[id].configuration_ids.slice().sort().map(binding)})),
    entities:row.entity_ids.map(id=>({id,...structuredClone(pilot.entities[id]),label:`Fixture ${id}`,authority:binding(pilot.entities[id].binding_id),evidence:evidence(pilot.entities[id].citation_ids)})),
    relations:row.relation_ids.map(id=>({id,...structuredClone(pilot.relations[id]),evidence:evidence(pilot.relations[id].citation_ids)})),
    issues:Object.entries(pilot.issues).filter(([,issue])=>issue.claim_ids.some(id=>row.claim_ids.includes(id))).map(([id,issue])=>({id,...structuredClone(issue)})),
  };
  return {version:1,dataset_id:pilot.id,dataset_hash:"b".repeat(64),reviewed_on:pilot.reviewed_on,coverage:structuredClone(pilot.coverage),consumer_id:consumer,consumer_registry_hash:"c".repeat(64),context_order:registration.consumers[consumer].context_order.slice(),contexts};
}
const settle=()=>new Promise(resolve=>setImmediate(resolve));

test("saved provenance comes only from the retained bundle, including historical unknowns",()=>{
  const evaluation={draft:{bundle:{manifest:{ruleset_id:"retained-fixture"},defaults:{rainfall_capture:{island_width:3,island_depth:4}}}},display:{density_defaults:{carob:175}}};
  const before=structuredClone(evaluation);
  assert.deepEqual(retainedEvidenceDesign(evaluation),{ruleset:"retained-fixture",density:175,geometry:{width:3,length:4}});
  assert.deepEqual(evaluation,before);
  delete evaluation.draft.bundle.defaults.rainfall_capture;evaluation.display.density_defaults=null;
  assert.deepEqual(retainedEvidenceDesign(evaluation),{ruleset:"retained-fixture",density:null,geometry:null});
  evaluation.display.density_defaults={carob:undefined};assert.throws(()=>retainedEvidenceDesign(evaluation),/Saved design provenance/);
});

test("all six contexts validate through the central contract without mutating data",()=>{
  let count=0;const claims=new Set();
  for(const consumer of Object.keys(registration.consumers)){
    const value=fixture(consumer),before=structuredClone(value);
    assert.equal(validateResponse(`knowledge/feature-evidence/${consumer}`,value),value);
    assert.deepEqual(value,before);
    for(const context of Object.values(value.contexts)){count++;context.claims.forEach(c=>claims.add(c.id));}
  }
  assert.equal(count,6);assert.equal(claims.size,12);
});
test("unsupported responses, wrong contexts, broken sources and incomplete issues fail visibly",()=>{
  const changes=[v=>{v.version=2;},v=>{delete v.coverage;},v=>{v.extra=true;},v=>{v.consumer_id="delivery_plan";},v=>{v.context_order.reverse();},v=>{delete v.contexts.carob;},
    v=>{v.contexts.mr2.claims.reverse();},v=>{v.contexts.mr2.entities[0].availability="open";},v=>{v.contexts.mr2.relations[0].target="missing";},
    v=>{v.contexts.mr2.claims[0].evidence[0].sha256="0".repeat(64);},v=>{v.contexts.mr2.claims[0].evidence[0].page=9999;},v=>{v.contexts.mr2.issues=[];},
    v=>{v.contexts.mr2.issues[0].preferred="small stock";},v=>{v.contexts.mr2.claims.find(c=>c.evidence_kind==="project_assumption").configuration_values=[null];},
    v=>{v.contexts.mr2.claims.find(c=>c.evidence_kind==="project_assumption").configuration_values[0].value.value.rainfall_capture.island_depth=null;}];
  for(const change of changes){const value=fixture("designer");change(value);assert.throws(()=>validateKnowledgeEvidence(value,"designer"),/Current evidence is incompatible/);}
  assert.throws(()=>validateKnowledgeEvidence(fixture("designer"),"unknown"),/consumer registration/);
});
test("assumptions and source tensions remain distinct, with no preferred stock value",()=>{
  const context=validateKnowledgeEvidence(fixture("designer"),"designer").contexts.mr2;
  const stocks=context.claims.filter(c=>c.id.startsWith("claim:mr2-stock-"));
  assert.deepEqual(stocks.map(c=>c.evidence[0].page),[133,134]);
  assert(stocks.every(c=>c.review_status==="unresolved"));
  assert(context.issues.every(i=>!Object.hasOwn(i,"preferred")));
  const assumption=context.claims.find(c=>c.evidence_kind==="project_assumption");
  assert.deepEqual(assumption.evidence,[]);assert.equal(assumption.configuration_values[0].value.ruleset_id,manifest.ruleset_id);
});
test("opening is lazy, shares one request per consumer, and closing abandons pending results",async()=>{
  const calls=[];let complete;const store=createEvidenceStore(path=>{calls.push(path);return new Promise(resolve=>{complete=resolve;});});
  assert.equal(calls.length,0);
  const closeFirst=store.watch("delivery_plan"),closeSecond=store.watch("delivery_plan");
  assert.equal(calls.length,1);closeFirst();assert.equal(store.get("delivery_plan").status,"loading");
  closeSecond();assert.equal(store.get("delivery_plan").status,"idle");
  complete(fixture("delivery_plan"));await settle();assert.equal(store.get("delivery_plan").status,"idle");store.dispose();
});
test("refresh clears old evidence, errors remain explicit, and retry preserves unrelated drafts",async()=>{
  const draft={notes:"Unsaved concept",density:"175"},before=structuredClone(draft);let fail=false;
  const store=createEvidenceStore(async()=>{if(fail)throw Error("fixture evidence unavailable");return fixture("designer");});
  const close=store.watch("designer");await settle();assert.equal(store.get("designer").status,"ready");
  fail=true;const request=store.refresh("designer");assert.equal(store.get("designer").value,null);await request;
  assert.equal(store.get("designer").status,"error");assert.match(store.get("designer").error,/fixture evidence unavailable/);
  fail=false;await store.refresh("designer");assert.equal(store.get("designer").status,"ready");assert.deepEqual(draft,before);close();store.dispose();
});
test("late responses and disposed sessions cannot replace newer results",async()=>{
  const pending=[];const store=createEvidenceStore(()=>new Promise(resolve=>pending.push(resolve)));
  const close=store.watch("designer");const refreshed=store.refresh("designer");
  const newer=fixture("designer");newer.dataset_hash="d".repeat(64);pending[1](newer);await refreshed;
  pending[0](fixture("designer"));await settle();assert.equal(store.get("designer").value.dataset_hash,newer.dataset_hash);
  const abandoned=store.refresh("designer");store.dispose();pending[2](fixture("designer"));await abandoned;assert.equal(store.get("designer").value,null);close();
});
test("malformed successful HTTP data becomes a pane error and may be retried",async()=>{
  let bad=true;const store=createEvidenceStore(async()=>bad?{version:77}:fixture("selection_guidance"));
  const close=store.watch("selection_guidance");await settle();assert.equal(store.get("selection_guidance").status,"error");
  assert.match(store.get("selection_guidance").error,/incompatible/);bad=false;await store.refresh("selection_guidance");assert.equal(store.get("selection_guidance").status,"ready");close();store.dispose();
  assert.throws(()=>store.get("missing"),/Unregistered/);
});
