import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import pilot from '../../knowledge/connected-pilot-v1.json' with {type:'json'};
import registry from '../../knowledge/citations-v1.json' with {type:'json'};
import documents from '../../scenarios/documents.json' with {type:'json'};
import researchData from '../../scenarios/drone-irrigator-research-v1.json' with {type:'json'};
import preparedRules from '../../design_rules/drone_irrigator_v1.json' with {type:'json'};
import defaults from '../../design_rules/defaults.json' with {type:'json'};
import manifest from '../../design_rules/manifest.json' with {type:'json'};
import {validateResponse} from '../src/contracts.js';
import {createExplorationGate} from '../src/explorerSession.js';
import {validateExplorerGraph,validateExplorerSearch,validateExplorerImpact,assertSameSnapshot,initialExplorerView,visibleExplorerGraph,explorerLayout,explorerEdgeLabels,revealExplorerRecord,createExplorerResource,EVIDENCE_ENTRY_TOPICS,RELATION_TYPES,EVIDENCE_KINDS} from '../src/knowledgeExplorerState.js';
import {buildOverview,buildTopic,sourceGroups,layoutPresentation,presentationHierarchy,canExpandRecord,TYPE_AREA,categoryGroupId,documentGroupId,SOURCE_GROUP} from '../src/knowledgeExplorerPresentation.js';

