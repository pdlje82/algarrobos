import test from "node:test";
import assert from "node:assert/strict";
import { validateResponse } from "../src/contracts.js";

const evaluation = () => ({
  draft:{version:1,bundle:{manifest:{version:1}}},width:10,height:20,
  features:{catchment:null},instances:[],rules:[],issues:[],removed:[],reasons:[],ruleset_hash:"snapshot",
  summary:{plants:0,trees:0,shrubs:0,placed:0,unplaced:0,tree_density:0,carob_density:0,plant_cost:0}
});

test("designer API cannot display incomplete calculations or incompatible drafts",()=>{
  assert.equal(validateResponse("designer/preview",evaluation()).summary.plants,0);
  for(const change of [e=>delete e.reasons,e=>delete e.summary.plant_cost,e=>e.draft.version=2,e=>e.width=0,e=>e.instances=null]){
    const e=evaluation();change(e);assert.throws(()=>validateResponse("designer/preview",e));
  }
});

test("designer save requires an explicit successful receipt and revision",()=>{
  assert.deepEqual(validateResponse("designer/save",{saved:true,design_revision:3}),{saved:true,design_revision:3});
  assert.throws(()=>validateResponse("designer/save",{saved:false,design_revision:3}));
  assert.throws(()=>validateResponse("designer/save",{saved:true}));
});
