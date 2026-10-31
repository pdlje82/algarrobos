import {test} from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {validateEdlResponse,editEdlEvidence,edlBindingItems,edlSearch} from "../src/fundingEdlState.js";
import {validateResponse} from "../src/contracts.js";
const library=JSON.parse(await readFile(new URL("../../scenarios/funding-edl-v1.json",import.meta.url),"utf8"));
const value={version:1,library_hash:"a".repeat(64),library};
test("EDL content has explicit missing designations and rejects malformed response contracts",()=>{
  assert.equal(validateResponse("funding/edl",value),value);
  assert.deepEqual(edlBindingItems(value,"IN.1.1"),[]);
  assert.equal(edlBindingItems(value,"IN.1.2").length,5);assert.equal(edlBindingItems(value,"IN.1.3").length,12);
  for(const change of [v=>delete v.library.source,v=>delete v.library.topics,v=>v.library.items[0].page=545,v=>v.library.topics[0].item_ids.push("missing"),v=>v.version=2]){const bad=structuredClone(value);change(bad);assert.throws(()=>validateEdlResponse(bad),/Incompatible/);}
  assert.equal(edlSearch("CoHOUSING SÉNIOR"),"cohousing senior");
});
test("selecting EDL references preserves scoring answers, notes and other references",()=>{
  const row={answers:{"IN.1.1":false,"IN.1.2":null,"IN.1.3":null},inputs:{},notes:"Keep my explanation",reference:"My evidence"};
  const next=editEdlEvidence(row,value,"IN.1.2","IN-T1",true),more=editEdlEvidence(next,value,"IN.1.3","IN-A5",true);
  assert.equal(more.answers,row.answers);assert.equal(more.notes,row.notes);assert.equal(more.reference,row.reference);assert(!Object.hasOwn(row,"edl_evidence"));
  assert.deepEqual(more.edl_evidence.selections,{"IN.1.2":["IN-T1"],"IN.1.3":["IN-A5"]});
  assert.deepEqual(editEdlEvidence(more,value,"IN.1.2","IN-T1",false).edl_evidence.selections["IN.1.3"],["IN-A5"]);
  assert.throws(()=>editEdlEvidence(row,value,"IN.1.2","NPL1",true),/Invalid/);
  assert.throws(()=>editEdlEvidence(next,{...value,library_hash:"b".repeat(64)},"IN.1.2","IN-T1",false),/different EDL library edition/);
});