// Source identities and memberships come from the real registries. Wire values
// representing native adapters are isolated fixtures, not an application owner.
function fixture(){
  const evidence=ids=>ids.slice().sort().map(id=>({citation_id:id,passage_id:registry.citations[id].passage_id,...structuredClone(pilot.sources[id])}));
  const binding=id=>{
    const b=pilot.bindings[id];let value={};
    const collections={irrigation_profile:'plant_profiles',reservoir_system:'reservoirs',drone_platform:'aircraft',drone_base:'bases',research_topic:'work_packages',research_scenario:'scenarios',cluster_template:'templates'};
    if(Object.hasOwn(collections,b.adapter))value=(b.adapter==='cluster_template'?preparedRules:researchData)[collections[b.adapter]][b.native_id];
    if(b.adapter==='illustration')value={description:b.description};
    if(b.adapter==='carob_density')value={basis:'project_assumption',unit:'plants_per_hectare',ruleset_id:manifest.ruleset_id,value:defaults.density_defaults.carob};
    if(b.adapter==='mr2_geometry')value={basis:'project_assumption',unit:'configured fractions and metres',ruleset_id:manifest.ruleset_id,value:{mr2_centres:defaults.mr2_centres,rainfall_capture:defaults.rainfall_capture}};
    return {id,adapter:b.adapter,native_id:b.native_id,label:`Fixture ${b.native_id}`,aliases:[],value:structuredClone(value),authority:{file:'fixture authority',record_hash:'a'.repeat(64)},explanation:b.explanation};
  };
  const claim=id=>({id,...structuredClone(pilot.claims[id]),evidence:evidence(pilot.claims[id].citation_ids),configuration_values:pilot.claims[id].configuration_ids.slice().sort().map(binding)});
  const issues=Object.entries(pilot.issues).map(([id,i])=>({id,...structuredClone(i),claims:i.claim_ids.slice().sort().map(claim)}));
  const nodes=Object.entries(pilot.entities).map(([id,e])=>({id,kind:'entity',label:`Fixture ${id}`,details:{entity:{id,...structuredClone(e),label:`Fixture ${id}`},authority:binding(e.binding_id),evidence:evidence(e.citation_ids),claims:Object.keys(pilot.claims).filter(cid=>pilot.claims[cid].subject_ids.includes(id)).map(claim),relations:Object.entries(pilot.relations).filter(([,r])=>[r.source,r.target].includes(id)).map(([id,r])=>({id,...structuredClone(r)})),issues:issues.filter(i=>i.claims.some(c=>c.subject_ids.includes(id)))}}));
  nodes.push(...Object.keys(pilot.claims).map(id=>({id,kind:'claim',label:pilot.claims[id].statement,details:claim(id)})));
  const passages=new Map();for(const r of evidence(Object.keys(pilot.sources))){if(!passages.has(r.passage_id))passages.set(r.passage_id,[]);passages.get(r.passage_id).push(r);}
  for(const [id,refs] of passages){const r=refs[0];nodes.push({id,kind:'passage',label:`${r.document_id} · PDF page ${r.page}`,details:{document:structuredClone(documents.documents.find(d=>d.id===r.document_id)),passage_id:id,page:r.page,page_basis:'pdf',citation_uses:refs}});}
  const labels=Object.fromEntries(Object.keys(RELATION_TYPES).map(t=>[t,t.replaceAll('_',' ')]));
  const edges=Object.entries(pilot.relations).map(([id,r])=>({id,kind:'relationship',source:r.source,target:r.target,label:labels[r.type],details:{id,...structuredClone(r),evidence:evidence(r.citation_ids)}}));
  function derived(kind,source,target,refs){edges.push({id:'edge:'+createHash('sha256').update(JSON.stringify([kind,source,target])).digest('hex'),kind,source,target,label:kind==='claim_subject'?'about':'cites',details:{evidence:refs}});}
  for(const n of nodes){if(n.kind==='claim')for(const id of n.details.subject_ids)derived('claim_subject',n.id,id,[]);if(n.kind!=='passage')for(const pid of new Set(n.details.evidence.map(r=>r.passage_id)))derived(n.kind==='claim'?'claim_cites':'entity_cites',n.id,pid,n.details.evidence.filter(r=>r.passage_id===pid));}
  return {version:1,dataset_id:pilot.id,dataset_hash:'b'.repeat(64),consumer_registry_hash:'c'.repeat(64),reviewed_on:pilot.reviewed_on,coverage:structuredClone(pilot.coverage),nodes,edges,issues,entity_types:Object.fromEntries(Object.entries(pilot.entities).map(([,e])=>[e.type,e.id])),relation_types:labels};
}
// Types with no pilot entity are still registered, without creating a node.
const g=fixture();g.entity_types={programme:'programme',funding_route:'route',funding_call:'call',species:'species',restoration_approach:'approach',planting_palette:'palette',vegetation_series:'series',treatment:'treatment',strategy_need:'need',designer_rule:'rule',example_activity:'example_activity',irrigation_profile:'irrigation_profile',reservoir_system:'reservoir_system',drone_platform:'drone_platform',drone_base:'drone_base',research_topic:'research_topic',research_scenario:'research_scenario',cluster_template:'cluster_template'};
const view=(root='species:carob')=>({...initialExplorerView(),root,selected:root});
const search=(ids=[])=>({version:1,dataset_id:g.dataset_id,dataset_hash:g.dataset_hash,reviewed_on:g.reviewed_on,coverage:structuredClone(g.coverage),matches:ids.map(id=>structuredClone(g.nodes.find(n=>n.id===id).details.entity)),ambiguous:ids.length>1});
const impact=()=>({version:2,dataset_id:g.dataset_id,dataset_hash:g.dataset_hash,reviewed_on:g.reviewed_on,coverage:structuredClone(g.coverage),consumer_registry_hash:g.consumer_registry_hash,target:{kind:'claim',id:'claim:mr2-runoff-capture'},claim_ids:['claim:mr2-runoff-capture'],entity_ids:[],relation_ids:[],validation_dependencies:[],feature_dependencies:[],review_targets:[]});

test('nearest-first label search retains the previous deterministic crowded-layout result',()=>{
  const layout={positions:{a:{x:0,y:0},b:{x:300,y:0},c:{x:0,y:180},d:{x:300,y:180}},width:700,height:500};
  const edges=[{id:'one',source:'a',target:'b'},{id:'two',source:'a',target:'c'},{id:'three',source:'b',target:'d'},{id:'four',source:'c',target:'d'}];
  assert.deepEqual(explorerEdgeLabels(layout,edges),{four:{x:197,y:138},one:{x:67,y:112},three:{x:347,y:125},two:{x:47,y:292}});
  assert.throws(()=>explorerEdgeLabels({...layout,width:10,height:10},edges),/connection label layout/);
});

