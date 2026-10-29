import test from "node:test";
import assert from "node:assert/strict";
import { validateInteractions, keyboardPosition, locatedPlantCounts } from "../src/designerInteractions.js";
import { createEditQueue, sameCrownEditor } from "../src/dimensionEditor.js";

test("keyboard increments are configured, bounded, and independent of viewport zoom",()=>{
  assert.deepEqual(keyboardPosition({x:2,y:3},"ArrowRight",false,10,8),{x:2.1,y:3});
  assert.deepEqual(keyboardPosition({x:2,y:3},"ArrowUp",true,10,8),{x:2,y:2});
  assert.deepEqual(keyboardPosition({x:9.9,y:0},"ArrowRight",true,10,8),{x:10,y:0});
  assert.deepEqual(keyboardPosition({x:0,y:0},"ArrowUp",false,10,8),{x:0,y:0});
  for(const broken of [null,{version:2},{version:1,keyboard_step_m:0,keyboard_large_step_m:1},{version:1,keyboard_step_m:1,keyboard_large_step_m:.1}])assert.throws(()=>validateInteractions(broken));
  assert.throws(()=>keyboardPosition({x:1,y:1},"PageUp",false,10,8),/Unsupported/);
});

test("locating reports purchasing instances without inventing positions",()=>{
  const evaluation={instances:[{species:"carob"},{species:"carob"},{species:"custom-a"}],draft:{selection:{entries:[{id:"carob",quantity:7},{id:"custom-a",quantity:1},{id:"lentisk",quantity:3}]}}};
  assert.deepEqual(locatedPlantCounts(evaluation,"carob"),{placed:2,unplaced:5});
  assert.deepEqual(locatedPlantCounts(evaluation,"custom-a"),{placed:1,unplaced:0});
  assert.deepEqual(locatedPlantCounts(evaluation,"lentisk"),{placed:0,unplaced:3});
  assert.deepEqual(locatedPlantCounts(evaluation,"unchecked"),{placed:0,unplaced:0});
  assert.throws(()=>locatedPlantCounts({...evaluation,draft:{selection:{entries:[]}}},"carob"),/exceeds/);
});

test("completed edits serialize, retain order and recover after failure",async()=>{
  const queue=createEditQueue(),calls=[];
  let release;
  const barrier=new Promise(resolve=>{release=resolve;});
  const first=queue(async()=>{calls.push("start 1");await barrier;calls.push("end 1");return 1;});
  const second=queue(async()=>{calls.push("start 2");throw Error("Request failed");});
  const checked=assert.rejects(second,/Request failed/);
  const third=queue(async()=>{calls.push("start 3");return 3;});
  await Promise.resolve();assert.deepEqual(calls,["start 1"]);
  release();assert.equal(await first,1);await checked;assert.equal(await third,3);
  assert.deepEqual(calls,["start 1","end 1","start 2","start 3"]);
  assert.equal(sameCrownEditor({diameter:"6.0",basis:"assumption",note:""},{diameter:"6",basis:"assumption",note:""}),true);
  assert.equal(sameCrownEditor({diameter:"",basis:"assumption",note:""},{diameter:"0",basis:"assumption",note:""}),false);
});
