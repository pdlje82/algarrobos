import test from "node:test";
import assert from "node:assert/strict";
import reference from "../../scenarios/plant-names.json" with {type:"json"};
import { validatePlantNames, plantNames, displayCatalogue, plantSearchText, plantPresentation, plantText } from "../src/plantNames.js";
import { applyReadiness } from "../src/applyReadiness.js";

test("all 23 names are explicit, missing German names remain gaps, and identities are preserved",()=>{
  assert.equal(validatePlantNames(reference).plants.length,23);
  assert.equal(plantNames("carob").spanish,"Algarrobo");assert.equal(plantNames("carob").german,"Johannisbrotbaum");
  assert.equal(plantNames("thyme").german,null);assert.equal(plantNames("thyme").german_status,"not_established");
  assert.equal(plantNames("tamarix").scientific,"Tamarix spp.");
  assert.ok(plantSearchText("carob").includes("johannisbrotbaum"));assert.ok(plantSearchText("holm_oak").includes("carrasca"));
  const input={plants:[{id:"lentisk",label:"Lentisk"},{id:"carob",label:"Carob"},{id:"custom-a",label:"My shrub"}]};
  assert.deepEqual(displayCatalogue(input).plants.map(p=>p.label),["Algarrobo","Lentisco","My shrub"]);assert.equal(input.plants[0].label,"Lentisk");
  for(const mutate of [v=>v.plants.pop(),v=>v.plants.push(v.plants[0]),v=>v.plants[0].german=null,v=>v.plants[0].references=[],v=>delete v.plants[0].scientific]){const value=structuredClone(reference);mutate(value);assert.throws(()=>validatePlantNames(value));}
  const original={id:"carob",text:"Carob and lentisk",source:{title:"Carob handbook",url:"https://example.com/carob"},quote:"Carob",image:"/plants/carob.png"};
  assert.deepEqual(plantPresentation(original),{...original,text:"Algarrobo and lentisco"});
  assert.equal(plantText("Oleander: Nerium oleander; carob: Ceratonia siliqua"),"Adelfa: Nerium oleander; algarrobo: Ceratonia siliqua");
});

const ready={busy:false,stale:false,available:true,reason:null,saved:true,dirty:false,failedEdit:false,error:"",pendingRules:false,plantInputs:false,diameterInputs:false,plants:20,parcel:"parcel-1"};
test("Apply explanations and enablement share every blocker, without new advisory gates",()=>{
  assert.equal(applyReadiness(ready).canApply,true);
  for(const [patch,id] of [[{busy:true},"busy"],[{stale:true},"stale"],[{available:false,reason:"Submitted plan is locked"},"unavailable"],[{saved:false},"save"],[{dirty:true},"save"],[{failedEdit:true},"failed"],[{error:"Offline"},"failed"],[{pendingRules:true},"rules"],[{plantInputs:true},"inputs"],[{diameterInputs:true},"diameter"],[{plants:0},"plants"],[{parcel:null},"parcel"]]){
    const result=applyReadiness({...ready,...patch});assert.equal(result.canApply,false);assert.ok(result.reasons.some(r=>r.id===id));
  }
  const combined=applyReadiness({...ready,parcel:null,dirty:true,diameterInputs:true});
  assert.deepEqual(combined.reasons.map(r=>r.id),["diameter","parcel","save"]);assert.equal(combined.reasons.at(-1).action,null);
  assert.throws(()=>applyReadiness({...ready,available:false,reason:null}),/Python must explain/);
  assert.throws(()=>applyReadiness({...ready,saved:undefined}),/Missing Apply/);
  assert.equal(applyReadiness({...ready,unplaced:20,pricesConfirmed:false,waterPlan:"unknown"}).canApply,true);
});
