import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {assessmentChanges,fundingVisualReducer as reduce,initialFundingVisual as initial,visualScope,conditionText,graphQuestions} from "../src/fundingVisualState.js";
import {validateResponse} from "../src/contracts.js";

const condition=(result="unknown",value=null)=>({id:"A:amount:bonus",option_id:"A",fields:["bonus"],effect:"amount",result,value,message:"Addition",sources:[]});
function response({facts={bonus:null,income:null},status="Needs information",estimate=37000,checks=[condition()]}={}) {
  return {assessment:{facts,results:[{id:"A",status,relevant:true,finance:{estimate,schedule:[]}}]},input_context:{questions:Object.entries(facts).map(([id,v])=>({id,label:id,current_value:v,display_value:v===null?"Unknown":String(v)}))},visualisation:{conditions:checks,coverage:[]}};
}
test("consecutive accepted results report resolved conditions without claiming fit or amount changes",()=>{
  const first=response(),next=response({facts:{bonus:"no",income:null},checks:[condition("fail",0)]});
  const changes=assessmentChanges(first,next);
  assert.deepEqual(changes.fields,["bonus"]);
  assert.equal(changes.conditions[0].resolved,true);
  assert.equal(changes.options[0].fit,false);
  assert.equal(changes.options[0].amount,false);
  assert.equal(assessmentChanges(null,next),null);
  assert.match(conditionText(condition("fail",0)),/No addition/);
});
test("combined edits compare with the previous accepted assessment; fit and amounts stay independent",()=>{
  const before=response();
  const after=response({facts:{bonus:"yes",income:30000},status:"Possible match — eligibility unverified",estimate:40000,checks:[condition("pass",3000)]});
  const diff=assessmentChanges(before,after);
  assert.deepEqual(diff.fields,["bonus","income"]);
  assert.equal(diff.options[0].fit,true);assert.equal(diff.options[0].amount,true);
  const unchanged=response({facts:{bonus:"yes",income:30000},checks:[condition()]});
  const affected=assessmentChanges(before,unchanged).options;
  assert.equal(affected.length,1);assert.equal(affected[0].conditions.length,0);assert.equal(affected[0].affected.length,1);assert.equal(affected[0].fit,false);
});
test("rapid edits, late responses and retries preserve explicitly previous results",()=>{
  const accepted=response();
  let s=reduce(initial,{type:"start",context:1,token:1,inputKey:"a"});
  s=reduce(s,{type:"success",context:1,token:1,value:accepted});
  s=reduce(s,{type:"start",context:1,token:2,inputKey:"b"});
  assert.equal(s.value,accepted);assert.equal(s.status,"pending");
  s=reduce(s,{type:"start",context:1,token:3,inputKey:"c"});
  assert.equal(reduce(s,{type:"success",context:1,token:2,value:response({estimate:0})}),s);
  s=reduce(s,{type:"error",context:1,token:3,error:"Offline"});
  assert.equal(s.value,accepted);assert.equal(s.error,"Offline");assert.equal(s.status,"error");
  s=reduce(s,{type:"start",context:1,token:4,inputKey:"c"});
  s=reduce(s,{type:"success",context:1,token:4,value:response({facts:{bonus:"yes",income:2},estimate:40000,checks:[condition("pass",3000)]})});
  assert.deepEqual(s.changes.fields,["bonus","income"]);
  assert.deepEqual(s.latestFields,["bonus","income"]);
  const acceptedLatest=s.value;
  s=reduce(s,{type:"start",context:1,token:6,inputKey:"shortlist-change"});
  s=reduce(s,{type:"success",context:1,token:6,value:acceptedLatest});
  assert.deepEqual(s.changes.fields,["bonus","income"],"Non-answer updates retain the previous answer highlights");
  assert.deepEqual(s.latestFields,["bonus","income"],"Shortlisting does not erase the latest answered fields");
  const other=reduce(s,{type:"start",context:2,token:5,inputKey:"d"});
  assert.equal(other.value,null);assert.equal(other.changes,null);
  assert.equal(reduce(other,{type:"error",context:1,token:4,error:"Late"}),other);
  assert.equal(reduce(other,{type:"success",context:2,token:5,value:accepted}).changes,null);
  assert.deepEqual(reduce(s,{type:"reset"}),initial);
});
test("graph and matrix share stable catalogue order, family paging and shortlist scope",()=>{
  const rows=Array.from({length:29},(_,i)=>({id:String(i),group:i<25?"public":"other",status:i%2 ? "Needs information" : "Does not match these facts"}));
  const args={group:"public",shortlistOnly:false,selected:["1","26"],page:1};
  const graph=visualScope(rows,args), matrix=visualScope(rows,args);
  assert.deepEqual(graph,matrix);assert.equal(graph.count,25);assert.equal(graph.pages,3);
  assert.deepEqual(graph.options.map(r=>r.id),Array.from({length:12},(_,i)=>String(i+12)));
  assert.deepEqual(visualScope(rows,{...args,page:0,shortlistOnly:true}).options.map(r=>r.id),["1","26"]);
  assert.equal(visualScope(rows,{...args,expanded:true}).options.length,25);
  assert.deepEqual(visualScope(rows,{...args,expanded:true,shortlistOnly:true}).options.map(r=>r.id),["1","26"]);
  assert.equal(visualScope(rows,args).options[0].id,"12");
});
test("visual contract rejects incomplete metadata and preserves multi-input relationships",()=>{
  const catalogue=JSON.parse(readFileSync(new URL("../../scenarios/funding.json",import.meta.url)));
  const d={version:1,name:"Test",activity_key:"test",baseline:{facts:{},parties:[],target:"business",parcel_ids:[],work_budget:null},overrides:{},selected:[],allocations:[],calendar_start:null,notes:"",bundle:catalogue};
  const a={draft:d,facts:{},results:[{...catalogue.entries[0],status:"Needs information",relevant:true,finance:{basis:"Unknown",estimate:null,schedule:[],notes:[]},checks:[]}],differences:[],stale:false,catalogue_changed:false,catalogue_hash:"hash",warnings:[],allocation_totals:{},uncovered:null,upfront_shortfall:null,calendar_note:""};
  const id=a.results[0].id, c={...condition(),id:"income",option_id:id,fields:["net_year1","smi_year1"],effect:"eligibility"};
  const questions=["activity","applicant_choice","net_year1","smi_year1"].map(id=>({id,label:id,short_label:id,input_kind:"number",retired:false,guidance:{summary:"Input explanation",why:"Programme condition",verify:"Check the recorded evidence",requirements:[]},provenance:{kind:"inherited",parcel_ids:[],detail:"Inherited context"},type:id==="applicant_choice"?"applicant":"number",step:id==="activity"?0:1,relevant:true,current_value:null,initial_value:null,display_value:"Unknown",initial_label:"Unknown",unknown:true,overridden:false,origin:"Inherited",options:[{group:"Undecided",label:"Unknown",choice:{kind:"unknown"}}],other_forms:[]}));
  const value={assessment:a,input_context:{editing_ready:false,questions},applicant_context:{party_name:null,inherited_form:null,derived:true,override_conflict:false},visualisation:{version:1,conditions:[c],coverage:[{option_id:id,requirements:"modelled",condition_ids:["income"],unresolved_count:1,scope_fields:["activity"]}]}};
  assert.equal(validateResponse("funding/visualise",value),value);
  const bad=structuredClone(value);bad.visualisation.coverage=[];
  assert.throws(()=>validateResponse("funding/visualise",bad),/coverage/);
  const missing=structuredClone(value);missing.visualisation.conditions[0].fields=["guessed_rule"];
  assert.throws(()=>validateResponse("funding/visualise",missing),/dependencies/);
  assert.throws(()=>validateResponse("funding/visualise",{assessment:a}),/visualisation/);
});
test("applicant lifecycle changes affect conditions even when modelled form and fit stay unchanged",()=>{
  const before=response({facts:{applicant_kind:"nonprofit"},checks:[{...condition("pass",null),fields:["applicant_choice"],effect:"eligibility"}]});
  const next=structuredClone(before);
  before.input_context.questions=[{id:"applicant_choice",label:"Applicant",current_value:{kind:"planned",legal_form:"nonprofit"},display_value:"Planned nonprofit"}];
  next.input_context.questions=[{id:"applicant_choice",label:"Applicant",current_value:{kind:"potential",legal_form:"nonprofit"},display_value:"Potential nonprofit"}];
  const changes=assessmentChanges(before,next);
  assert.deepEqual(changes.fields,["applicant_choice"]);assert.equal(changes.options[0].fit,false);assert.equal(changes.options[0].conditions.length,0);assert.equal(changes.options[0].affected.length,1);
});
test("conditions removed by an applicant change remain explainable",()=>{
  const before=response({facts:{bonus:null},checks:[condition(),{...condition(),id:"extra",fields:["bonus"],effect:"eligibility"}]});
  const next=response({facts:{bonus:"yes"},checks:[condition("pass",1)]});
  const changes=assessmentChanges(before,next);
  assert(changes.conditions.some(c=>c.id==="extra"&&c.removed));
});

test("persistent fit nodes cover all pages while money stays an explicit graph choice",()=>{
  const questions=["applicant_choice","municipality","owner_id","bonus","eligible_cost"].map(id=>({id}));
  const checks=[{option_id:"A",fields:["applicant_choice"],effect:"eligibility"},{option_id:"B",fields:["municipality"],effect:"eligibility"},{option_id:"A",fields:["bonus"],effect:"amount"},{option_id:"B",fields:["eligible_cost"],effect:"amount"}];
  const scope=["A","B"],settings={focus:false,currentField:"applicant_choice",showAmount:false};
  const ids=options=>graphQuestions(questions,checks,scope,options).map(q=>q.id);
  assert.deepEqual(ids(settings),["applicant_choice","municipality"]);
  assert.deepEqual(ids({...settings,currentField:"owner_id"}),ids(settings));
  assert.deepEqual(ids({...settings,showAmount:true}),["applicant_choice","municipality","bonus","eligible_cost"]);
  assert.deepEqual(ids({...settings,focus:true,currentField:"owner_id"}),["owner_id"]);
  assert.deepEqual(graphQuestions(questions,checks,["research-only"],settings),[]);
});