test('complete graph validates independently and through central contract, without mutation',()=>{
  const before=structuredClone(g);assert.equal(validateExplorerGraph(g),g);assert.equal(validateResponse('knowledge/explorer',g),g);assert.deepEqual(g,before);assert.equal(g.nodes.length,198);assert.equal(g.edges.length,516);
});
test('wrong versions, missing details, broken editions, endpoints, incomplete issues and inferred links fail',()=>{
  const changes=[v=>{v.version=2;},v=>{delete v.consumer_registry_hash;},v=>{v.extra=1;},v=>{v.nodes[0].kind='new';},v=>{v.nodes.push(v.nodes[0]);},v=>{v.edges[0].target='missing';},v=>{v.edges[0].details.type='unknown';},v=>{v.nodes.find(n=>n.kind==='passage').details.document.sha256='0'.repeat(64);},v=>{v.nodes.find(n=>n.kind==='passage').details.page=9999;},v=>{v.issues[0].claims.pop();},v=>{v.issues=[];},v=>{v.edges.pop();},v=>{const e=v.edges.find(e=>e.kind==='entity_cites');e.source='species:carob';},v=>{v.coverage.root_entities.push('missing');}];
  for(const change of changes){const value=structuredClone(g);change(value);assert.throws(()=>validateExplorerGraph(value),/Knowledge Explorer is incompatible/);}
});
test('passages are separate from citation uses; unresolved stock contexts and assumptions survive',()=>{
  const tension=g.issues.find(i=>i.type==='source_tension');assert.equal(tension.claims.length,2);assert.deepEqual(tension.claims.map(c=>c.evidence[0].page).sort(),[133,134]);assert(!Object.hasOwn(tension,'preferred'));
  for(const n of g.nodes.filter(n=>n.kind==='claim'&&n.details.evidence_kind==='project_assumption')){assert.equal(n.details.evidence.length,0);const b=n.details.configuration_values[0];if(['research_scenario','cluster_template'].includes(b.adapter))assert.equal(b.value.adoption,'prepared_not_adopted');else assert.equal(b.value.basis,'project_assumption');}
  for(const n of g.nodes.filter(n=>n.kind==='passage'))for(const r of n.details.citation_uses){assert.equal(r.passage_id,n.id);assert.notEqual(r.citation_id,n.id);}
});
test('initial topics do not depend on a project; the six contextual entries are explicit',()=>{
  assert.equal(initialExplorerView().root,null);assert.equal(initialExplorerView().layout,'lanes');assert.equal(initialExplorerView().mode,'auto');
  assert.equal(Object.values(EVIDENCE_ENTRY_TOPICS).reduce((n,c)=>n+Object.keys(c).length,0),6);assert.equal(EVIDENCE_ENTRY_TOPICS.project_concept['restoration-34'],'example_activity:carob-mr2-demonstrator');
});
test('expansion is one neighbourhood; collapse retains shared neighbours and never invents edges',()=>{
  const root=view('approach:mr2'),first=visibleExplorerGraph(g,root);assert(first.nodes.length<198);
  const a='claim:mr2-stock-narrative',b='claim:mr2-stock-table';assert(first.nodes.some(n=>n.id===a));assert(first.nodes.some(n=>n.id===b));
  const both={...root,expanded:[a,b]},expanded=visibleExplorerGraph(g,both);assert(expanded.nodes.length>first.nodes.length);
  const collapsed=visibleExplorerGraph(g,{...both,expanded:[b]});assert(collapsed.nodes.some(n=>n.id==='species:carob'));
  assert(collapsed.edges.every(e=>g.edges.includes(e)&&collapsed.nodes.some(n=>n.id===e.source)&&collapsed.nodes.some(n=>n.id===e.target)));
  assert.deepEqual(visibleExplorerGraph(g,{...root,expanded:[]}),first);
});
test('category/review/native relationship filters remove records and do not bridge hidden nodes',()=>{
  const v={...view('approach:mr2'),expanded:g.nodes.map(n=>n.id),category:'guidance',status:'curated',relationTypes:[]};const shown=visibleExplorerGraph(g,v);
  assert(shown.filtered>0);assert(shown.nodes.filter(n=>n.kind==='claim').every(n=>n.details.evidence_kind==='guidance'&&n.details.review_status==='curated'));
  assert(shown.edges.every(e=>e.kind!=='relationship'));assert.equal(shown.nodes.length+shown.filtered+shown.hidden,198);
});
test('layouts preserve visible membership and provide stable collision-spaced nodes',()=>{
  const v={...view(),expanded:['claim:mr2-stock-table']},before=structuredClone(v),visible=visibleExplorerGraph(g,v);
  for(const mode of ['lanes','network']){const layout=explorerLayout(g,v.root,mode);assert.deepEqual(layout,explorerLayout(g,v.root,mode));const points=Object.values(layout.positions);assert.equal(points.length,198);for(let i=0;i<points.length;i++)for(let j=0;j<i;j++)assert(Math.abs(points[i].x-points[j].x)>=220||Math.abs(points[i].y-points[j].y)>=104,'node collision');assert.deepEqual(visibleExplorerGraph(g,{...v,layout:mode,mode:'list'}),visible);}
  assert.deepEqual(v,before);
});
test('selection reveals registered paths without recentering; missing requested records are errors',()=>{
  const v=view(),next=revealExplorerRecord(g,v,'approach:mr2');assert.equal(next.root,v.root);assert.equal(next.selected,'approach:mr2');assert(visibleExplorerGraph(g,next).nodes.some(n=>n.id===next.selected));
  assert.throws(()=>revealExplorerRecord(g,v,'unknown'));assert.throws(()=>visibleExplorerGraph(g,{...v,root:'unknown'}));assert.throws(()=>visibleExplorerGraph(g,{...v,expanded:['unknown']}));
});
test('search ambiguity and empty results are valid; unknown identities or mismatched snapshots fail',()=>{
  assert.equal(validateExplorerSearch(search()).matches.length,0);const ambiguous=search(['approach:mr2','palette:mr2_mix']);assert.equal(validateResponse('knowledge/search?text=MR2',ambiguous).ambiguous,true);assertSameSnapshot(g,ambiguous);
  const bad=search(['species:carob']);bad.matches[0].id='species:unknown';assert.throws(()=>assertSameSnapshot(g,bad));bad.dataset_hash='d'.repeat(64);assert.throws(()=>assertSameSnapshot(g,bad),/Refresh/);
  const wrong=search();wrong.ambiguous=true;assert.throws(()=>validateExplorerSearch(wrong));
});
test('version-2 usage requires dataset/registration equality and registered path identities',()=>{
  const value=impact();assert.equal(validateResponse('knowledge/impact?target_kind=claim',value),value);assertSameSnapshot(g,value,true);
  for(const key of ['dataset_id','dataset_hash','consumer_registry_hash']){const v=impact();v[key]='d'.repeat(64);assert.throws(()=>assertSameSnapshot(g,v,true),/Refresh/);}
  const v=impact();v.claim_ids=['unknown'];assert.throws(()=>assertSameSnapshot(g,v,true));v.version=1;assert.throws(()=>validateExplorerImpact(v));
});
test('refresh clears unavailable data, retry succeeds, stale and abandoned responses are ignored',async()=>{
  const pending=[],resource=createExplorerResource(()=>new Promise((resolve,reject)=>pending.push({resolve,reject})),validateExplorerGraph);
  assert.equal(resource.get().status,'idle');const first=resource.load('knowledge/explorer'),second=resource.load('knowledge/explorer');pending[1].resolve(g);await second;pending[0].reject(Error('late failure'));await first;assert.equal(resource.get().status,'ready');
  const failed=resource.load('knowledge/explorer');assert.equal(resource.get().value,null);pending[2].reject(Error('fixture failed read'));await failed;assert.equal(resource.get().status,'error');assert.match(resource.get().error,/fixture failed read/);
  const retry=resource.load('knowledge/explorer');pending[3].resolve(g);await retry;assert.equal(resource.get().status,'ready');
  const abandoned=resource.load('knowledge/explorer');resource.cancel();pending[4].resolve(g);await abandoned;assert.equal(resource.get().value,null);resource.dispose();
});
test('malformed graph and mismatched search/impact responses fail with no partial success',async()=>{
  for(const [validate,response,snapshot,usage] of [[validateExplorerGraph,{version:99},null,false],[validateExplorerSearch,{...search(),dataset_hash:'f'.repeat(64)},g,false],[validateExplorerImpact,{...impact(),consumer_registry_hash:'f'.repeat(64)},g,true]]){const r=createExplorerResource(async()=>response,validate);await r.load('fixture',snapshot,usage);assert.equal(r.get().status,'error');assert.equal(r.get().value,null);}
});
test('exploration gate retains queued work and identities; submitted work settles, follow-on waits',async()=>{
  const gate=createExplorationGate(),calls=[],requestId='retained-request';let finish;const submitted=new Promise(r=>{finish=r;});let changed=0;const close=gate.subscribe(()=>changed++);
  gate.pause();const queued=(async()=>{while(gate.paused)await gate.wait();calls.push(requestId);})();await Promise.resolve();assert.deepEqual(calls,[]);
  let settled=false;submitted.then(()=>{settled=true;});finish();await submitted;assert(settled);assert.deepEqual(calls,[]);
  gate.pause();assert.equal(changed,1);gate.resume();await queued;assert.deepEqual(calls,[requestId]);assert.equal(changed,2);close();
});


