import { displayPlant } from "./plantNames.js";
// These are already resolved purchasing records from Python, never draft prices.
export function plantOrderRows(demonstrator,planning=null) {
  if(planning!==null&&planning.saved){
    if(planning.planting===null)return plantOrderRows(demonstrator);
    return plantOrderRows({status:"Planned",legacy:false,planting:planning.planting});
  }
  if(demonstrator.status==="Not planned")return {state:"empty",rows:[]};
  if(demonstrator.legacy===true||demonstrator.planting===null)return {state:"unavailable",rows:[]};
  const entries=demonstrator.planting?.entries;
  if(!Array.isArray(entries))throw new Error("Applied plan is missing its resolved plant order list. Restart Python and reload.");
  for(const row of entries){
    if(typeof row.id!=="string"||typeof row.label!=="string"||typeof row.custom!=="boolean"||!Number.isInteger(row.quantity)||row.quantity<1||!Number.isFinite(row.unit_cost)||row.unit_cost<0||![true,false,null].includes(row.price_confirmed))
      throw new Error("Applied plant order record is incomplete. Reload the project; no current prices have been substituted.");
  }
  return {state:"ready",rows:entries.map(displayPlant).sort((a,b)=>a.label.localeCompare(b.label,"es"))};
}
