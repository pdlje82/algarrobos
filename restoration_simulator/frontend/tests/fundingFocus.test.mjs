import {test} from "node:test";
import assert from "node:assert/strict";
import {fundingFocus,editFundingFocus,validateFundingFocusMembership} from "../src/fundingFocusState.js";

const draft={version:4,bundle:{entries:[{id:"LEADER-AL20-3.4"},{id:"LEADER-AL20-3.5"}]},selected:[],selection_assessments:{route:{notes:"Retain"}}};
const registry={library:{programmes:[{id:"LEADER-AL20",entry_ids:draft.bundle.entries.map(e=>e.id)},{id:"EU-LIFE",entry_ids:["other"]}]}};
test("focus is explicitly optional and edits retain answers and shortlisted mechanisms",()=>{
  const before=structuredClone(draft);
  assert.deepEqual(fundingFocus(draft),{version:1,programme_id:null,route_id:null});
  const selected=editFundingFocus(draft,"LEADER-AL20","LEADER-AL20-3.4");
  assert.equal(fundingFocus(selected).route_id,"LEADER-AL20-3.4");
  validateFundingFocusMembership(registry,selected);
  assert.deepEqual(draft,before);assert.equal(selected.selection_assessments,draft.selection_assessments);assert.deepEqual(selected.selected,[]);
  assert.equal(fundingFocus(editFundingFocus(selected,"LEADER-AL20",null)).programme_id,"LEADER-AL20");
  assert.deepEqual(fundingFocus(editFundingFocus(selected,null,null)),fundingFocus(draft));
});
test("malformed focus and incompatible registry cannot silently lose the saved selection",()=>{
  for(const value of [null,{},[],{version:2,programme_id:null,route_id:null},{version:1,programme_id:null,route_id:"LEADER-AL20-3.4"},{version:1,programme_id:"LEADER-AL20",route_id:"missing"}])assert.throws(()=>fundingFocus({...draft,navigator_focus:value}),/Invalid/);
  for(const id of ["missing","EU-LIFE"])assert.throws(()=>validateFundingFocusMembership(registry,editFundingFocus(draft,id,"LEADER-AL20-3.4")),/saved programme\/route/);
});