test('connection label controls do not overlap nodes or each other in either layout',()=>{
  for(const mode of ['lanes','network']){
    const layout=explorerLayout(g,'approach:mr2',mode),labels=explorerEdgeLabels(layout,g.edges);
    assert.deepEqual(labels,explorerEdgeLabels(layout,g.edges));assert.equal(Object.keys(labels).length,516);
    const rects=Object.values(labels).map(p=>({...p,w:126,h:34}));
    const overlaps=(a,b)=>a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
    for(let i=0;i<rects.length;i++){for(let j=0;j<i;j++)assert(!overlaps(rects[i],rects[j]));for(const p of Object.values(layout.positions))assert(!overlaps(rects[i],{...p,w:220,h:104}));}
  }
});


test('expanding the centered topic reveals a further neighbourhood; immediate selection stays bounded',()=>{
  const v=view(),initial=visibleExplorerGraph(g,v),expanded=visibleExplorerGraph(g,{...v,expanded:[v.root]});
  assert(expanded.nodes.length>initial.nodes.length);
  const claim=initial.nodes.find(n=>n.kind==='claim');const selected=revealExplorerRecord(g,v,claim.id);
  assert.deepEqual(visibleExplorerGraph(g,selected),initial);assert.deepEqual(selected.expanded,[]);
  assert.deepEqual(visibleExplorerGraph(g,{...v,expanded:[]}),initial);
});

