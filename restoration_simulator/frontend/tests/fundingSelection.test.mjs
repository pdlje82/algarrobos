import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {selectionSummary,selectionProfile,selectionGraphLayout,setSelectionChoice,clearSelectionRow,editSelectionRow} from "../src/fundingSelectionState.js";
import {validateResponse} from "../src/contracts.js";
import {assumptionCount} from "../src/fundingState.js";

const bundle=JSON.parse(readFileSync(new URL("../../scenarios/funding.json",import.meta.url)));
const route="LEADER-AL20-2.7";
const draft={version:4,bundle,selection_assessments:{[route]:{criteria:{}}}};
const criterion=id=>selectionProfile(draft,route).criteria.find(c=>c.id===id);
const row=cr=>({answers:Object.fromEntries(cr.choices.filter(c=>c.routes.includes(route)).map(c=>[c.id,null])),inputs:cr.method==="employment"?{qualifying_uta:null}:{},reference:"Keep reference",notes:"Keep notes"});

test("annex editing prevents conflicts and dependent removal without changing the input",()=>{
  const cr=criterion("PE.2"),initial=row(cr),before=structuredClone(initial);
  assert.throws(()=>setSelectionChoice(initial,cr,"PE.2.5",true),/Select PE.2.4/);
  let next=setSelectionChoice(initial,cr,"PE.2.4",true);
  next=setSelectionChoice(next,cr,"PE.2.5",true);
  assert.throws(()=>setSelectionChoice(next,cr,"PE.2.6",true),/mutually exclusive/);
  assert.throws(()=>setSelectionChoice(next,cr,"PE.2.4",false),/clear that addition/);
  assert.deepEqual(initial,before);
  const zero=clearSelectionRow(next,false);
  assert(Object.values(zero.answers).every(v=>v===false));assert.equal(zero.reference,"Keep reference");
  assert(Object.values(clearSelectionRow(next,null).answers).every(v=>v===null));
});
test("route edits retain other route assessments and contain no derived totals",()=>{
  const d={...draft,selection_assessments:{[route]:{criteria:{"AT.3":row(criterion("AT.3"))}},other:{criteria:{untouched:true}}}};
  const updated=editSelectionRow(d,route,"AT.3",clearSelectionRow(d.selection_assessments[route].criteria["AT.3"],false));
  assert.equal(updated.selection_assessments.other,d.selection_assessments.other);
  assert.equal(d.selection_assessments[route].criteria["AT.3"].answers["AT.3.1"],null);
  assert(!Object.hasOwn(updated.selection_assessments[route],"total"));
  assert.throws(()=>editSelectionRow(d,route,"guessed",{}),/missing/);
  const countable={...updated,overrides:{},applicant_choice:null,selection_assessments:{[route]:updated.selection_assessments[route]}};
  assert.equal(assumptionCount(countable),1,"An explicitly rejected annex is still a self-assessment assumption");
});
test("expanding branches reserves space and does not move unrelated question nodes on answer changes",()=>{
  const qs=[{id:"first"},{id:"selection_score"},{id:"last"}];
  const branch={open:true,route,profile:selectionProfile(draft,route),groups:[]};
  const closed=selectionGraphLayout(qs,{...branch,open:false}),expanded=selectionGraphLayout(qs,branch);
  assert.equal(closed.tops.get("first"),expanded.tops.get("first"));
  assert.equal(closed.tops.get("selection_score"),expanded.tops.get("selection_score"));
  assert(expanded.tops.get("last")>closed.tops.get("last"));
  const opened=selectionGraphLayout(qs,{...branch,groups:["AT.3","CO.1"]});
  assert.equal(opened.rows.filter(r=>r.kind==="choice").length,5);
  for(let i=1;i<opened.rows.length;i++)assert(opened.rows[i].top>=opened.rows[i-1].top+opened.rows[i-1].height);
  assert.deepEqual(selectionGraphLayout(qs,{...branch,groups:["AT.3","CO.1"]}),opened);
});
test("incomplete totals are visibly partial and invalid responses are actionable errors",()=>{
  assert.match(selectionSummary({subtotal:10,total:null,unresolved:3}),/Partial subtotal: 10 points · 3 criteria unresolved/);
  assert.match(selectionSummary({subtotal:60,total:60,unresolved:0}),/self-assessed/);
  assert.throws(()=>selectionSummary({total:60}),/incompatible/);
  const d={version:4,name:"Test",activity_key:"test",baseline:{facts:{},parties:[],target:"business",parcel_ids:[],work_budget:null},overrides:{},selected:[],allocations:[],calendar_start:null,notes:"",bundle,applicant_choice:null};
  assert.throws(()=>validateResponse("funding/context",d),/selection_assessments/);
});
