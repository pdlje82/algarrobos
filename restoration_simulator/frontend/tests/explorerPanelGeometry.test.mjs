import test from 'node:test';
import assert from 'node:assert/strict';
import {constrainInspector,resizedInspector} from '../src/explorerPanelGeometry.js';
const frame={width:1400,height:1000},size={width:380,height:500};
test('automatic size is distinct from a user-selected height and movement stays within the graph',()=>{
  const initial={left:1300,top:-20,height:null},before=structuredClone(initial),p=constrainInspector(initial,size,frame,120);
  assert.equal(p.height,null);assert.equal(p.left,1012);assert.equal(p.top,120);assert.equal(p.maxHeight,640);assert.deepEqual(initial,before);
  const manual=constrainInspector({left:800,top:900,height:720},size,frame,120);assert.equal(manual.height,720);assert(manual.top+manual.height<=frame.height-8);assert(manual.maxHeight>=manual.height);
});
test('bottom resizing anchors the top and allows growth beyond the automatic cap',()=>{
  const initial={left:800,top:150,height:500},before=structuredClone(initial),p=resizedInspector(initial,240,frame);
  assert.deepEqual(p,{left:800,top:150,height:740,maxHeight:842});assert.deepEqual(initial,before);
  assert.equal(resizedInspector(initial,9999,frame).height,842);assert.equal(resizedInspector(initial,-9999,frame).height,180);
});
test('manual geometry reflows after viewport shrink and rejects malformed values',()=>{
  const p=constrainInspector({left:1100,top:300,height:800},size,{width:900,height:600},100);
  assert.equal(p.left,512);assert.equal(p.top,100);assert.equal(p.height,492);
  assert.throws(()=>constrainInspector({left:0,top:0,height:undefined},size,frame,100),/Invalid/);
  assert.throws(()=>resizedInspector({left:0,top:0,height:200},NaN,frame),/Invalid/);
});
