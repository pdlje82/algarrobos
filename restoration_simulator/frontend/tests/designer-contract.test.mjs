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

function currentEvaluation(){
  const e=evaluation();e.draft={version:2,bundle:{manifest:{version:2}},preferences:{},dismissed:{},legacy_exclusions:[],dimensions:{},displaced:{},area_density_update:null};
  e.summary.shrub_density=0;e.summary.overall_density=0;
  e.species=[{id:"carob",requested_density:10,effective_density:0,density_step:50,quantity:0,entry:{id:"carob",quantity:0,unit_cost:6,price_confirmed:false}}];
  e.overlays={carob:{root_ball:null,crown:null}};e.density_update=null;e.message="";return e;
}

test("density contracts preserve zero counts and explicit dimension gaps",()=>{
  const e=currentEvaluation();assert.equal(validateResponse("designer/preview",e).species[0].quantity,0);
  for(const change of [e=>delete e.overlays.carob.root_ball,e=>delete e.species[0].effective_density,e=>e.species[0].quantity=0.2,e=>delete e.draft.dismissed,e=>delete e.summary.overall_density,e=>e.overlays.carob.crown={diameter_m:[4,-8],kind:"range",evidence:"guidance",source:"https://example.org",section:"Size",context:"Test"}]){
    const broken=currentEvaluation();change(broken);assert.throws(()=>validateResponse("designer/preview",broken));
  }
});
