import React,{useEffect,useMemo,useRef,useState,useSyncExternalStore} from 'react';
import {KnowledgeAssumption} from './KnowledgeEvidence.jsx';
import {ENTITY_TYPES,EVIDENCE_KINDS,RELATION_TYPES,initialExplorerView,createExplorerResource,validateExplorerGraph,validateExplorerSearch} from './knowledgeExplorerState.js';
import {buildExplorer,revealInExplorer,canExpandRecord} from './knowledgeExplorerPresentation.js';
import {GroupedMap,StructuredOutline,AdvancedNetwork,WebReference} from './KnowledgeExplorerViews.jsx';
import {Inspector,Issues} from './KnowledgeRecordDetails.jsx';
import {ExplorerInspector} from './ExplorerInspector.jsx';
import './KnowledgeExplorer.css';

function useResource(request,validate){const resource=useMemo(()=>createExplorerResource(request,validate),[request,validate]);useEffect(()=>()=>resource.dispose(),[resource]);return [useSyncExternalStore(resource.subscribe,resource.get),resource];}
function ConnectionDetails({connection,graph,onRecord}){
  return <><h2>{connection.label}</h2>{connection.kind==='architecture'?<p>Architecture context: this explains ownership and reviewed adoption. It does not assert a registered record dependency or load project state.</p>:connection.kind==='organization'?<p>This is a display grouping of registered sources, not an additional scientific relationship.</p>:<><p>{connection.edgeIds.length} registered connections. The original identities and directions are retained below.</p><ul>{connection.edgeIds.map(id=>{const e=graph.edges.find(e=>e.id===id);return <li key={id}><button onClick={()=>onRecord(id)}>{graph.nodes.find(n=>n.id===e.source).label} → {e.label} → {graph.nodes.find(n=>n.id===e.target).label}</button></li>;})}</ul></>}</>;
}
function SelectedDetails({selection,presentation,graph,...props}){
  if(selection===null)return <p>Select a record or registered connection to inspect its evidence.</p>;
  if(selection.kind==='record')return <Inspector selected={selection.id} graph={graph} {...props}/>;
  if(selection.kind==='issue'){const issue=graph.issues.find(i=>i.id===selection.id);if(issue!==undefined)return <Issues issues={[issue]} onSelect={props.onSelect}/>;}
  if(selection.kind==='web'){const web=presentation.sources.web.find(w=>w.id===selection.id);if(web!==undefined)return <WebReference web={web} graph={graph} onSelect={props.onSelect}/>;}
  if(selection.kind==='assumption'){const binding=presentation.assumptions.find(b=>b.id===selection.id);if(binding!==undefined)return <><h2>Current reference assumption</h2><KnowledgeAssumption binding={binding}/><p>This owner-resolved reference does not identify an adopted project value.</p></>;}
  if(selection.kind==='connection'){const connection=presentation.connections.find(c=>c.id===selection.id);if(connection!==undefined)return <ConnectionDetails connection={connection} graph={graph} onRecord={props.onSelect}/>;}
  return <p role="alert">The requested record is no longer available in this presentation. Choose a record or reset the selection.</p>;
}
export function KnowledgeExplorer({request,active,entry,onReturn}){
  const [state,resource]=useResource(request,validateExplorerGraph),[search,searchResource]=useResource(request,validateExplorerSearch);
  const [view,setView]=useState(initialExplorerView),[history,setHistory]=useState([]);
  const [preference,setPreference]=useState(null),[groups,setGroups]=useState([]),[selection,setSelection]=useState(null);
  const [query,setQuery]=useState(''),[entityType,setEntityType]=useState(''),[message,setMessage]=useState(''),[focus,setFocus]=useState(null);
  const [narrow,setNarrow]=useState(()=>window.matchMedia('(max-width: 899px)').matches),[zoom,setZoom]=useState(1);
  const [detailsOpen,setDetailsOpen]=useState(false),[maximized,setMaximized]=useState(false);
  const stage=useRef(null),panel=useRef(null),detailsButton=useRef(null),maximizeButton=useRef(null),detailsOrigin=useRef(null),inspectorGeometry=useRef(null),handledEntry=useRef(null);
  const graph=state.value,format=preference===null?(narrow?'outline':'map'):preference;
  useEffect(()=>{const media=window.matchMedia('(max-width: 899px)'),update=()=>setNarrow(media.matches);media.addEventListener('change',update);return()=>media.removeEventListener('change',update);},[]);
  useEffect(()=>{if(active&&resource.get().status==='idle')resource.load('knowledge/explorer');if(!active){if(resource.get().status==='loading')resource.cancel();searchResource.cancel();}},[active,resource,searchResource]);
  useEffect(()=>{if(graph!==null&&handledEntry.current!==entry.token){handledEntry.current=entry.token;if(entry.topicId!==null)openTopic(entry.topicId,true);if(active)requestAnimationFrame(()=>document.getElementById('knowledge-title')?.focus());}},[entry.token,graph]);
  useEffect(()=>{if(!active||!maximized||graph===null)return;const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=previous;};},[active,maximized,graph!==null]);
  useEffect(()=>{if(!active||graph===null)setMaximized(false);},[active,graph===null]);
  let presentation=null,viewError='';
  if(graph!==null)try{presentation=buildExplorer(graph,view,groups,focus===null?(selection?.kind==='record'?selection.id:null):focus);}catch(error){viewError=error.message;}
  function rememberOrigin(){if(!panel.current?.contains(document.activeElement))detailsOrigin.current=document.activeElement;}
  function choose(kind,id){rememberOrigin();setSelection({kind,id});setDetailsOpen(true);}
  function restoreFocus(origin,recovery){if(origin!==null&&origin.isConnected&&origin.getClientRects().length>0&&!origin.closest('[hidden]')&&(!maximized||stage.current.contains(origin)))origin.focus({preventScroll:true});else recovery.current.focus({preventScroll:true});}
  function closeDetails(){setDetailsOpen(false);restoreFocus(detailsOrigin.current,detailsButton);}
  function openTopic(id,inspect=false){
    // Entry links and search reveal the registered path in this same tree.
    // Missing refreshed identities remain an explicit incompatibility below.
    if(!graph.nodes.some(n=>n.id===id)){setView(v=>({...v,selected:id}));return;}
    if(view.root!==null&&view.root!==id)setHistory(h=>[...h,{view,groups,selection}]);
    const next=revealInExplorer(graph,view,groups,id,{expand:true});
    setView(next.view);setGroups(next.groups);setSelection({kind:'record',id});setDetailsOpen(inspect);setMessage('');setFocus(null);
    requestAnimationFrame(()=>stage.current?.querySelector(`[data-record-occurrence="${CSS.escape(id)}"]`)?.scrollIntoView({block:'nearest',inline:'nearest'}));
  }
  function select(id){
    const next=revealInExplorer(graph,view,groups,id);setView(next.view);setGroups(next.groups);setFocus(id);choose('record',id);
  }
  function activateRecord(id,occurrence=id){
    const node=graph.nodes.find(n=>n.id===id);rememberOrigin();
    setView(v=>({...v,root:node.kind==='entity'?id:v.root,selected:id,expanded:canExpandRecord(graph,id)?v.expanded.includes(occurrence)?v.expanded.filter(key=>key!==occurrence):[...v.expanded,occurrence]:v.expanded}));
    setFocus(id);setSelection({kind:'record',id});setDetailsOpen(true);
  }
  function toggleGroup(id,parents=[]){setGroups(current=>{const next=new Set(current);parents.forEach(p=>next.add(p));if(next.has(id))next.delete(id);else next.add(id);return [...next];});}
  function previousTopic(){const last=history.at(-1);setView(last.view);setGroups(last.groups);setSelection(last.selection);setHistory(h=>h.slice(0,-1));setFocus(null);setDetailsOpen(false);}
  function resetSelection(){setSelection(null);setDetailsOpen(false);setFocus(null);setView(v=>({...v,selected:null}));}
  function resetView(){setView(initialExplorerView());setGroups([]);setHistory([]);resetSelection();}
  function stageKeys(e){if(!maximized||e.defaultPrevented)return;if(e.key==='Escape'){e.preventDefault();setMaximized(false);maximizeButton.current.focus({preventScroll:true});}if(e.key==='Tab'){const controls=[...stage.current.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),summary,[tabindex="0"]')].filter(n=>n.getClientRects().length>0&&!n.closest('[hidden]'));if(e.shiftKey&&document.activeElement===controls[0]){e.preventDefault();controls.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===controls.at(-1)){e.preventDefault();controls[0].focus();}}}
  async function searchTopics(e){e.preventDefault();if(query.trim()===''){setMessage('Enter a topic name, identity or alias.');return;}const params=new URLSearchParams({text:query});if(entityType!=='')params.set('entity_type',entityType);await searchResource.load(`knowledge/search?${params}`,graph);}
  function refresh(){searchResource.cancel();resource.load('knowledge/explorer');}
  const selectedId=selection===null?null:selection.id;
  return <main id="knowledge-main" className="knowledge-explorer" hidden={!active} tabIndex={-1}>
    <header className="explorer-heading"><div><h1 id="knowledge-title" tabIndex={-1}>Knowledge Explorer</h1><p>Expand the structure, then follow topics and evidence in the same view.</p></div><div><button onClick={onReturn}>Return to previous workspace</button><button onClick={refresh}>Refresh explorer</button></div></header>
    {state.status==='error'?<div role="alert"><p>{state.error}</p><button onClick={refresh}>Retry explorer</button></div>:graph===null?<p role="status">Loading registered knowledge…</p>:<>
      <p className="explorer-coverage"><strong>Registered knowledge only.</strong> {graph.nodes.length} records · {graph.edges.length} connections · {graph.issues.length} unresolved issues. Reviewed {graph.reviewed_on}. Projects and unregistered dependencies remain outside this view.</p>
      <details className="explorer-find"><summary>Find a topic</summary><form className="explorer-search" onSubmit={searchTopics}><label>Find a registered topic<input type="search" value={query} onChange={e=>setQuery(e.target.value)}/></label><label>Search topic type<select aria-label="Search topic type" value={entityType} onChange={e=>setEntityType(e.target.value)}><option value="">All topic types</option>{Object.entries(ENTITY_TYPES).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><button type="submit">Search topics</button></form>
        {message!==''&&<p role="status">{message}</p>}{search.status==='loading'&&<p role="status">Searching registered topics…</p>}{search.status==='error'&&<div role="alert"><p>{search.error}</p><button onClick={refresh}>Refresh explorer</button></div>}
        {search.value!==null&&<section aria-label="Topic search results"><p>{search.value.ambiguous?'Several topics match; choose the intended identity.':search.value.matches.length===0?'No registered topics match. This does not establish an absence of research outside the registered collection.':'Matching topic'}</p>{search.value.matches.map(e=><button key={e.id} onClick={()=>openTopic(e.id)}>{e.label} · {ENTITY_TYPES[e.type]}</button>)}</section>}
        <details><summary>Browse all registered topics</summary>{graph.nodes.filter(n=>n.kind==='entity').map(n=><button key={n.id} onClick={()=>openTopic(n.id)}>{n.label} · {ENTITY_TYPES[n.details.entity.type]}</button>)}</details>
      </details>
      <nav aria-label="Starting topics" className="explorer-starts">{graph.coverage.root_entities.map(id=><button key={id} onClick={()=>openTopic(id)}>{graph.nodes.find(n=>n.id===id).label}</button>)}</nav>
      {viewError!==''?<div role="alert"><p>{viewError}</p><button onClick={()=>{resetView();}}>Reset explorer</button></div>:<>
        <section ref={stage} className={`explorer-stage${maximized?' is-maximized':''}`} role={maximized?'dialog':undefined} aria-modal={maximized?true:undefined} aria-label="Knowledge neighbourhood" tabIndex={-1} onKeyDown={stageKeys}>
          <div className="explorer-stage-actions"><div className="explorer-expand"><button disabled={history.length===0} onClick={previousTopic}>Previous topic</button><button onClick={resetView}>Reset view</button></div><div className="explorer-window-tools"><div role="group" aria-label="Presentation"><button aria-pressed={format==='map'} onClick={()=>setPreference('map')}>Map</button><button aria-pressed={format==='outline'} onClick={()=>setPreference('outline')}>Outline</button></div><details className="explorer-advanced"><summary>Advanced</summary><button aria-pressed={format==='network'} onClick={()=>setPreference('network')}>Advanced Network</button></details><button ref={detailsButton} disabled={selection===null} aria-controls="explorer-record-details" aria-expanded={detailsOpen} onClick={()=>{if(detailsOpen)closeDetails();else{rememberOrigin();setDetailsOpen(true);requestAnimationFrame(()=>panel.current.focus({preventScroll:true}));}}}>Record details</button><button ref={maximizeButton} aria-pressed={maximized} onClick={()=>setMaximized(v=>!v)}>{maximized?'Restore workspace':format==='outline'?'Maximize view':'Maximize graph'}</button></div></div>
          <div className="explorer-reading-bar"><p>Sources → Knowledge → Rules → Projects <small>· {format==='network'?'Advanced Network':format==='outline'?'Outline':'Map'}</small></p><details><summary>Filters & view options</summary><div className="explorer-controls"><label>Claim category<select aria-label="Claim category" value={view.category} onChange={e=>setView(v=>({...v,category:e.target.value}))}><option value="all">All claim categories</option>{Object.entries(EVIDENCE_KINDS).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></label><label>Claim review<select aria-label="Claim review" value={view.status} onChange={e=>setView(v=>({...v,status:e.target.value}))}><option value="all">All review states</option><option value="curated">Curated</option><option value="unresolved">Unresolved</option></select></label><details><summary>Topic relationship types</summary>{Object.keys(RELATION_TYPES).map(id=><label key={id}><input type="checkbox" checked={view.relationTypes.includes(id)} onChange={e=>setView(v=>({...v,relationTypes:e.target.checked?[...v.relationTypes,id]:v.relationTypes.filter(t=>t!==id)}))}/>{graph.relation_types[id]}</label>)}</details></div></details></div>
          {format==='network'?<AdvancedNetwork zoom={zoom} setZoom={setZoom} presentation={presentation} graph={graph} view={view} selected={selectedId} expandedRecords={view.expanded} onRecord={activateRecord} onFocus={setFocus}/>:format==='outline'?<StructuredOutline presentation={presentation} graph={graph} open={groups} selected={selectedId} onToggle={toggleGroup} expandedRecords={view.expanded} onRecord={activateRecord} onIssue={id=>choose('issue',id)} onWeb={id=>choose('web',id)} onFocus={setFocus} onAssumption={id=>choose('assumption',id)}/>:<GroupedMap presentation={presentation} graph={graph} open={groups} selected={selectedId} zoom={zoom} setZoom={setZoom} onToggle={toggleGroup} expandedRecords={view.expanded} onRecord={activateRecord} onIssue={id=>choose('issue',id)} onWeb={id=>choose('web',id)} onFocus={setFocus} onAssumption={id=>choose('assumption',id)}/>}
        <details className="explorer-connection-outline"><summary>Inspect connections</summary><p>Architecture explains responsibilities. Registered connections retain their exact original records. Indented branches show display grouping, not a scientific dependency.</p>{presentation.connections.map(connection=><button key={connection.id} data-display-connection={connection.id} onClick={()=>choose('connection',connection.id)}>{connection.kind==='architecture'?'Architecture':connection.kind==='organization'?'Display grouping':'Registered'} · {connection.label}{connection.kind==='registered'?` · ${connection.edgeIds.length} connections`:''}</button>)}</details>
          <ExplorerInspector geometryRef={inspectorGeometry} active={active} open={detailsOpen} narrow={narrow} containerRef={stage} panelRef={panel} recordId={selectedId} mode={format} onClose={closeDetails}><button className="explorer-reset-selection" onClick={resetSelection}>Reset selection</button><SelectedDetails selection={selection} presentation={presentation} graph={graph} request={request} onSelect={select} onCenter={id=>openTopic(id,true)} onRefresh={refresh} active={active&&detailsOpen}/></ExplorerInspector>
        </section>
        <p role="status" aria-label="Visible knowledge records">{presentation.counts.records} in scope of {graph.nodes.length} registered records · {presentation.counts.connections} registered connections in scope. {presentation.cards.length} display cards · {presentation.counts.visibleRecords} individual records revealed · {presentation.collection.filtered} filtered. Display groups do not add knowledge records.</p>

      </>}
      <details><summary>Dataset provenance and coverage</summary><p>{graph.dataset_id} · {graph.dataset_hash}</p><p>Feature registration: {graph.consumer_registry_hash}</p><ul>{graph.coverage.excluded.map(s=><li key={s}>{s}</li>)}</ul></details>
    </>}
  </main>;
}