test('LIFE and kermes add bounded topics; optional palette membership remains illustrative',()=>{
  assert.deepEqual(g.coverage.root_entities,['route:LEADER-AL20-3.4','species:carob','approach:mr2','programme:EU-LIFE','species:kermes_oak','research_topic:R1','research_topic:R2','research_topic:R4']);
  assert.equal(g.nodes.filter(n=>n.kind==='claim'&&n.id.startsWith('claim:life-')).length,3);
  assert.equal(g.nodes.filter(n=>n.kind==='claim'&&n.id.startsWith('claim:kermes-')).length,6);
  const optional=g.edges.find(e=>e.id==='relation:mr2-optional-kermes');
  assert.equal(optional.details.type,'palette_optional_species');assert.equal(optional.details.basis,'project_assumption');
  assert.equal(optional.target,'species:kermes_oak');assert.deepEqual(optional.details.evidence,[]);
  const selected=revealExplorerRecord(g,view('approach:mr2'),'species:kermes_oak');
  assert(visibleExplorerGraph(g,selected).nodes.some(n=>n.id==='species:kermes_oak'));
  const broken=structuredClone(g);broken.edges.find(e=>e.id===optional.id).details.basis='source_reference';
  assert.throws(()=>validateExplorerGraph(broken),/relationship basis/);
});

