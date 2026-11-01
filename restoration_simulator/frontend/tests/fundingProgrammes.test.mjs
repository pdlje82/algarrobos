import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateProgrammesResponse,programmeForRoute,programmeMembers,validateProgrammeMembership,routeQuestionScope,visibleRouteQuestions,routeCoverage,programmeConditions} from '../src/fundingProgrammeState.js';
import {selectionGraphLayout} from '../src/fundingSelectionState.js';
const config=JSON.parse(readFileSync(new URL('../../scenarios/funding-programmes-v1.json',import.meta.url)));
const guides=JSON.parse(readFileSync(new URL('../../scenarios/funding-guides-v1.json',import.meta.url)));
const catalogue=JSON.parse(readFileSync(new URL('../../scenarios/funding.json',import.meta.url)));
const sources={...guides.sources,...config.extra_sources};
const programmes=config.programmes.map(p=>{const g=p.guide_id===null?p.introduction:guides.guides[p.guide_id];return {...p,guide:{...g,sources:g.source_ids.map(id=>sources[id])}};});
const value={version:1,library_hash:'a'.repeat(64),library:{version:1,checked_on:config.checked_on,defaults:config.defaults,families:catalogue.groups,programmes}};
test('programme membership is complete, explicit, source-cited and compatible with smaller historical catalogues',()=>{
  assert.equal(validateProgrammesResponse(value),value);validateProgrammeMembership(value,catalogue);
  assert.equal(programmeForRoute(value,'LEADER-AL20-3.4').entry_ids.length,12);
  assert.equal(programmeForRoute(value,'EU-LIFE-NATURE').entry_ids.length,4);
  assert.equal(programmeForRoute(value,'EU-MISSION-SOIL').entry_ids.length,6);
  assert.deepEqual(programmeMembers(programmeForRoute(value,'SELF-FUNDS'),{entries:[]}),[]);
  assert.throws(()=>validateProgrammeMembership(value,{entries:[{id:'unknown'}]}),/No programme membership/);
  for(const mutate of [d=>d.version=2,d=>d.library.checked_on='2026-02-30',d=>delete d.library.defaults.show_met,d=>d.library.programmes[0].entry_ids.push('SELF-FUNDS'),d=>d.library.programmes[0].guide.sources=[],d=>d.library.programmes[0].kind='invented']){
    const bad=structuredClone(value);mutate(bad);assert.throws(()=>validateProgrammesResponse(bad),/Incompatible/);
  }
});
test('route dependencies include composite inputs and comparison is their union; mixed and unknown requirements stay visible',()=>{
  const questions=['shared','income','smi','other','cost','unrelated'].map(id=>({id}));
  const conditions=[{option_id:'A',fields:['shared'],effect:'eligibility',result:'pass'},{option_id:'A',fields:['income','smi'],effect:'eligibility',result:'unknown'},{option_id:'B',fields:['shared'],effect:'eligibility',result:'fail'},{option_id:'B',fields:['other'],effect:'eligibility',result:'unknown'},{option_id:'A',fields:['cost'],effect:'amount',result:'unknown'}];
  assert.deepEqual(routeQuestionScope(questions,conditions,[],false).all,[]);
  const a=routeQuestionScope(questions,conditions,['A'],false);assert.deepEqual(a.all.map(q=>q.id),['shared','income','smi']);assert.deepEqual(a.met.map(q=>q.id),['shared']);
  const both=routeQuestionScope(questions,conditions,['A','B'],false);assert.equal(both.met.length,0);assert.deepEqual(both.attention.map(q=>q.id),['shared','income','smi','other']);
  assert.deepEqual(routeQuestionScope(questions,conditions,['A'],true).all.map(q=>q.id),['shared','income','smi','cost']);
  assert.deepEqual(routeCoverage(conditions,'A'),{fit:true,amount:true});assert.deepEqual(routeCoverage(conditions,'guide-only'),{fit:false,amount:false});
  assert.throws(()=>routeQuestionScope([],conditions,['A'],false),/dependencies are incomplete/);
  const cash={option_id:'SELF-FUNDS',fields:['available_contribution'],effect:'eligibility',result:'unknown'};
  const displayed=programmeConditions([cash],catalogue);assert.equal(displayed[0].effect,'amount');assert.equal(cash.effect,'eligibility');
  assert.deepEqual(routeCoverage(displayed,'SELF-FUNDS'),{fit:false,amount:true});
  assert.throws(()=>programmeConditions([{...cash,fields:['unsupported']}],catalogue),/Unsupported existing-cash/);
});
test('met requirements collapse only after editing; expanded met group follows attention nodes without losing annex layout',()=>{
  const all=['first','second','third'].map(id=>({id})),scope={all,attention:[all[2]],met:all.slice(0,2)};
  assert.deepEqual(visibleRouteQuestions(scope,{showMet:false,heldIds:['first','second','third'],pinnedIds:[]}),all);
  assert.deepEqual(visibleRouteQuestions(scope,{showMet:false,heldIds:[],pinnedIds:[]}),[all[2]]);
  const expanded=visibleRouteQuestions(scope,{showMet:true,heldIds:[],pinnedIds:[]});assert.deepEqual(expanded,[all[2],all[0],all[1]]);
  const layout=selectionGraphLayout(expanded,{open:false},{ids:['first','second']});assert.equal(layout.metHeaderTop,176);assert.equal(layout.tops.get('first'),256);
});
