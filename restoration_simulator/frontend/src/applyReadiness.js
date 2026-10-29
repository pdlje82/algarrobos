import { required } from "./contracts.js";

// One policy supplies both the disabled button and its explanations. Ecological
// suitability, price confirmation and plotting status are not new prerequisites.
export function applyReadiness(facts){
  for(const key of ["busy","stale","available","saved","dirty","failedEdit","pendingRules","plantInputs","diameterInputs"])
    required(typeof facts[key]==="boolean",`Missing Apply readiness flag: ${key}.`);
  required(Number.isInteger(facts.plants)&&facts.plants>=0&&typeof facts.error==="string","Invalid Apply readiness state.");
  required(facts.parcel===null||typeof facts.parcel==="string","Missing Apply parcel link.");
  const reasons=[];
  const add=(id,text,action,actionLabel)=>reasons.push({id,text,action,actionLabel});
  if(facts.busy)add("busy","Wait for the current request to finish.",null,null);
  if(facts.stale)add("stale","The project changed. Reload the saved designer before continuing.","reload_project","Reload project view");
  if(!facts.available){required(typeof facts.reason==="string"&&facts.reason.trim()!=="","Python must explain why planning is unavailable.");add("unavailable",facts.reason,null,null);}
  if(facts.pendingRules)add("rules","Finish or cancel the updated-rules review.","rules","Open rules review");
  if(facts.error!==""||facts.failedEdit)add("failed",facts.error!==""?facts.error:"Resolve or discard the failed edit.","failed","Review failed edit");
  if(facts.diameterInputs)add("diameter","Finish, correct or discard diameter edits.","diameter","Finish diameter edit");
  if(facts.plantInputs)add("inputs","Finish or discard incomplete plant inputs.","plants","Finish plant inputs");
  if(facts.plants===0)add("plants","Select at least one plant with a positive quantity.","plants","Choose plants");
  if(facts.parcel===null)add("parcel","Choose a pilot parcel in Zone, then save the design.","parcel","Choose pilot parcel");
  if(!facts.saved||facts.dirty){
    const canFocusSave=!facts.busy&&!facts.stale&&facts.error===""&&!facts.failedEdit&&!facts.pendingRules&&!facts.plantInputs&&!facts.diameterInputs;
    add("save",facts.saved?"Save the latest design changes.":"Save this design under a name.",canFocusSave?"save":null,canFocusSave?"Save design":null);
  }
  return {canApply:reasons.length===0,reasons,processing:facts.busy};
}
