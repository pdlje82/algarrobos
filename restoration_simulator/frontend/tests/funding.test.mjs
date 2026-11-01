import test from "node:test";
import assert from "node:assert/strict";
import {effectiveFacts, overrideAnswer, resetAnswer, fundingResults, answerLabel, FUNDING_STEPS, fundingStatus,fundingCounts,FUNDING_HELP,presentQuestion,applicantKey,logicalQuestionId,explicitlyUnknown} from "../src/fundingState.js";
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
test("options across activities remain browsable with explicit search, family and conflict filters",()=>{
  const rows=[{id:"A",title:"Startup",description:"new business",group:"public",status:"Needs information",relevant:true},{id:"B",title:"Conservation",description:"habitat",group:"public",status:"Does not match these facts",relevant:false},{id:"C",title:"Donation",description:"private gift",group:"donations",status:"Needs information",relevant:false}];
  assert.deepEqual(fundingResults(rows,{}).map(r=>r.id),["A","C"]);
  assert.deepEqual(fundingResults(rows,{requireChanges:true}).map(r=>r.id),["A","B","C"]);
  assert.equal(fundingResults(rows,{requireChanges:true,query:"habitat"})[0].id,"B");
  assert.deepEqual(fundingResults(rows,{requireChanges:true,group:"public"}).map(r=>r.id),["A","B"]);
  assert.deepEqual(fundingResults(rows,{query:"unmatched"}),[]);
  assert.deepEqual(FUNDING_STEPS,["Explore and score","Project overview","Activities and delivery","Budget and review"]);
});
test("funding API contract errors cannot masquerade as empty results",()=>{
  assert.throws(()=>validateResponse("funding",{}),/funding/);
  assert.throws(()=>validateResponse("funding/evaluate",{results:[]}),/funding/);
  assert.equal(answerLabel({type:"number"},0,[]),"0");
  assert.match(answerLabel({type:"number"},null,[]),/Unknown/);
});
test("missing user answers are separate from unimplemented assessments and conflicts",()=>{
  const rows=[
    {status:"Needs information",checks:[{field:"municipality",result:"unknown"}]},
    {status:"Needs information",checks:[{field:null,result:"unknown"}]},
    {status:"Does not match these facts",checks:[{field:"applicant_kind",result:"fail"}]},
    {status:"Possible match — eligibility unverified",checks:[{field:"purpose",result:"pass"}]},
  ];
  assert.deepEqual(fundingCounts(rows),{matches:1,needs_answers:1,conflicts:1,unimplemented:1});
  assert.deepEqual(rows.slice(0,3).map(fundingStatus),["Needs your answers","Explore this option","Conflicts with current scenario"]);
  assert.match(FUNDING_HELP.resolved,/satisfied or conflicting/);
  assert.match(FUNDING_HELP.unimplemented,/completing more questions cannot resolve/i);
  assert.throws(()=>fundingStatus({status:"Needs information",checks:[]}),/missing/);
});
test("one applicant edit, unknown and restore replace the complete choice",()=>{
  const initial={kind:"recorded",party_id:"individual"};
  const q={id:"applicant_choice",type:"applicant",initial_value:initial,current_value:initial,overridden:false,origin:"Inherited",other_forms:[["company","Company"]],forms:[["company","Company"],["nonprofit","Nonprofit"]],options:[{label:"Individual",choice:initial},{label:"New nonprofit",choice:{kind:"planned",legal_form:"nonprofit"}},{label:"Unknown",choice:{kind:"unknown"}}]};
  const d={version:3,applicant_choice:null,baseline:{facts:{applicant_id:"individual",applicant_kind:"individual"},parties:[]},overrides:{}};
  const next=overrideAnswer(d,"applicant_choice",{kind:"planned",legal_form:"nonprofit"});
  assert.equal(presentQuestion(q,next).display_value,"Applicant type · Nonprofit");
  assert.equal(next.overrides.applicant_kind,undefined);assert.equal(d.applicant_choice,null);
  const cleared=overrideAnswer(next,"applicant_choice",{kind:"unknown"});
  assert.equal(presentQuestion(q,cleared).unknown,true);
  assert.equal(explicitlyUnknown(presentQuestion(q,cleared)),true);
  assert.equal(explicitlyUnknown({...q,current_value:{kind:"unknown"}}),false);
  assert.equal(explicitlyUnknown({...q,overridden:true,current_value:{kind:"potential",legal_form:null}}),false);
  assert.equal(explicitlyUnknown({type:"text",overridden:false,current_value:"unknown"}),false);
  const restored=resetAnswer(cleared,"applicant_choice");assert.equal(restored.applicant_choice,null);assert.equal(presentQuestion(q,restored).display_value,"Individual");
  assert.equal(applicantKey(initial),"recorded:individual");assert.equal(logicalQuestionId("applicant_kind"),"applicant_choice");
  assert.throws(()=>overrideAnswer(d,"applicant_kind","nonprofit"),/complete choice/);
});
