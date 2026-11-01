import test from "node:test";
import assert from "node:assert/strict";
import {createHash,randomUUID} from "node:crypto";
import library from "../../scenarios/funding-project-concept-v1.json" with {type:"json"};
import selection from "../../scenarios/funding.json" with {type:"json"};
import {validateConceptGuide,validateConcept,validateTransfer,includeActivity,copyConcepts} from "../src/projectConceptState.js";
import {proposeSelectionChoice,editChoiceContext} from "../src/fundingSelectionState.js";
import {validateResponse} from "../src/contracts.js";
const hash=createHash("sha256").update(JSON.stringify(library)).digest("hex");
const concept=()=>({version:1,id:randomUUID(),route:"LEADER-AL20-3.4",guide_id:library.id,guide_hash:hash,title:library.defaults.title,purpose:"",notes:"",objectives:[],justifications:{},activities:[]});
test("the library has explicit starters/tasks/manual instructions for 45 claims and 50 needs",()=>{
 assert.equal(validateConceptGuide({version:1,library,library_hash:hash}).library,library);assert.equal(Object.keys(library.bindings).length,95);
 const bad=structuredClone(library);delete bad.bindings["AT.3.1"];assert.throws(()=>validateConceptGuide({version:1,library:bad,library_hash:hash}),/Incompatible/);
});
test("including suggestions is explicit and reuse retains stable identities and independent alternative copies",()=>{
 const c=concept(),original=structuredClone(c),template=library.bindings.NPL3.template_ids[0];
 const next=includeActivity(c,library,template,["NPL3","NPL4","PT.1.1"],randomUUID());assert.deepEqual(c,original);assert.equal(next.activities.length,1);assert.deepEqual(next.objectives,[]);assert.equal(next.activities[0].responsible,"");
 const copy=copyConcepts({[next.route]:next})[next.route];assert.notEqual(copy.id,next.id);assert.notEqual(copy.activities[0].id,next.activities[0].id);assert.deepEqual(copy.activities[0].bindings,next.activities[0].bindings);
 assert.throws(()=>includeActivity(c,library,"missing",[],randomUUID()));assert.throws(()=>validateConcept({...c,version:2}));
});
test("item notes remain independent; exclusions and dependencies are proposed without mutating answers",()=>{
 const criterion=selection.selection.profiles.line3.criteria.find(c=>c.id==="AT.3");
 const row={answers:Object.fromEntries(criterion.choices.map((c,i)=>[c.id,i===0])),inputs:{},reference:"Shared",notes:"Shared context"};const original=structuredClone(row);
 const proposed=proposeSelectionChoice(row,criterion,criterion.choices[1].id,true);assert.deepEqual(row,original);assert.deepEqual(proposed.related,[criterion.choices[0].id]);assert.equal(proposed.row.answers[criterion.choices[0].id],false);
 const noted=editChoiceContext(row,criterion.choices[0].id,"notes","Own note");assert.equal(noted.notes,"Shared context");assert.equal(noted.choice_context.items[criterion.choices[0].id].notes,"Own note");assert(!Object.hasOwn(row,"choice_context"));
 const dependent=Object.values(selection.selection.profiles).flatMap(p=>p.criteria).find(c=>Object.keys(c.requires).length>0),child=Object.keys(dependent.requires)[0];const blank={answers:Object.fromEntries(dependent.choices.map(c=>[c.id,null])),inputs:{},reference:"",notes:""};
 const addition=proposeSelectionChoice(blank,dependent,child,true);assert(addition.related.length>0);assert(dependent.requires[child].every(p=>addition.row.answers[p]===true));
});
test("transfer contracts cannot hide an unresolved removal or missing baseline",()=>{
 const p={version:1,concept_id:randomUUID(),route:"LEADER-AL20-3.4",first_transfer:false,notice:"Both copies",preview_hash:hash,fields:[{path:["activities",randomUUID()],baseline:{},navigator:null,demonstrator:{},conflict:true,suggested:null}]};assert.equal(validateTransfer(p),p);
 const b=structuredClone(p);delete b.fields[0].baseline;assert.throws(()=>validateTransfer(b));
});
test("missing item answers and shared inputs fail at the API boundary, preserving the caller's draft",()=>{
 const assessments=Object.fromEntries(Object.entries(selection.selection.routes).map(([route,pid])=>[route,{criteria:Object.fromEntries(selection.selection.profiles[pid].criteria.map(c=>[c.id,{answers:c.method==="ratio"?{}:Object.fromEntries(c.choices.filter(x=>x.routes.includes(route)).map(x=>[x.id,null])),inputs:c.method==="ratio"?{grant:null,quality_jobs:null}:c.method==="employment"?{qualifying_uta:null}:{},notes:"",reference:"",...(c.method==="ratio"?{calculation_included:selection.selection.defaults.include_calculation}:{})}]))}]));
 const d={version:4,name:"Test",activity_key:"test",baseline:{facts:{},parties:[],target:"activity",parcel_ids:[],work_budget:null},overrides:{},selected:[],allocations:[],calendar_start:null,notes:"",bundle:selection,applicant_choice:null,selection_assessments:assessments,legacy_selection_score:null};
 assert.equal(validateResponse("funding/context",d),d);
 const before=structuredClone(d),bad=structuredClone(d);delete bad.selection_assessments["LEADER-AL20-3.4"].criteria["IG.8"].answers["IG.8.1"];assert.throws(()=>validateResponse("funding/context",bad),/individual scoring answers/);assert.deepEqual(d,before);
 const broken=structuredClone(d);const employment=Object.values(broken.selection_assessments).flatMap(a=>Object.values(a.criteria)).find(r=>Object.hasOwn(r.inputs,"qualifying_uta"));delete employment.inputs.qualifying_uta;assert.throws(()=>validateResponse("funding/context",broken),/shared scoring inputs/);
});
