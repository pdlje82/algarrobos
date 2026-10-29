import test from "node:test";
import assert from "node:assert/strict";
import {validateResponse} from "../src/contracts.js";
import {plantOrderRows} from "../src/plantOrderList.js";
import {plantNames,plantSearchText} from "../src/plantNames.js";

test("planning order rows use the captured draft prices, not another saved alternative",()=>{
 const committed={status:"planned",legacy:false,planting:{entries:[{id:"carob",label:"Carob",custom:false,quantity:7,unit_cost:6,price_confirmed:false}]}};
 const planning={saved:true,committed:false,planting:{entries:[{id:"custom-a",label:"Mi planta",custom:true,quantity:2,unit_cost:0,price_confirmed:true},{id:"holm_oak",label:"Holm oak",custom:false,quantity:1,unit_cost:8.17,price_confirmed:false}]}};
 assert.deepEqual(plantOrderRows(committed,planning).rows.map(p=>[p.label,p.quantity,p.unit_cost]),[["Encina / Carrasca",1,8.17],["Mi planta",2,0]]);
 assert.equal(committed.planting.entries[0].quantity,7);
 assert.equal(plantOrderRows(committed,{saved:false}).rows[0].id,"carob");
 assert.equal(plantOrderRows({status:"Not planned"},{saved:true,planting:null}).state,"empty");
 assert.equal(plantOrderRows({status:"planned",legacy:true},{saved:true,planting:null}).state,"unavailable");
});

test("planning contracts reject absent revisions and incomplete handoff responses",()=>{
 const p={project_revision:2,planning_revision:1,draft:{version:1,inputs:{},source:null},saved:true,committed:false,planting:null,available:false,reason:"Locked"};
 assert.equal(validateResponse("demonstrator/draft",p),p);
 for(const key of ["draft","planning_revision","available","planting"]){const bad=structuredClone(p);delete bad[key];assert.throws(()=>validateResponse("demonstrator/draft",bad));}
 assert.throws(()=>validateResponse("designer/handoff-preview",{planning:p,previous:{}}),/notice/);
});

test("Encina and Carrasca identify the same unchanged oak",()=>{
 assert.equal(plantNames("holm_oak").spanish,"Encina / Carrasca");
 assert.equal(plantNames("holm_oak").scientific,"Quercus rotundifolia");
 for(const query of ["encina","carrasca","quercus rotundifolia"])assert.ok(plantSearchText("holm_oak").includes(query));
 assert.equal(plantNames("kermes_oak").scientific,"Quercus coccifera");
 assert.equal(plantNames("cork_oak").scientific,"Quercus suber");
});
