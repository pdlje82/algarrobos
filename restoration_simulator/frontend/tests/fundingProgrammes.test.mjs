import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {validateProgrammesResponse,programmeForRoute,programmeMembers,validateProgrammeMembership,routeQuestionScope,visibleRouteQuestions,routeCoverage,programmeConditions} from '../src/fundingProgrammeState.js';
import {selectionGraphLayout} from '../src/fundingSelectionState.js';
import {programmeNodeLayout} from '../src/fundingProgrammeNodes.js';
import {graphConnection,connectionAtX,fundingContinuations,fundingGraphConnections} from '../src/fundingGraphConnections.js';
import {fundingViewport,DEFAULT_FUNDING_COLUMNS} from '../src/fundingLayout.js';
const config=JSON.parse(readFileSync(new URL('../../scenarios/funding-programmes-v1.json',import.meta.url)));
const guides=JSON.parse(readFileSync(new URL('../../scenarios/funding-guides-v1.json',import.meta.url)));
const catalogue=JSON.parse(readFileSync(new URL('../../scenarios/funding.json',import.meta.url)));
const sources={...guides.sources,...config.extra_sources};
const programmes=config.programmes.map(p=>{const g=p.guide_id===null?p.introduction:guides.guides[p.guide_id];return {...p,guide:{...g,sources:g.source_ids.map(id=>sources[id])}};});
const value={version:1,library_hash:'a'.repeat(64),library:{version:1,checked_on:config.checked_on,defaults:config.defaults,families:catalogue.groups,programmes}};
test('programme nodes expose six families, search, pinned selection and historical membership',()=>{
  const settings={browse:false,search:'',expandedFamilies:[]};
  const fresh=programmeNodeLayout(value,catalogue,null,settings);assert.equal(fresh.rows.length,6);assert(fresh.rows.every(r=>r.kind==='family'));
  const selected=programmeNodeLayout(value,catalogue,'LEADER-AL20',settings);assert.deepEqual(selected.rows.map(r=>r.kind),['programme','browse']);assert.equal(selected.rows[0].top,44);
  const search=programmeNodeLayout(value,catalogue,'LEADER-AL20',{...settings,browse:true,search:'LEADER'});assert.equal(search.rows.filter(r=>r.key==='programme:LEADER-AL20').length,1);
  const all=programmeNodeLayout(value,catalogue,null,{...settings,expandedFamilies:Object.keys(catalogue.groups)});assert.equal(all.rows.filter(r=>r.kind==='programme').length,80);
  assert(all.rows.every((r,i)=>i===0||r.top>=all.rows[i-1].top+all.rows[i-1].height));
  const none=programmeNodeLayout(value,catalogue,null,{...settings,search:'unknown fixture'});assert.equal(none.rows[0].kind,'empty');
  assert.throws(()=>programmeNodeLayout(value,catalogue,'unknown',settings),/absent/);
  assert.deepEqual(programmeNodeLayout(null,catalogue,null,settings).rows,[]);
});
test('continuations intersect actual SVG paths and preserve their status and destination',()=>{
  const edge=graphConnection('test',2,3,{x:100,y:100},{x:500,y:300},'fail','A → B');
  assert(Math.abs(connectionAtX(edge,300)-200)<1e-6);assert.equal(connectionAtX(edge,50),null);
  const markers=fundingContinuations([edge],{left:200,top:0,width:200,height:500});assert.equal(markers.length,2);
  assert.deepEqual(markers.map(m=>[m.side,m.column,m.count,m.statuses]),[['left',2,1,['fail']],['right',3,1,['fail']]]);
  assert(markers.every(m=>m.details==='A → B'));assert.deepEqual(fundingContinuations([edge],{left:0,top:0,width:600,height:500}),[]);
  assert.deepEqual(fundingContinuations([edge],{left:200,top:400,width:200,height:500}),[]);
  assert.throws(()=>fundingContinuations([],{left:0,top:0,width:0,height:10}),/bounds/);
  assert.throws(()=>graphConnection('bad',2,3,{x:NaN,y:100},{x:500,y:300},'fail','invalid'),/Invalid funding connection geometry/);
  const layout=fundingViewport(1500,'auto',DEFAULT_FUNDING_COLUMNS),p=programmes.find(p=>p.id==='LEADER-AL20');
  const rows=programmeNodeLayout(value,catalogue,p.id,{browse:false,search:'',expandedFamilies:[]}).rows;
  const args={columns:layout.columns,programmeRows:rows,programme:p,questions:[{id:'q',label:'Question'}],questionY:()=>92,options:[{id:'LEADER-AL20-3.1'}],conditions:[],showAmount:false,workingOption:null,comparing:false,currentField:null};
  const edges=fundingGraphConnections(args);assert.equal(edges.length,3);assert(edges.some(e=>e.id==='membership:LEADER-AL20-3.1'&&e.status==='neutral'&&e.label.includes('Reference guide only')));
  const empty=fundingGraphConnections({...args,programme:null,questions:[],options:[]});assert.equal(empty.length,1);assert(empty.every(e=>e.from===0&&e.to===1));
});
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
