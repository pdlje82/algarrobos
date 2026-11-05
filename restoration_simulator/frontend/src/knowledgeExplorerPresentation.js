// Read-only display projections. No presentation identity is a knowledge identity.
import {ENTITY_TYPES,EVIDENCE_KINDS,visibleExplorerGraph} from './knowledgeExplorerState.js';
import {RESEARCH_ADAPTERS} from './irrigationResearchState.js';

export const AREAS={ecology:'Ecology',funding:'Funding',research:'Research & systems',examples:'Prepared examples',claims:'Claims',issues:'Unresolved issues'};
export const TYPE_AREA={species:'ecology',vegetation_series:'ecology',restoration_approach:'ecology',planting_palette:'ecology',treatment:'ecology',irrigation_profile:'ecology',programme:'funding',funding_route:'funding',funding_call:'funding',strategy_need:'funding',research_topic:'research',reservoir_system:'research',drone_platform:'research',drone_base:'research',example_activity:'examples',research_scenario:'examples',cluster_template:'examples',designer_rule:'rules'};
export const LAYERS={sources:{title:'Sources',description:'Original documents and web references, editions, checksums, metadata and exact passages.',coverage:'Registered references'},knowledge:{title:'Knowledge',description:'Species, communities, methods, programmes, claims, relationships, uncertainties and research gaps.',coverage:'Registered knowledge only'},rules:{title:'Rules',description:'Explicit calculations and decision procedures with versions, tests and supporting evidence.',coverage:'Selected references, not a complete rule inventory'},projects:{title:'Projects',description:'User choices, assumptions, observations, drafts and adopted rule snapshots.',coverage:'Architecture context · outside Explorer coverage'}};
const fail=message=>{throw Error(`Knowledge presentation is incompatible: ${message}. Restore a compatible Explorer and refresh. No records were substituted.`);};
const need=(condition,message)=>{if(!condition)fail(message);};
const unique=values=>[...new Set(values)].sort();
const canonical=value=>JSON.stringify(value,(_,entry)=>entry!==null&&typeof entry==='object'&&!Array.isArray(entry)?Object.fromEntries(Object.keys(entry).sort().map(key=>[key,entry[key]])):entry);
const viewId=(...parts)=>'view:'+parts.map(encodeURIComponent).join(':');
export const documentGroupId=key=>viewId('document',key);
export const categoryGroupId=kind=>viewId('category',kind);
export const relationGroupId=kind=>viewId('relation',kind);
export const SOURCE_GROUP='view:sources';
export function canExpandRecord(graph,id){
  const node=graph.nodes.find(n=>n.id===id);need(node!==undefined,'the requested record is unavailable');
  return node.kind!=='passage'&&graph.edges.some(e=>e.source===id||e.target===id);
}
export function areaOf(node){
  if(node.kind==='claim')return 'claims';
  if(node.kind==='passage')return 'sources';
  need(node.kind==='entity'&&Object.hasOwn(TYPE_AREA,node.details.entity.type),'unregistered entity classification');
  return TYPE_AREA[node.details.entity.type];
}
function layerOf(node){const area=areaOf(node);return area==='sources'?'sources':area==='rules'?'rules':'knowledge';}
export function filteredCollection(graph,view){
  const nodes=graph.nodes.filter(n=>n.kind!=='claim'||(view.category==='all'||n.details.evidence_kind===view.category)&&(view.status==='all'||n.details.review_status===view.status));
  const ids=new Set(nodes.map(n=>n.id));
  return {nodes,edges:graph.edges.filter(e=>ids.has(e.source)&&ids.has(e.target)&&(e.kind!=='relationship'||view.relationTypes.includes(e.details.type))),filtered:graph.nodes.length-nodes.length};
}
export function sourceGroups(graph,nodes,edges){
  const all=new Map(graph.nodes.map(n=>[n.id,n])),uses=new Map(),passageIds=new Set(),web=new Map();
  const add=ref=>{need(all.has(ref.passage_id),'citation passage is unavailable');if(uses.has(ref.citation_id))need(canonical(uses.get(ref.citation_id))===canonical(ref),'citation use metadata disagrees');uses.set(ref.citation_id,ref);passageIds.add(ref.passage_id);};
  for(const node of nodes){
    if(node.kind==='passage'){passageIds.add(node.id);for(const ref of node.details.citation_uses)add(ref);}
    else for(const ref of node.details.evidence)add(ref);
    if(node.kind==='entity'&&RESEARCH_ADAPTERS.has(node.details.authority.adapter)){
      const owner=node.details.authority;
      need(Array.isArray(owner.value.web_sources),'required supplementary web references are missing');
      const occurrences=new Map();
      owner.value.web_sources.forEach(reference=>{const identity=canonical(reference),occurrence=occurrences.has(identity)?occurrences.get(identity):0;occurrences.set(identity,occurrence+1);const id=viewId('web',owner.id,identity,String(occurrence));web.set(id,{id,ownerId:node.id,bindingId:owner.id,reference});});
    }
  }
  for(const edge of edges)for(const ref of edge.details.evidence)add(ref);
  const editions=new Map();
  for(const id of [...passageIds].sort()){
    const node=all.get(id);need(node!==undefined&&node.kind==='passage','source passage is unresolved');
    const document=node.details.document,key=document.id+'@'+document.sha256;
    if(!editions.has(key))editions.set(key,{id:documentGroupId(key),key,document,passages:[],citationIds:[]});
    const edition=editions.get(key),refs=[...uses.values()].filter(r=>r.passage_id===id).sort((a,b)=>a.citation_id.localeCompare(b.citation_id));
    edition.passages.push({node,uses:refs});edition.citationIds.push(...refs.map(r=>r.citation_id));
  }
  const documents=[...editions.values()].sort((a,b)=>a.key.localeCompare(b.key));
  for(const document of documents){document.passages.sort((a,b)=>a.node.details.page-b.node.details.page);document.citationIds=unique(document.citationIds);}
  return {documents,web:[...web.values()].sort((a,b)=>a.id.localeCompare(b.id)),counts:{documents:documents.length,passages:passageIds.size,citationUses:uses.size,webReferences:web.size},passageIds:[...passageIds].sort(),citationIds:[...uses.keys()].sort()};
}
function assumptions(nodes){
  const values=new Map();for(const n of nodes)if(n.kind==='claim')for(const binding of n.details.configuration_values){if(values.has(binding.id))need(JSON.stringify(values.get(binding.id))===JSON.stringify(binding),'configuration references disagree');values.set(binding.id,binding);}
  return [...values.values()].sort((a,b)=>a.id.localeCompare(b.id));
}
function recordCard(node,column,parentId=null){return {id:node.id,kind:'record',column,parentId,height:124,title:node.label,subtitle:node.kind==='entity'?ENTITY_TYPES[node.details.entity.type]:node.kind==='claim'?EVIDENCE_KINDS[node.details.evidence_kind]:'Exact PDF passage',memberIds:[node.id],node};}
function groupCard(id,title,subtitle,members,column,extra={}){return {id,kind:'group',column,parentId:null,height:112,title,subtitle,memberIds:members,...extra};}
function aggregate(edges,endpoint){
  const groups=new Map();for(const edge of edges){const pair=endpoint(edge);if(pair===null)continue;const [source,target,label]=pair,key=JSON.stringify(pair);if(!groups.has(key))groups.set(key,{id:viewId('aggregate',key),source,target,label,kind:'registered',edgeIds:[]});groups.get(key).edgeIds.push(edge.id);}
  return [...groups.values()].map(g=>({...g,internal:g.source===g.target,edgeIds:g.edgeIds.sort()})).sort((a,b)=>a.id.localeCompare(b.id));
}
function sourceCards(sources,open,column,cards,connections){
  if(!open.has(SOURCE_GROUP))return;
  for(const document of sources.documents){
    cards.push(groupCard(document.id,document.document.title,`${document.passages.length} passages · ${document.citationIds.length} citation uses`,document.passages.map(p=>p.node.id),column,{document,parentId:SOURCE_GROUP}));
    connections.push({id:viewId('contains',SOURCE_GROUP,document.id),source:SOURCE_GROUP,target:document.id,label:'Document edition',kind:'organization',edgeIds:[]});
    if(open.has(document.id))for(const passage of document.passages){cards.push({...recordCard(passage.node,column,document.id),subtitle:`PDF page ${passage.node.details.page} · ${passage.uses.length} citation uses`});connections.push({id:viewId('contains',document.id,passage.node.id),source:document.id,target:passage.node.id,label:'Exact passage',kind:'organization',edgeIds:[]});}
  }
  for(const reference of sources.web)cards.push({id:reference.id,kind:'web',column,parentId:SOURCE_GROUP,height:124,title:reference.reference.title,subtitle:`Supplementary web reference · checked ${reference.reference.checked_on}`,memberIds:[],web:reference});
}
export function buildOverview(graph,view,expanded=[]){
  need(Object.keys(TYPE_AREA).length===Object.keys(ENTITY_TYPES).length&&Object.keys(ENTITY_TYPES).every(t=>Object.hasOwn(TYPE_AREA,t)),'entity classifications need updating');
  for(const node of graph.nodes)areaOf(node);
  const collection=filteredCollection(graph,view),open=new Set(expanded),areas=Object.fromEntries(Object.keys(AREAS).map(k=>[k,[]]));
  for(const node of collection.nodes){const area=areaOf(node);if(Object.hasOwn(areas,area))areas[area].push(node);}
  const allowed=new Set(collection.nodes.map(n=>n.id)),issues=graph.issues.filter(i=>i.claim_ids.some(id=>allowed.has(id))),sources=sourceGroups(graph,collection.nodes,collection.edges),references=assumptions(collection.nodes);
  const rules=collection.nodes.filter(n=>areaOf(n)==='rules');
  const cards=Object.entries(LAYERS).map(([id,layer],column)=>({id:'view:'+id,kind:'layer',column,parentId:null,height:360,title:layer.title,subtitle:layer.coverage,description:layer.description,memberIds:collection.nodes.filter(n=>layerOf(n)===id).map(n=>n.id),layer:id}));
  const byId=new Map(graph.nodes.map(n=>[n.id,n]));
  const connections=aggregate(collection.edges,e=>{const source='view:'+layerOf(byId.get(e.source)),target='view:'+layerOf(byId.get(e.target));return [source,target,e.kind==='claim_subject'?(target==='view:rules'?'Claims about registered rules':'Claims about topics'):e.kind==='relationship'?graph.relation_types[e.details.type]:'Cited passages'];});
  for(const [source,target,label] of [['sources','knowledge','Evidence and interpretation'],['knowledge','rules','Reviewed rule adoption'],['rules','projects','Adopted snapshots']])connections.push({id:viewId('architecture',source,target),source:'view:'+source,target:'view:'+target,label,kind:'architecture',edgeIds:[]});
  if(open.has('view:knowledge'))for(const [id,label] of Object.entries(AREAS)){
    const members=id==='issues'?issues.map(i=>i.id):areas[id].map(n=>n.id),gid=viewId('area',id);
    cards.push(groupCard(gid,label,`${members.length} ${id==='issues'?'complete issues':'records'}`,members,1,{area:id,parentId:'view:knowledge'}));
    if(open.has(gid)){
      if(id==='issues')for(const issue of issues)cards.push({id:issue.id,kind:'issue',column:1,parentId:gid,height:124,title:issue.explanation,subtitle:issue.type==='source_tension'?'Unresolved source tension':'Bounded evidence gap',memberIds:issue.claim_ids,issue});
      else if(id==='claims')for(const [kind,title] of Object.entries(EVIDENCE_KINDS)){
        const claims=areas.claims.filter(n=>n.details.evidence_kind===kind);if(claims.length===0)continue;const cid=categoryGroupId(kind);
        cards.push(groupCard(cid,title,`${claims.length} claims`,claims.map(n=>n.id),1,{parentId:gid}));if(open.has(cid))for(const claim of claims)cards.push(recordCard(claim,1,cid));
      }else for(const node of areas[id])cards.push(recordCard(node,1,gid));
    }
  }
  sourceCards(sources,open,0,cards,connections);
  if(open.has('view:rules')){for(const node of rules)cards.push(recordCard(node,2,'view:rules'));for(const binding of references)cards.push({id:viewId('assumption',binding.id),kind:'assumption',column:2,parentId:'view:rules',height:124,title:binding.label,subtitle:'Current reference assumption · not an adopted project value',memberIds:[],binding});}
  return {kind:'overview',cards,connections,sources,areas,issues,rules,assumptions:references,collection,roots:graph.coverage.root_entities.map(id=>byId.get(id)),counts:{records:collection.nodes.length,totalRecords:graph.nodes.length,connections:collection.edges.length,totalConnections:graph.edges.length,issues:issues.length,...sources.counts}};
}
export function buildTopic(graph,view,expanded=[],focusId=null){
  const visible=visibleExplorerGraph(graph,view),open=new Set(expanded),all=new Map(graph.nodes.map(n=>[n.id,n])),root=all.get(view.root);
  need(root!==undefined&&root.kind==='entity','the requested topic is unavailable; choose a topic or reset the view');
  const claims=visible.nodes.filter(n=>n.kind==='claim'),related=visible.nodes.filter(n=>n.kind==='entity'&&n.id!==root.id),sources=sourceGroups(graph,visible.nodes.filter(n=>n.kind!=='passage'),visible.edges);
  const ids=new Set(visible.nodes.map(n=>n.id)),issues=graph.issues.filter(i=>i.claims.some(c=>c.subject_ids.includes(root.id))||i.claim_ids.some(id=>ids.has(id))),references=assumptions(claims);
  const cards=[recordCard(root,0)],categoryGroups=[],relations=[];
  for(const [kind,title] of Object.entries(EVIDENCE_KINDS)){
    const members=claims.filter(n=>n.details.evidence_kind===kind);if(members.length===0)continue;
    const id=categoryGroupId(kind);categoryGroups.push({id,title,nodes:members});cards.push(groupCard(id,title,`${members.length} claims`,members.map(n=>n.id),1));
    if(open.has(id))for(const node of members)cards.push(recordCard(node,1,id));
  }
  const relatedIds=new Set();
  for(const type of view.relationTypes){
    const edges=visible.edges.filter(e=>e.kind==='relationship'&&e.details.type===type&&(e.source===root.id||e.target===root.id));if(edges.length===0)continue;
    const members=unique(edges.map(e=>e.source===root.id?e.target:e.source)),id=relationGroupId(type);members.forEach(id=>relatedIds.add(id));
    relations.push({id,title:graph.relation_types[type],nodes:members.map(id=>all.get(id)),edges});
    cards.push(groupCard(id,graph.relation_types[type],`${members.length} topics${edges.some(e=>e.details.basis==='project_assumption')?' · illustrative association':''}`,members,0,{parentId:root.id}));
    if(open.has(id))for(const member of members)if(!cards.some(c=>c.id===member))cards.push(recordCard(all.get(member),0,id));
  }
  const other=related.filter(n=>!relatedIds.has(n.id));if(other.length){const id='view:expanded-topics';relations.push({id,title:'Expanded topics',nodes:other,edges:[]});cards.push(groupCard(id,'Expanded topics',`${other.length} topics`,other.map(n=>n.id),0,{parentId:root.id}));if(open.has(id))for(const node of other)cards.push(recordCard(node,0,id));}
  cards.push(groupCard(SOURCE_GROUP,'Sources & citations',`${sources.counts.documents} documents · ${sources.counts.passages} passages · ${sources.counts.citationUses} uses · ${sources.counts.webReferences} web references`,sources.passageIds,2));
  const sourceConnections=[];sourceCards(sources,open,2,cards,sourceConnections);
  for(const issue of issues){const id=viewId('issue',issue.id);cards.push({...groupCard(id,issue.type==='source_tension'?'Source tension':'Evidence gap',`${issue.claim_ids.length} affected claims · unresolved`,issue.claim_ids,1),issue});}
  const cardIds=new Set(cards.map(c=>c.id)),nodeCard=new Map(),trace=all.get(view.selected)?.kind==='claim'?view.selected:null;
  for(const n of visible.nodes){if(n.id===root.id||n.id===trace&&cardIds.has(n.id))nodeCard.set(n.id,n.id);else if(n.kind==='claim')nodeCard.set(n.id,categoryGroupId(n.details.evidence_kind));else if(n.kind==='passage')nodeCard.set(n.id,SOURCE_GROUP);else {const group=relations.find(r=>r.nodes.some(m=>m.id===n.id));need(group!==undefined,'expanded topic grouping is unavailable');nodeCard.set(n.id,group.id);}}
  // Citation summaries may include a claim's explicitly cited passages beyond the
  // currently expanded neighbourhood. These are original edges, never bypasses.
  const referenceEdges=graph.edges.filter(e=>ids.has(e.source)&&sources.passageIds.includes(e.target)&&e.kind.endsWith('_cites'));
  const original=new Map([...visible.edges,...referenceEdges].map(e=>[e.id,e]));
  const connections=aggregate([...original.values()],e=>{
    const source=nodeCard.get(e.source),target=e.source===trace&&cardIds.has(e.target)?e.target:nodeCard.has(e.target)?nodeCard.get(e.target):SOURCE_GROUP;
    if(source===undefined||source===target)return null;
    return [source,target,e.kind==='claim_subject'?'Claims about this topic':e.kind==='relationship'?graph.relation_types[e.details.type]:'Cited evidence'];
  });
  connections.push(...sourceConnections);
  const focus=all.get(focusId),highlightNodes=new Set(),highlightEdges=new Set(),highlightPassages=new Set();
  if(focus!==undefined){highlightNodes.add(focus.id);if(focus.kind==='claim'){focus.details.subject_ids.forEach(id=>highlightNodes.add(id));focus.details.evidence.forEach(r=>highlightPassages.add(r.passage_id));}else if(focus.kind==='passage')highlightPassages.add(focus.id);
    for(const edge of original.values())if(edge.source===focus.id||edge.target===focus.id){highlightEdges.add(edge.id);highlightNodes.add(edge.source);highlightNodes.add(edge.target);}
  }
  return {kind:'topic',root,cards,connections,sources,claims,categoryGroups,relations,issues,assumptions:references,visible,highlight:{nodeIds:[...highlightNodes],edgeIds:[...highlightEdges],passageIds:[...highlightPassages]},counts:{records:visible.nodes.length,totalRecords:graph.nodes.length,connections:visible.edges.length,totalConnections:graph.edges.length,filtered:visible.filtered,hidden:visible.hidden,...sources.counts}};
}
export function presentationHierarchy(cards){
  const byId=new Map(cards.map(c=>[c.id,c])),depths={};
  need(byId.size===cards.length,'duplicate display identities');
  function depth(card,ancestors=new Set()){
    if(Object.hasOwn(depths,card.id))return depths[card.id];
    need(!ancestors.has(card.id),'cyclic display hierarchy');
    need(card.parentId===null||byId.has(card.parentId),'a display parent is unavailable');
    if(card.parentId===null||byId.get(card.parentId).column!==card.column)return depths[card.id]=0;
    return depths[card.id]=1+depth(byId.get(card.parentId),new Set([...ancestors,card.id]));
  }
  for(const card of cards)depth(card);
  return depths;
}
export function layoutPresentation(presentation){
  const visibleConnections=presentation.connections.filter(e=>!e.internal&&e.kind!=='organization'),width=280,gap=80,step=14,indent=20;
  const columns=new Map(presentation.cards.map(c=>[c.id,c.column]));
  const overhead=visibleConnections.filter(e=>e.kind==='architecture'||Math.abs(columns.get(e.source)-columns.get(e.target))>1),top=54+overhead.length*step,positions={},rows=new Map();
  const depths=presentationHierarchy(presentation.cards);
  for(const card of presentation.cards){const y=rows.has(card.column)?rows.get(card.column):top,depth=depths[card.id];positions[card.id]={x:24+card.column*(width+gap)+depth*indent,y,width:width-depth*indent,height:card.height,depth};rows.set(card.column,y+card.height+20);}
  const paths=visibleConnections.map((edge,index)=>{
    need(Object.hasOwn(positions,edge.source)&&Object.hasOwn(positions,edge.target),'a displayed connection has no endpoint');
    const a=positions[edge.source],b=positions[edge.target],ac=columns.get(edge.source),bc=columns.get(edge.target),same=ac===bc,forward=ac<=bc;
    const ax=forward?a.x+a.width:a.x,bx=same?b.x+b.width:forward?b.x:b.x+b.width,ay=a.y+a.height/2,by=b.y+b.height/2;
    const out=forward?24+ac*(width+gap)+width+22:24+ac*(width+gap)-22,entry=same?out:forward?24+bc*(width+gap)-22:24+bc*(width+gap)+width+22;
    const above=edge.kind==='architecture'||Math.abs(ac-bc)>1,upperLane=24+overhead.indexOf(edge)*step,channel=forward?24+ac*(width+gap)+width+gap/2:24+bc*(width+gap)+width+gap/2;
    const points=same?[[ax,ay],[out,ay],[out,by],[bx,by]]:above?[[ax,ay],[out,ay],[out,upperLane],[entry,upperLane],[entry,by],[bx,by]]:[[ax,ay],[channel,ay],[channel,by],[bx,by]];
    return {...edge,points,path:points.map(([x,y],i)=>(i?'L':'M')+x+','+y).join(' '),labelPosition:{x:above?(out+entry)/2:channel,y:above?upperLane-3:(ay+by)/2-3}};
  });
  const branches=presentation.cards.filter(c=>c.parentId!==null&&columns.get(c.parentId)===c.column).map(card=>{const p=positions[card.parentId],child=positions[card.id],x=child.x-indent/2,points=[[x,p.y+p.height],[x,child.y+child.height/2],[child.x,child.y+child.height/2]];return {parentId:card.parentId,childId:card.id,points,path:points.map(([x,y],i)=>(i?'L':'M')+x+','+y).join(' ')};});
  return {positions,paths,branches,width:(presentation.kind==='overview'?4:3)*(width+gap)-gap+48,height:Math.max(240,...rows.values())+16};
}
