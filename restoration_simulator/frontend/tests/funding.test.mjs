import test from "node:test";
import assert from "node:assert/strict";
import {effectiveFacts, overrideAnswer, resetAnswer, fundingResults, answerLabel, FUNDING_STEPS} from "../src/fundingState.js";
import {validateResponse} from "../src/contracts.js";

test("funding assumptions override the snapshot without altering recorded facts",()=>{
  const d={baseline:{facts:{applicant_kind:"individual",budget_total:0}},overrides:{}};
  const alternative=overrideAnswer(d,"applicant_kind","nonprofit");
  assert.equal(d.baseline.facts.applicant_kind,"individual");
  assert.equal(effectiveFacts(alternative).applicant_kind,"nonprofit");
  assert.equal(effectiveFacts(alternative).budget_total,0);
  assert.equal(effectiveFacts(resetAnswer(alternative,"applicant_kind")).applicant_kind,"individual");
  assert.equal(effectiveFacts(overrideAnswer(d,"budget_total",null)).budget_total,null);
});
test("unknown and alternative arrangements remain browsable",()=>{
  const rows=[{id:"A",title:"Startup",description:"new business",group:"public",status:"Needs information",relevant:true},{id:"B",title:"Conservation",description:"habitat",group:"public",status:"Does not match these facts",relevant:false}];
  assert.equal(fundingResults(rows,{}).length,1);
  assert.equal(fundingResults(rows,{all:true,requireChanges:true}).length,2);
  assert.equal(fundingResults(rows,{all:true,requireChanges:true,query:"habitat"})[0].id,"B");
  assert.equal(FUNDING_STEPS.length,6);
});
test("funding API contract errors cannot masquerade as empty results",()=>{
  assert.throws(()=>validateResponse("funding",{}),/funding/);
  assert.throws(()=>validateResponse("funding/evaluate",{results:[]}),/funding/);
  assert.equal(answerLabel({type:"number"},0,[]),"0");
  assert.match(answerLabel({type:"number"},null,[]),/Unknown/);
});
