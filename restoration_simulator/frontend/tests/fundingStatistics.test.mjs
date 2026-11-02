import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {validateStatisticsResponse,validateLocationMetadata,detachLocationCriterion,initialLocationSettings} from "../src/fundingStatisticsState.js";
import {editSelectionRow,selectionSummary} from "../src/fundingSelectionState.js";
import {validateResponse} from "../src/contracts.js";

const dataset=JSON.parse(await readFile(new URL("../../scenarios/funding-al20-statistics-v1.json",import.meta.url),"utf8"));
test("lookup contract exposes configuration gaps and unsupported versions",()=>{
  const value={version:1,dataset_hash:"a".repeat(64),dataset};assert.equal(validateStatisticsResponse(value),value);
  assert.equal(validateResponse("funding/statistics",value),value);
  for(const change of [v=>{delete v.dataset.defaults;},v=>{delete v.dataset.benchmarks.businesses_zrl_mean;},v=>{v.version=2;},v=>{v.dataset.municipalities[0].population=null;},v=>{v.dataset.municipalities.pop();}]){
    const bad=structuredClone(value);change(bad);assert.throws(()=>validateStatisticsResponse(bad),/Incompatible/);
  }
});
test("manual overrides detach only that criterion; notes keep location settings and route isolation",()=>{
  const assessment={criteria:{"AT.3":{answers:{"AT.3.1":true,"AT.3.2":false},notes:"original"},"RD.5":{answers:{"RD.5.1":true},notes:"business"}},location_lookup:{version:1,dataset_id:dataset.id,dataset_hash:"a".repeat(64),automated:["AT.3","RD.5"],settings:{...dataset.defaults,municipality:"Almócita",population_mode:"municipality_proxy"}}};
  const draft={version:4,bundle:{selection:{routes:{r:"line3",other:"line3"},profiles:{line3:{}}}},selection_assessments:{r:assessment,other:structuredClone(assessment)}};
  const notes=editSelectionRow(draft,"r","AT.3",{...assessment.criteria["AT.3"],notes:"Updated evidence"});assert.deepEqual(notes.selection_assessments.r.location_lookup,assessment.location_lookup);
  const manual=editSelectionRow(draft,"r","AT.3",{...assessment.criteria["AT.3"],answers:{"AT.3.1":false,"AT.3.2":true}});
  assert.deepEqual(manual.selection_assessments.r.location_lookup.automated,["RD.5"]);
  assert.equal(manual.selection_assessments.r.location_lookup.version,2);
  assert.equal(manual.selection_assessments.r.location_lookup.items["AT.3"].before_answers,null);
  assert.equal(manual.selection_assessments.r.location_lookup.items["AT.3"].settings.population_mode,"municipality_proxy");
  assert.equal(manual.selection_assessments.r.location_lookup.items["RD.5"].settings.population_mode,"unconfirmed");
  assert.equal(manual.selection_assessments.other,draft.selection_assessments.other);
  assert.match(selectionSummary({subtotal:25,total:null,unresolved:12,location_basis:{status:"provisional"}}),/provisional location data/);
});

test("per-criterion histories retain independent inputs and reject malformed records",()=>{
 const old={version:1,dataset_id:dataset.id,dataset_hash:"a".repeat(64),automated:["AT.3","RD.5"],settings:{...dataset.defaults,municipality:"Almócita",population_mode:"municipality_proxy"}};
 const a=detachLocationCriterion({location_lookup:old},"RD.5");
 a.location_lookup.items["RD.5"].settings.municipality="Alhama de Almería";
 assert.equal(initialLocationSettings(dataset,a,"AT.3",null).municipality,"Almócita");
 assert.equal(initialLocationSettings(dataset,a,"RD.5",null).municipality,"Alhama de Almería");
 assert.deepEqual(initialLocationSettings(dataset,{criteria:{}},"RD.5","Unknown"),dataset.defaults);
 assert.equal(validateLocationMetadata(a.location_lookup),a.location_lookup);
 for(const mutate of [v=>v.version=3,v=>delete v.items["AT.3"],v=>v.items["RD.5"].before_answers={wrong:true},v=>delete v.items["RD.5"].settings.population]){
  const b=structuredClone(a.location_lookup);mutate(b);assert.throws(()=>validateLocationMetadata(b),/Incompatible/);
 }
});
