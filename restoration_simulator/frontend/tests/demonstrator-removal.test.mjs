import test from "node:test";
import assert from "node:assert/strict";
import {validateResponse} from "../src/contracts.js";

const preview={revision:3,title:"Remove demonstrator",name:"Finca",can_remove:true,blocked_reason:null,removed_actions:[{title:"Plan the demonstrator",year:0,reason:"Belongs to the removed demonstrator."}],remaining_actions:1,remaining_parcels:1,cash_before:60000,cash_after:60000,cash_change:0,year_before:0,year_after:0,explanation:"Remove committed choices",undo_notice:"Undo restores committed records",preserved_designs:2,removed_applied_snapshots:1,planning_preserved:true};
test("removal preview requires explicit dependency, preservation and cost facts",()=>{
 assert.equal(validateResponse("demonstrator/removal-preview",preview),preview);
 for(const key of ["can_remove","blocked_reason","planning_preserved","preserved_designs","removed_actions"]){const bad=structuredClone(preview);delete bad[key];assert.throws(()=>validateResponse("demonstrator/removal-preview",bad));}
 for(const mutate of [v=>v.cash_after=NaN,v=>v.remaining_parcels=-1,v=>v.removed_actions[0].year="0",v=>v.can_remove=false]){const bad=structuredClone(preview);mutate(bad);assert.throws(()=>validateResponse("demonstrator/removal-preview",bad));}
 const blocked={...preview,can_remove:false,blocked_reason:"Resolve dependent land first"};assert.equal(validateResponse("demonstrator/removal-preview",blocked),blocked);
});
