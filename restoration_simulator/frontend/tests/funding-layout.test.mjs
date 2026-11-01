import test from "node:test";
import assert from "node:assert/strict";
import {DEFAULT_FUNDING_COLUMNS,fundingColumns,fundingViewport,fundingWindowOffset,fundingWindowStart,resizeFundingColumn,placeFundingEditor,constrainFundingEditor,fundingEditorContextShift} from "../src/fundingLayout.js";

test("four columns keep readable minima and slide in consistent windows",()=>{
  for(const preference of ["auto","3","4"])for(const width of [224,276,390,639,640,800,899,900,1000,1080,1428,1848]){
    let splits=DEFAULT_FUNDING_COLUMNS;
    for(const index of [0,1,2])for(const x of [-200,0,350,1000,width*4]){
      const before=fundingViewport(width,preference,splits);
      const next=resizeFundingColumn(width,splits,index,x,preference),layout=fundingViewport(width,preference,next);
      assert.equal(layout.columns.length,4);
      assert(layout.columns.every(c=>c.width>=156-1e-6));
      for(let start=0;start<=layout.maxStart;start++){
        assert(layout.points[start+layout.count]-layout.points[start]<=width+1e-6);
        assert.equal(fundingWindowStart(layout,fundingWindowOffset(layout,start)),start);
      }
      assert(layout.limits.every(([a,b])=>a<=b+1e-6));
      for(const other of [0,1,2].filter(i=>i!==index))assert(Math.abs(layout.dividers[other]-before.dividers[other])<1e-6);
      splits=next;
    }
    // Custom widths reflow explicitly on smaller viewports without hiding nodes.
    const narrow=fundingViewport(640,preference,splits);
    assert(narrow.columns.every(c=>c.width>=156-1e-6));
    assert(narrow.points[2]-narrow.points[0]<=640+1e-6);
  }
  assert.equal(fundingViewport(1400,"auto",DEFAULT_FUNDING_COLUMNS).count,4);
  assert.equal(fundingViewport(1400,"3",DEFAULT_FUNDING_COLUMNS).count,3);
  assert.equal(fundingViewport(800,"4",DEFAULT_FUNDING_COLUMNS).count,2);
  assert.equal(fundingViewport(390,"auto",DEFAULT_FUNDING_COLUMNS).count,1);
  assert.throws(()=>fundingColumns(600,DEFAULT_FUNDING_COLUMNS));assert.throws(()=>fundingColumns(1400,[.6,.2,.8]));
  assert.throws(()=>fundingViewport(200,"auto",DEFAULT_FUNDING_COLUMNS));assert.throws(()=>fundingViewport(1200,"2",DEFAULT_FUNDING_COLUMNS));
  assert.throws(()=>resizeFundingColumn(1400,DEFAULT_FUNDING_COLUMNS,3,500));
});
test("non-graph answer editors start beside desktop triggers, fit phones, and remain reachable after moving or resizing",()=>{
  const anchor={left:300,right:650,top:240,bottom:364},size={width:560,height:410};
  assert.deepEqual(placeFundingEditor(anchor,size,{width:1500,height:1000}),{left:662,top:240});
  assert.deepEqual(placeFundingEditor({...anchor,right:1400,top:950},size,{width:1500,height:1000}),{left:932,top:582});
  assert.deepEqual(placeFundingEditor(anchor,{width:374,height:610},{width:390,height:844}),{left:8,top:226});
  assert.deepEqual(constrainFundingEditor({left:-500,top:5000},size,{width:1024,height:768}),{left:8,top:350});
});

test("graph editors stay below their two-node context and scroll their body rather than covering connections",()=>{
  const size={width:560,height:450},viewport={width:1500,height:1000};
  assert.deepEqual(placeFundingEditor({placement:"below",right:760,top:376,bottom:632},size,viewport),{left:200,top:644,maxHeight:348});
  assert.deepEqual(placeFundingEditor({placement:"below",right:420,top:500,bottom:756},size,viewport),{left:8,top:768,maxHeight:224});
  assert.equal(fundingEditorContextShift({top:376,bottom:632},viewport,280),0);
  assert.equal(fundingEditorContextShift({top:508,bottom:764},viewport,280),64);
  assert.equal(fundingEditorContextShift({top:508,bottom:764},viewport,450),234);
  const short={width:1280,height:540};
  assert.equal(fundingEditorContextShift({top:8,bottom:264},short,450),0);
  assert.deepEqual(constrainFundingEditor({left:200,top:644,maxHeight:348},{width:560,height:348},viewport),{left:200,top:644,maxHeight:348});
  // The narrow-screen editor retains its bottom-sheet placement.
  assert.deepEqual(placeFundingEditor({placement:"below",right:760,bottom:632},{width:374,height:610},{width:390,height:844}),{left:8,top:226});
});
