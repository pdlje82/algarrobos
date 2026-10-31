import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {validateGuideResponse,guideFor,GUIDE_SECTIONS} from "../src/fundingGuideState.js";
import {validateResponse} from "../src/contracts.js";
import {fundingClass,fundingStatus} from "../src/fundingState.js";

const library=JSON.parse(readFileSync(new URL("../../scenarios/funding-guides-v1.json",import.meta.url)));
const value={version:1,library_hash:"a".repeat(64),library};
test("all research introductions have the five sections, sources and explicit unknowns",()=>{
  assert.equal(validateGuideResponse(value),value);
  assert.equal(validateResponse("funding/guides",value),value);
  assert.equal(Object.keys(library.guides).length,92);
  for(const g of Object.values(library.guides)){
    const words=GUIDE_SECTIONS.map(([key])=>g[key]).join(" ").split(/\s+/).length;
    assert(words>=200&&words<=350);assert(g.source_ids.length>0);assert(g.unresolved.length>0);
  }
  const result={status:"Needs information",checks:[{field:null,result:"unknown"}]};
  assert.equal(fundingClass(result),"unimplemented");assert.equal(fundingStatus(result),"Explore this option");
});
test("bad versions, dates, sections and references cannot masquerade as guides",()=>{
  for(const mutate of [
    d=>d.version=2, d=>d.library.guides["NATURE-01"].what="",
    d=>d.library.guides["NATURE-01"].source_ids=["unknown"],
    d=>d.library.sources["carbon-guide"].page=9999,
    d=>d.library.sources["carbon-guide"].sha256="0".repeat(64),
    d=>d.library.sources["carbon-guide"].document_id="UNKNOWN-001",
    d=>d.library.sources.enisa.url="javascript:alert(1)",
    d=>d.library.sources.enisa.url=null,
    d=>d.library.checked_on="2026-02-30",
    d=>d.library.guides["NATURE-01"].checked_on="2027-01-01",
  ]){const d=structuredClone(value);mutate(d);assert.throws(()=>validateGuideResponse(d),/funding guide/);}
  assert.throws(()=>guideFor(value,"SELF-FUNDS"),/No current introduction/);
  const snapshot=JSON.stringify(value);guideFor(value,"NATURE-01");assert.equal(JSON.stringify(value),snapshot);
});
