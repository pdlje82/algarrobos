import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {validateStatisticsResponse} from "../src/fundingStatisticsState.js";
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
  const assessment={criteria:{"AT.3":{answers:{a:true,b:false},notes:"original"},"RD.5":{answers:{a:true},notes:"business"}},location_lookup:{version:1,automated:["AT.3","RD.5"],settings:{municipality:"Almócita"}}};
  const draft={version:4,bundle:{selection:{routes:{r:"line3",other:"line3"},profiles:{line3:{}}}},selection_assessments:{r:assessment,other:structuredClone(assessment)}};
  const notes=editSelectionRow(draft,"r","AT.3",{...assessment.criteria["AT.3"],notes:"Updated evidence"});assert.deepEqual(notes.selection_assessments.r.location_lookup,assessment.location_lookup);
  const manual=editSelectionRow(draft,"r","AT.3",{...assessment.criteria["AT.3"],answers:{a:false,b:true}});
  assert.deepEqual(manual.selection_assessments.r.location_lookup.automated,["RD.5"]);
  assert.equal(manual.selection_assessments.other,draft.selection_assessments.other);
  assert.match(selectionSummary({subtotal:25,total:null,unresolved:12,location_basis:{status:"provisional"}}),/provisional location data/);
});
