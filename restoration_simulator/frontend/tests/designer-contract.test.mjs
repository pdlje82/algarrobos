import test from "node:test";
import assert from "node:assert/strict";
import { validateResponse } from "../src/contracts.js";

const evaluation = () => ({
  draft:{version:1,bundle:{manifest:{version:1}}},width:10,height:20,
  features:{catchment:null},instances:[],rules:[],issues:[],removed:[],reasons:[],ruleset_hash:"snapshot",
  display:{version:1,density_defaults:null,crown_editors:{},plants:{},unplaced:[],pocket:{enabled:false,supported_count:1,species:"holm_oak",name:"Holm oak",example_id:null,state:"off",plotted:false,moves_with_pocket:false,quantity:0,extra_quantity:0,radius:2,crown_diameter:null,crown_range:null}},
  summary:{plants:0,trees:0,shrubs:0,placed:0,unplaced:0,tree_density:0,carob_density:0,plant_cost:0}
});

test("designer API cannot display incomplete calculations or incompatible drafts",()=>{
  assert.equal(validateResponse("designer/preview",evaluation()).summary.plants,0);
  for(const change of [e=>delete e.display,e=>delete e.display.pocket.radius,e=>e.display.pocket.state="guessed",e=>e.display.pocket.extra_quantity=3,e=>delete e.reasons,e=>delete e.summary.plant_cost,e=>e.draft.version=2,e=>e.width=0,e=>e.instances=null]){
    const e=evaluation();change(e);assert.throws(()=>validateResponse("designer/preview",e));
  }
});

function workspace(){return {evaluation:evaluation(),fields:[],catalogue:{},design_revision:3,project_revision:1,available:true,reason:"",saved:false,can_import:false,rules_update_available:false,library:[],active_design_id:null,suggested_name:"Design 1",library_defaults:{version:1,name_limit:80,migrated_name:"Current design",name_prefix:"Design",unnamed_label:"Unsaved design",unlinked_label:"Unlinked"}};}

test("library mutations require a complete canonical workspace and active identity",()=>{
  assert.equal(validateResponse("designer/save",workspace()).design_revision,3);
  assert.equal(validateResponse("designer/library",workspace()).active_design_id,null);
  assert.throws(()=>validateResponse("designer/save",{saved:true,design_revision:3}));
  for(const change of [w=>delete w.library,w=>w.active_design_id="missing",w=>w.saved=true,w=>delete w.suggested_name,w=>w.library=[{id:"a",name:"One",area:200,plants:-1}],w=>w.library_defaults.name_limit=0]){
    const w=workspace();change(w);assert.throws(()=>validateResponse("designer",w));
  }
});

function currentEvaluation(){
  const e=evaluation();e.draft={version:2,bundle:{manifest:{version:2}},preferences:{},dismissed:{},legacy_exclusions:[],dimensions:{},displaced:{},area_density_update:null};
  e.summary.shrub_density=0;e.summary.overall_density=0;
  e.species=[{id:"carob",requested_density:10,effective_density:0,density_step:50,quantity:0,entry:{id:"carob",quantity:0,unit_cost:6,price_confirmed:false}}];
  e.overlays={carob:{root_ball:null,crown:null}};e.density_update=null;e.message="";
  e.display.crown_editors.carob={value:null,range:null,default_value:null,basis:"assumption",note:"",has_override:false,editable:false};return e;
}

test("density contracts preserve zero counts and explicit dimension gaps",()=>{
  const e=currentEvaluation();assert.equal(validateResponse("designer/preview",e).species[0].quantity,0);
  for(const change of [e=>delete e.display.crown_editors.carob,e=>delete e.overlays.carob.root_ball,e=>delete e.species[0].effective_density,e=>e.species[0].quantity=0.2,e=>delete e.draft.dismissed,e=>delete e.summary.overall_density,e=>e.overlays.carob.crown={diameter_m:[4,-8],kind:"range",evidence:"guidance",source:"https://example.org",section:"Size",context:"Test"}]){
    const broken=currentEvaluation();change(broken);assert.throws(()=>validateResponse("designer/preview",broken));
  }
});

function placementEvaluation(){
  const e=currentEvaluation();e.draft.version=3;e.draft.bundle.manifest.version=3;
  Object.assign(e.draft,{associations:{},placement_preferences:{},placement_seed:0,placement_seen:[],placement_notes:{}});
  e.placement={categories:{carob:"independent"},associations:{},warnings:[],unplaced:[],minimum_clearance:1};
  const overlay={diameter_m:[6,6],kind:"typical",evidence:"assumption",source:null,section:"Drawing",context:"Explicit illustrative diameter"};
  e.overlays.carob.crown=overlay;Object.assign(e.display.crown_editors.carob,{value:6,range:[6,6],default_value:6,editable:true});return e;
}

test("v3 requires explicit representative diameters, placement categories and associations",()=>{
  assert.equal(validateResponse("designer/preview",placementEvaluation()).draft.version,3);
  for(const change of [e=>delete e.placement,e=>delete e.draft.placement_seed,e=>delete e.placement.categories.carob,e=>e.overlays.carob.crown=null,e=>e.overlays.carob.crown.diameter_m=[4,8]]){
    const e=placementEvaluation();change(e);assert.throws(()=>validateResponse("designer/preview",e));
  }
});
