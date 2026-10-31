import test from "node:test";
import assert from "node:assert/strict";
import {DEFAULT_FUNDING_COLUMNS,fundingColumns,resizeFundingColumn,placeFundingEditor,constrainFundingEditor,fundingEditorContextShift} from "../src/fundingLayout.js";

test("graph dividers preserve usable columns and relative sizes across viewports",()=>{
  for(const width of [800,960,1428,1848]){
    for(const index of [0,1])for(const x of [-200,0,350,1000,width+200]){
      const splits=resizeFundingColumn(width,DEFAULT_FUNDING_COLUMNS,index,x),layout=fundingColumns(width,splits);
      assert(layout.originWidth>=134-1e-6&&layout.circumstanceWidth>=200-1e-6&&layout.optionWidth>=244-1e-6);
      assert(Math.abs(layout.optionLeft+layout.optionWidth-(width-16))<1e-6);
      const other=1-index;assert(Math.abs(layout.dividers[other]-fundingColumns(width,DEFAULT_FUNDING_COLUMNS).dividers[other])<1e-6);
    }
    const custom=resizeFundingColumn(width,DEFAULT_FUNDING_COLUMNS,0,190);
    for(const narrower of [800,960]){
      const layout=fundingColumns(narrower,custom);assert(layout.circumstanceWidth>=200-1e-6&&layout.optionWidth>=244-1e-6);
    }
  }
  assert.throws(()=>fundingColumns(600,DEFAULT_FUNDING_COLUMNS));assert.throws(()=>fundingColumns(1000,[.6,.2]));assert.throws(()=>resizeFundingColumn(1000,DEFAULT_FUNDING_COLUMNS,2,500));
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
