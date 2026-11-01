import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {validateSelectionGuidanceResponse,selectionGuidanceFor} from "../src/fundingSelectionGuidanceState.js";
import {validateResponse} from "../src/contracts.js";

const library=JSON.parse(readFileSync(new URL("../../scenarios/funding-selection-guidance-v1.json",import.meta.url)));
const value={version:1,library_hash:"a".repeat(64),library};
test("all 45 scoring choices have official and restoration guidance without stored point values",()=>{
  assert.equal(validateResponse("funding/selection-guidance",value),value);
  assert.equal(Object.keys(library.nodes).length,45);
  for(const [id,node] of Object.entries(library.nodes)){
    assert(!Object.hasOwn(node,"points"));
    for(const route of library.routes)assert(selectionGuidanceFor(value,route,id).recommendations.length>0);
  }
});
test("route filtering retains common advice and selects only the appropriate project recommendation",()=>{
  const first=selectionGuidanceFor(value,"LEADER-AL20-3.4","PT.1.1");
  const second=selectionGuidanceFor(value,"LEADER-AL20-3.5","PT.1.1");
  assert.deepEqual(first.recommendations.map(r=>r.id),["PT.1.1-restoration","demonstration-design"]);
  assert.deepEqual(second.recommendations.map(r=>r.id),["PT.1.1-restoration","heritage-recovery-design"]);
  assert.equal(first.official.text,second.official.text);
  assert.match(selectionGuidanceFor(value,"LEADER-AL20-3.4","IN.1.1").official.text,/does not designate/);
  assert.throws(()=>selectionGuidanceFor(value,null,"PT.1.1"),/Choose/);
  assert.throws(()=>selectionGuidanceFor(value,"LEADER-AL20-2.6","PT.1.1"),/Choose/);
  assert.throws(()=>selectionGuidanceFor(value,"LEADER-AL20-3.4","UNKNOWN"),/No selection guidance/);
});
test("missing advice, invalid editions and incompatible responses fail explicitly",()=>{
  const sid=Object.keys(library.sources)[0];
  for(const mutate of [d=>d.version=2,d=>delete d.library.nodes["PT.1.1"],
    d=>d.library.nodes["PT.1.1"].official.text="",
    d=>d.library.nodes["PT.1.1"].payment.sources=["missing"],
    d=>d.library.nodes["PT.1.1"].unresolved=null,
    d=>d.library.recommendations["AT.3.1-restoration"].routes=["LEADER-AL20-3.4"],
    d=>d.library.recommendations["PT.1.1-restoration"].routes=["LEADER-AL20-2.6"],
    d=>d.library.sources[sid].sha256="0".repeat(64),
    d=>d.library.sources[sid].page=9999,
    d=>d.library.publications["FUND-008"].download_url="javascript:alert(1)",
    d=>d.library.checked_on="2026-02-30"]){
    const copy=structuredClone(value);mutate(copy);assert.throws(()=>validateSelectionGuidanceResponse(copy),/Incompatible AL20/);
  }
});
test("reading and filtering does not mutate guidance or any assessment inputs",()=>{
  const before=JSON.stringify(value);
  for(const route of library.routes)for(const id of Object.keys(library.nodes))selectionGuidanceFor(value,route,id);
  assert.equal(JSON.stringify(value),before);
});