test('both new source naming contexts remain unresolved alongside retained stock and water issues',()=>{
  const issue=g.issues.find(i=>i.id==='issue:kermes-warm-series-naming');
  assert.equal(issue.claims.length,2);assert(issue.claims.every(c=>c.review_status==='unresolved'&&c.evidence[0].document_id==='FOREST-003'&&c.evidence[0].page===3));
  assert(!Object.hasOwn(issue,'preferred'));assert.equal(g.issues.length,8);
  assert(g.nodes.filter(n=>n.kind==='entity'&&['programme:EU-LIFE','route:EU-LIFE-NATURE'].includes(n.id)).every(n=>n.details.entity.availability==='not_assessed'));
  const broken=structuredClone(g);broken.issues.find(i=>i.id===issue.id).claims.pop();
  assert.throws(()=>validateExplorerGraph(broken),/complete issue claims/);
});

test('four-layer presentation accounts for every original record and connection without mutation',()=>{
  const before=JSON.stringify(g),overview=buildOverview(g,initialExplorerView());
  assert.deepEqual(overview.cards.map(c=>c.id),['view:sources','view:knowledge','view:rules','view:projects']);
  assert.deepEqual(new Set(overview.cards.flatMap(c=>c.memberIds)),new Set(g.nodes.map(n=>n.id)));
  const aggregateIds=overview.connections.filter(c=>c.kind==='registered').flatMap(c=>c.edgeIds);
  assert.equal(aggregateIds.length,g.edges.length);assert.deepEqual(new Set(aggregateIds),new Set(g.edges.map(e=>e.id)));
  assert.deepEqual(overview.cards.find(c=>c.id==='view:projects').memberIds,[]);
  assert(overview.connections.filter(c=>[c.source,c.target].includes('view:projects')).every(c=>c.kind==='architecture'&&c.edgeIds.length===0));
  assert.equal(JSON.stringify(g),before);assert.deepEqual(buildOverview(g,initialExplorerView()),overview);
});
test('presentation exhaustively classifies native types and rejects unknown types and missing references',()=>{
  assert.deepEqual(Object.keys(TYPE_AREA).sort(),Object.keys(g.entity_types).sort());
  const unknown=structuredClone(g);unknown.nodes.find(n=>n.kind==='entity').details.entity.type='new_unregistered_type';
  assert.throws(()=>buildOverview(unknown,initialExplorerView()),/classification/);
  const broken=structuredClone(g);const claim=broken.nodes.find(n=>n.kind==='claim'&&n.details.evidence.length>0);claim.details.evidence[0].passage_id='missing';
  assert.throws(()=>buildOverview(broken,initialExplorerView()),/passage/);
});
test('sources retain editions, exact passages, distinct citation uses and supplementary web contexts',()=>{
  const s=sourceGroups(g,g.nodes,g.edges);
  assert.equal(s.counts.passages,g.nodes.filter(n=>n.kind==='passage').length);
  assert.equal(s.counts.citationUses,Object.keys(pilot.sources).length);
  assert(s.counts.webReferences>0);assert(s.documents.every(d=>d.key===d.document.id+'@'+d.document.sha256));
  for(const d of s.documents)for(const p of d.passages)for(const use of p.uses){assert.equal(use.passage_id,p.node.id);assert.equal(use.sha256,d.document.sha256);assert.equal(use.page,p.node.details.page);assert(use.role&&use.verified_on);}
  const duplicate=structuredClone(g),owner=duplicate.nodes.find(n=>n.kind==='entity'&&n.details.authority.value.web_sources?.length>0);
  const reference=structuredClone(owner.details.authority.value.web_sources[0]);reference.finding='A different reviewed context at the same URL';owner.details.authority.value.web_sources.push(reference);
  const after=sourceGroups(duplicate,duplicate.nodes,duplicate.edges);assert.equal(after.counts.webReferences,s.counts.webReferences+1);assert(after.web.some(w=>w.reference.finding===reference.finding));
  owner.details.authority.value.web_sources.reverse();assert.deepEqual(sourceGroups(duplicate,duplicate.nodes,duplicate.edges).web,after.web,'Web identities retain their exact reviewed context across reordering');
  const reordered=structuredClone(g);for(const n of reordered.nodes)if(n.kind!=='passage')n.details.evidence=n.details.evidence.map(r=>Object.fromEntries(Object.entries(r).reverse()));
  assert.deepEqual(sourceGroups(reordered,reordered.nodes,reordered.edges).counts,s.counts);
});
test('topic starts with collapsed categories, one Sources group, complete issues and authoritative assumptions',()=>{
  const before=JSON.stringify(g),p=buildTopic(g,view());
  assert.equal(p.cards.filter(c=>c.id===SOURCE_GROUP).length,1);assert(p.categoryGroups.length>0);
  assert.equal(p.cards.filter(c=>c.kind==='record'&&c.node.kind==='claim').length,0);
  assert.deepEqual(new Set(p.categoryGroups.flatMap(c=>c.nodes.map(n=>n.id))),new Set(p.claims.map(n=>n.id)));
  assert(p.assumptions.some(b=>b.adapter==='carob_density'&&b.value.value===defaults.density_defaults.carob));
  const stock=p.issues.find(i=>i.id==='issue:mr2-stock-source-tension');assert(stock);assert.equal(stock.claims.length,2);assert(!Object.hasOwn(stock,'preferred'));
  assert.equal(JSON.stringify(g),before);
});
test('category/document expansion exposes existing records and selection traces exact evidence only',()=>{
  const id='claim:mr2-runoff-capture',node=g.nodes.find(n=>n.id===id),base=view('approach:mr2');
  const expanded=[categoryGroupId(node.details.evidence_kind),SOURCE_GROUP,...node.details.evidence.map(r=>documentGroupId(r.document_id+'@'+r.sha256))];
  const p=buildTopic(g,base,expanded,id);assert(p.cards.some(c=>c.id===id));
  assert.deepEqual(new Set(p.highlight.passageIds),new Set(node.details.evidence.map(r=>r.passage_id)));
  for(const edgeId of p.highlight.edgeIds){const edge=g.edges.find(e=>e.id===edgeId);assert(edge.source===id||edge.target===id);}
  for(const card of p.cards.filter(c=>c.kind==='record'))assert(g.nodes.some(n=>n.id===card.id));
  assert.equal(new Set(p.cards.map(c=>c.id)).size,p.cards.length);
  const config=buildTopic(g,base,[], 'claim:designer-carob-density-assumption');assert.equal(config.sources.counts.citationUses>0,true);
  const claim=g.nodes.find(n=>n.id==='claim:designer-carob-density-assumption');assert.equal(claim.details.evidence.length,0);
  assert.equal(config.highlight.passageIds.length,0);
});
test('filtered claims and native relationships do not reappear in aggregates or produce bypass connections',()=>{
  const v={...view('approach:mr2'),category:'guidance',status:'curated',relationTypes:[]},p=buildTopic(g,v);
  const allowed=new Set(p.visible.edges.map(e=>e.id));
  for(const c of p.connections.filter(c=>c.kind==='registered'))for(const id of c.edgeIds){const edge=g.edges.find(e=>e.id===id);assert(edge);assert(edge.kind!=='relationship');assert(edge.source===v.root||p.visible.nodes.some(n=>n.id===edge.source));if(edge.kind==='claim_subject')assert(allowed.has(id));}
  assert(p.claims.every(n=>n.details.evidence_kind==='guidance'&&n.details.review_status==='curated'));
  assert(p.issues.some(i=>i.claims.length===2),'Complete stock issue remains accessible beyond the claim filter');
});
function crossesInterior(a,b,r){
  if(a[0]===b[0])return a[0]>r.x&&a[0]<r.x+r.width&&Math.max(Math.min(a[1],b[1]),r.y)<Math.min(Math.max(a[1],b[1]),r.y+r.height);
  return a[1]>r.y&&a[1]<r.y+r.height&&Math.max(Math.min(a[0],b[0]),r.x)<Math.min(Math.max(a[0],b[0]),r.x+r.width);
}
test('deterministic map routes avoid unrelated card interiors and terminate at their declared ports',()=>{
  const presentations=[buildOverview(g,initialExplorerView(),['view:knowledge','view:area:funding','view:sources']),...['species:carob','approach:mr2','route:LEADER-AL20-3.4','research_topic:R1','research_topic:R4'].map(id=>buildTopic(g,view(id),[...Object.keys(EVIDENCE_KINDS).map(categoryGroupId),SOURCE_GROUP]))];
  for(const p of presentations){const layout=layoutPresentation(p);assert.deepEqual(layoutPresentation(p),layout);for(const edge of layout.paths){const source=layout.positions[edge.source],target=layout.positions[edge.target],first=edge.points[0],last=edge.points.at(-1);assert([source.x,source.x+source.width].includes(first[0]));assert.equal(first[1],source.y+source.height/2);assert([target.x,target.x+target.width].includes(last[0]));assert.equal(last[1],target.y+target.height/2);for(let i=1;i<edge.points.length;i++)for(const [id,box] of Object.entries(layout.positions))if(id!==edge.source&&id!==edge.target)assert(!crossesInterior(edge.points[i-1],edge.points[i],box),`${edge.id} crosses ${id}`);}}
});

