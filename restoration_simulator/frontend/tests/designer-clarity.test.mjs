import test from "node:test";
import assert from "node:assert/strict";
import { designerHelp, validateDesignerHelp, helpFor } from "../src/designerHelp.js";
import { initialCrownEditor, sameCrownEditor, validCrownEditor } from "../src/dimensionEditor.js";
import { plantOrderRows } from "../src/plantOrderList.js";

test("presentation help covers saved rule identities without rewriting their evidence",()=>{
  assert.equal(helpFor("rules","pocket").feature,"pocket");
  assert.match(designerHelp.features.pocket.states.independent,/no longer follows/);
  assert.match(designerHelp.features.density.example,/Seven trees on 200 m²/);
  assert.deepEqual(designerHelp.rules.autumn.sections.map(s=>s.title),["When to plant","Choosing young plants"]);
  const guidance=JSON.stringify(designerHelp.rules.autumn);
  for(const fact of [/November–March/,/una savia/i,/seed-grown/,/ungrafted/,/0.2–0.3 L/,/1–2 L/,/Níjar/,/hardened/])assert.match(guidance,fact);
  for(const mutate of [v=>delete v.rules.autumn,v=>delete v.features.pocket.states.unplaced,v=>delete v.combinations.lentisk_series,v=>v.rules.layout.feature="missing",v=>v.rules.autumn.sections[0].paragraphs=[]]){
    const broken=structuredClone(designerHelp);mutate(broken);assert.throws(()=>validateDesignerHelp(broken),/Invalid designer help/);
  }
  assert.throws(()=>helpFor("rules","unregistered"),/unavailable/);
});

test("diameter editor uses effective values, preserves notes, and leaves historical ranges empty",()=>{
  const facts={value:10,basis:"assumption",note:""};
  const input=initialCrownEditor(facts);
  assert.deepEqual(input,{diameter:"10",basis:"assumption",note:""});
  assert.equal(sameCrownEditor(input,initialCrownEditor(facts)),true);
  assert.equal(validCrownEditor(input),true);
  assert.deepEqual(initialCrownEditor({value:8,basis:"measured",note:"Tape measure"}),{diameter:"8",basis:"measured",note:"Tape measure"});
  assert.equal(initialCrownEditor({value:null,basis:"assumption",note:""}).diameter,"");
  for(const diameter of ["","0","-1","201","NaN","Infinity"])assert.equal(validCrownEditor({...input,diameter}),false);
  assert.equal(sameCrownEditor({...input,note:"Changed"},input),false);
});

test("order rows preserve applied purchasing prices and quantities; alternatives are not inputs",()=>{
  const plants=[{id:"custom-a",label:"Z custom",custom:true,quantity:12,unit_cost:0,price_confirmed:true},{id:"carob",label:"Carob",custom:false,quantity:7,unit_cost:6.41,price_confirmed:false}];
  const applied={status:"planned",legacy:false,planting:{entries:plants}};
  const before=JSON.stringify(applied);
  const list=plantOrderRows(applied);
  assert.deepEqual(list.rows.map(p=>[p.label,p.unit_cost,p.quantity]),[["Algarrobo",6.41,7],["Z custom",0,12]]);
  assert.equal(JSON.stringify(applied),before);
  assert.equal(list.rows[0].price_confirmed,false);
  assert.equal(plantOrderRows({status:"Not planned"}).state,"empty");
  assert.equal(plantOrderRows({status:"planned",legacy:true}).state,"unavailable");
  assert.equal(plantOrderRows({status:"planned",legacy:false,planting:null}).state,"unavailable");
  assert.throws(()=>plantOrderRows({status:"planned",legacy:false}),/missing/);
  for(const field of ["quantity","unit_cost","price_confirmed"]){const broken=structuredClone(applied);delete broken.planting.entries[0][field];assert.throws(()=>plantOrderRows(broken),/incomplete/);}
});
