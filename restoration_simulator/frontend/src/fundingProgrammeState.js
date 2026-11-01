// Navigation uses Python's condition dependencies; it never computes eligibility.
export function programmeConditions(conditions,catalogue){
  const cash=new Set(catalogue.entries.filter(e=>e.mechanism==="existing_cash").map(e=>e.id));
  return conditions.map(c=>{
    if(!cash.has(c.option_id)||c.effect!=="eligibility")return c;
    if(c.fields.length!==1||c.fields[0]!=="available_contribution")throw Error("Unsupported existing-cash requirement. Update the financial-question presentation before using this catalogue.");
    // Frozen evaluators call the contribution check 'eligibility'. It is a financial input,
    // not grant eligibility; retain its result and message under the amount-question control.
    return {...c,effect:"amount"};
  });
}
export function validateProgrammesResponse(value){
  const require=ok=>{if(!ok)throw Error("Incompatible funding programme library. Restart Python and retry the programme list.");};
  const obj=v=>v!==null&&typeof v==="object"&&!Array.isArray(v),str=v=>typeof v==="string"&&v.trim().length>0;
  const date=v=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&!Number.isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
  require(obj(value)&&value.version===1&&str(value.library_hash)&&/^[a-f0-9]{64}$/.test(value.library_hash));
  const d=value.library;require(obj(d)&&d.version===1&&date(d.checked_on)&&obj(d.defaults)&&obj(d.families)&&Object.keys(d.families).length>0&&Object.values(d.families).every(str)&&Array.isArray(d.programmes)&&d.programmes.length>0);
  for(const key of ["compare","show_met","show_amount","show_other_routes"])require(typeof d.defaults[key]==="boolean");
  const ids=new Set(),members=new Set();
  for(const p of d.programmes){
    require(obj(p)&&["id","title","kind","family","summary"].every(k=>str(p[k]))&&["programme","programme_family","legal_framework","historical","mechanism","emerging","advisory"].includes(p.kind)&&!ids.has(p.id)&&Object.hasOwn(d.families,p.family)&&Array.isArray(p.entry_ids)&&p.entry_ids.length>0&&p.entry_ids.every(id=>str(id)&&!members.has(id))&&new Set(p.entry_ids).size===p.entry_ids.length);ids.add(p.id);p.entry_ids.forEach(id=>members.add(id));
    const g=p.guide;require(obj(g)&&["title","what","fit","advantages","limitations","next_steps","availability"].every(k=>str(g[k]))&&date(g.checked_on)&&g.checked_on<=d.checked_on&&g.kind===p.kind&&Array.isArray(g.sources)&&g.sources.length>0&&Array.isArray(g.unresolved)&&g.unresolved.every(str));
    for(const s of g.sources)require(obj(s)&&["title","issuer","note"].every(k=>str(s[k]))&&date(s.checked_on)&&s.checked_on<=d.checked_on&&(s.date===null||date(s.date))&&(s.url===null||str(s.url)&&/^https:\/\/[^/\s]+/.test(s.url))&&(s.document_id===null?s.page===null&&s.sha256===null&&s.url!==null:str(s.document_id)&&Number.isInteger(s.page)&&s.page>0&&typeof s.sha256==="string"&&/^[a-f0-9]{64}$/.test(s.sha256)));
  }
  return value;
}
export function programmeForRoute(value,id){
  const p=value.library.programmes.find(p=>p.entry_ids.includes(id));
  if(p===undefined)throw Error(`No programme membership is registered for ${id}. Retry the programme list or update the reference library.`);
  return p;
}
export function programmeMembers(programme,catalogue){
  const ids=new Set(catalogue.entries.map(e=>e.id));
  return programme.entry_ids.filter(id=>ids.has(id)); // Current references may include routes absent from a historical snapshot.
}
export function validateProgrammeMembership(value,catalogue){
  for(const e of catalogue.entries)programmeForRoute(value,e.id);
}
export function routeQuestionScope(questions,conditions,routeIds,showAmount){
  const routes=new Set(routeIds),linked=conditions.filter(c=>routes.has(c.option_id)&&(c.effect==="eligibility"||showAmount));
  const ids=new Set(linked.flatMap(c=>c.fields)),known=new Set(questions.map(q=>q.id));
  if([...ids].some(id=>!known.has(id))||linked.some(c=>!["pass","unknown","fail"].includes(c.result)||!["eligibility","amount"].includes(c.effect)))throw Error("Funding route dependencies are incomplete. Restart Python and retry assessment.");
  const all=questions.filter(q=>ids.has(q.id));
  const met=all.filter(q=>linked.filter(c=>c.fields.includes(q.id)).every(c=>c.result==="pass"));
  const metIds=new Set(met.map(q=>q.id));
  return {all,met,attention:all.filter(q=>!metIds.has(q.id))};
}
export function visibleRouteQuestions(scope,{showMet,heldIds,pinnedIds}){
  const byId=new Map(scope.all.map(q=>[q.id,q])),held=heldIds.filter(id=>byId.has(id)),pinned=new Set(pinnedIds);
  // Keep the editor's existing node order until close/advance; append newly required inputs.
  if(held.length>0){const ids=new Set(held);return [...held.map(id=>byId.get(id)),...scope.attention.filter(q=>!ids.has(q.id)),...scope.met.filter(q=>!ids.has(q.id)&&(showMet||pinned.has(q.id)))];}
  return [...scope.attention,...scope.met.filter(q=>pinned.has(q.id)),...(showMet?scope.met.filter(q=>!pinned.has(q.id)):[])];
}
export function routeCoverage(conditions,id){
  const c=conditions.filter(c=>c.option_id===id);
  return {fit:c.some(c=>c.effect==="eligibility"),amount:c.some(c=>c.effect==="amount")};
}