test('keyboard focus does not move cards and selected claims retain their individual evidence paths',()=>{
  const id='claim:mr2-runoff-capture',v=view('approach:mr2'),claim=g.nodes.find(n=>n.id===id),open=[categoryGroupId(claim.details.evidence_kind),SOURCE_GROUP,...claim.details.evidence.map(r=>documentGroupId(r.document_id+'@'+r.sha256))];
  assert.deepEqual(layoutPresentation(buildTopic(g,v,open)).positions,layoutPresentation(buildTopic(g,v,open,id)).positions);
  const selected=buildTopic(g,{...v,selected:id},open,id);
  const refs=g.edges.filter(e=>e.source===id&&e.kind==='claim_cites');
  for(const edge of refs)assert(selected.connections.some(c=>c.source===id&&c.target===edge.target&&c.edgeIds.includes(edge.id)));
});

test('display children have explicit parents, indentation and nonsemantic branch lines',()=>{
  const p=buildOverview(g,initialExplorerView(),['view:knowledge','view:area:claims',categoryGroupId('guidance'),SOURCE_GROUP,...sourceGroups(g,g.nodes,g.edges).documents.map(d=>d.id)]),layout=layoutPresentation(p);
  const category=p.cards.find(c=>c.id===categoryGroupId('guidance')),claim=p.cards.find(c=>c.kind==='record'&&c.node.kind==='claim');
  assert.equal(category.parentId,'view:area:claims');assert.equal(claim.parentId,category.id);assert.equal(layout.positions[claim.id].depth,3);
  for(const branch of layout.branches){const parent=layout.positions[branch.parentId],child=layout.positions[branch.childId];assert(child.x>parent.x);assert.equal(child.depth,parent.depth+1);assert.equal(child.x+child.width,parent.x+parent.width);assert.deepEqual(branch.points.at(-1),[child.x,child.y+child.height/2]);for(let i=1;i<branch.points.length;i++)for(const [id,box] of Object.entries(layout.positions))if(id!==branch.parentId&&id!==branch.childId)assert(!crossesInterior(branch.points[i-1],branch.points[i],box),`branch crosses ${id}`);}
  assert(layout.branches.length>0);assert.equal(layout.paths.some(e=>e.kind==='organization'),false,'Containment uses neutral branch lines, not knowledge arrows');
  assert.throws(()=>presentationHierarchy([{id:'a',column:0,parentId:'missing'}]),/parent/);
  assert.throws(()=>presentationHierarchy([{id:'a',column:0,parentId:'b'},{id:'b',column:0,parentId:'a'}]),/cyclic/);
});
test('connected records can expand on-card while exact source passages remain leaves',()=>{
  assert(canExpandRecord(g,'species:carob'));assert(canExpandRecord(g,'claim:mr2-runoff-capture'));
  assert.equal(canExpandRecord(g,g.nodes.find(n=>n.kind==='passage').id),false);
  assert.throws(()=>canExpandRecord(g,'not-registered'),/unavailable/);
});
