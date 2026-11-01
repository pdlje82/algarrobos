// Optional navigation state belongs to an exploration, not its scoring claims.
export function fundingFocus(draft){
  if(!Object.hasOwn(draft,"navigator_focus"))return {version:1,programme_id:null,route_id:null};
  const focus=draft.navigator_focus;
  const fail=()=>{throw Error("Invalid saved funding programme/route focus. Retain your draft and reload a compatible exploration.");};
  if(focus===null||typeof focus!=="object"||Array.isArray(focus)||Object.keys(focus).sort().join(",")!=="programme_id,route_id,version"||focus.version!==1)fail();
  if(focus.programme_id!==null&&(typeof focus.programme_id!=="string"||!focus.programme_id.trim()||focus.programme_id.length>100))fail();
  if(focus.route_id!==null&&(focus.programme_id===null||typeof focus.route_id!=="string"||!draft.bundle.entries.some(e=>e.id===focus.route_id)))fail();
  return focus;
}
export function editFundingFocus(draft,programmeId,routeId){
  const next={...draft,navigator_focus:{version:1,programme_id:programmeId,route_id:routeId}};
  fundingFocus(next);
  return next;
}
export function validateFundingFocusMembership(value,draft){
  const focus=fundingFocus(draft);
  if(focus.programme_id===null)return;
  const programme=value.library.programmes.find(p=>p.id===focus.programme_id);
  if(programme===undefined||focus.route_id!==null&&!programme.entry_ids.includes(focus.route_id))throw Error("The saved programme/route selection is absent or incompatible with the programme library. Retry the programme list or update the reference library; your exploration is retained.");
}
