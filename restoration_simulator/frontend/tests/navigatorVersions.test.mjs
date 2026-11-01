import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {validateResponse} from "../src/contracts.js";
import {fundingLanding,FUNDING_STEPS} from "../src/fundingState.js";
import {editFundingFocus} from "../src/fundingFocusState.js";
import {proposeSelectionChoice} from "../src/fundingSelectionState.js";

const bundle=JSON.parse(readFileSync(new URL('../../scenarios/funding.json',import.meta.url)));
function draft(){return {version:4,name:"Version",activity_key:"activity",baseline:{facts:{},parties:[],target:"activity",parcel_ids:[],work_budget:null},overrides:{},selected:[],allocations:[],calendar_start:null,notes:"",bundle,applicant_choice:null,legacy_selection_score:null,selection_assessments:Object.fromEntries(Object.entries(bundle.selection.routes).map(([route,pid])=>[route,{criteria:Object.fromEntries(bundle.selection.profiles[pid].criteria.map(c=>[c.id,{answers:c.method==="ratio"?{}:Object.fromEntries(c.choices.filter(x=>x.routes.includes(route)).map(x=>[x.id,bundle.selection.defaults.selected])),inputs:c.method==="ratio"?{grant:null,quality_jobs:null}:c.method==="employment"?{qualifying_uta:null}:{},notes:"",reference:"",...(c.method==="ratio"?{calculation_included:bundle.selection.defaults.include_calculation}:{})}]))}]))};}

test("the four areas open on the overview only when an explicit programme and route exist",()=>{
 const d=draft();assert.equal(FUNDING_STEPS.length,4);assert.equal(fundingLanding(d),0);
 assert.equal(fundingLanding(editFundingFocus(d,'LEADER-AL20',null)),0);
 assert.equal(fundingLanding(editFundingFocus(d,'LEADER-AL20','LEADER-AL20-3.4')),1);
 d.selected=['LEADER-AL20-3.4'];assert.equal(fundingLanding(d),0,'Shortlisting is separate from route focus');
});
test("selected-items contracts require explicit calculation inclusion and authoritative defaults",()=>{
 const d=draft();assert.equal(validateResponse('funding/context',d),d);
 const b=structuredClone(d);delete b.selection_assessments['LEADER-AL20-2.6'].criteria['PE.4'].calculation_included;assert.throws(()=>validateResponse('funding/context',b),/calculation inclusion/);
 const c=structuredClone(d);c.bundle.selection.defaults.selected=true;assert.throws(()=>validateResponse('funding/context',c),/authoritative selection defaults/);
});
test("active version and draft must agree, while legacy attachments remain readable",()=>{
 const d=draft(),record={id:'version-1',draft:structuredClone(d)},w={version:1,project_revision:1,funding_revision:1,legacy:null,attachment:{version:2,active_version_id:'version-1',draft:d,scenarios:[record],plans:[]}};
 assert.equal(validateResponse('funding',w),w);
 const bad=structuredClone(w);bad.attachment.draft.name='Unsynchronised';assert.throws(()=>validateResponse('funding',bad),/disagree/);
 const missing=structuredClone(w);delete missing.attachment.active_version_id;assert.throws(()=>validateResponse('funding',missing),/active funding version/);
 const legacy=structuredClone(w);legacy.attachment.version=1;delete legacy.attachment.active_version_id;assert.equal(validateResponse('funding',legacy),legacy);
});
test("binary proposals preserve independent notes and references while identifying replacements",()=>{
 const c=bundle.selection.profiles.line3.criteria.find(c=>c.id==='AT.3'),row={answers:{'AT.3.1':true,'AT.3.2':null},inputs:{},notes:'Keep shared notes',reference:'Keep source',choice_context:{version:1,items:{'AT.3.1':{notes:'Independent notes',reference:'Item source'}}}};
 const before=structuredClone(row),proposal=proposeSelectionChoice(row,c,'AT.3.2',true);
 assert.deepEqual(proposal.related,['AT.3.1']);assert.equal(proposal.row.answers['AT.3.1'],false);assert.deepEqual(proposal.row.choice_context,row.choice_context);assert.deepEqual(row,before);
});
test("an incomplete or incompatible overview is an error rather than an empty project",()=>{
 assert.throws(()=>validateResponse('funding/overview',{}),/project overview/);
 assert.throws(()=>validateResponse('funding/workspace-preview',{version:1}),/workspace preview/);
});
