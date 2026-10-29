import reference from "../../scenarios/plant-names.json" with { type: "json" };
import catalogue from "../../scenarios/planting-catalog-v2.json" with { type: "json" };
import { required } from "./contracts.js";

export function validatePlantNames(value) {
  const keys=(record,expected,context)=>required(record!==null&&typeof record==="object"&&!Array.isArray(record)&&Object.keys(record).length===expected.length&&expected.every(k=>Object.hasOwn(record,k)),`Invalid fields in ${context}.`);
  keys(value,["version","reviewed","plants","downloadable_documents"],"plant names");
  required(value!==null&&typeof value==="object"&&value.version===1&&typeof value.reviewed==="string"&&value.reviewed!==""&&Array.isArray(value.plants),"Invalid plant-name reference.");
  const ids=new Set();
  for(const p of value.plants){
    keys(p,["id","spanish","spanish_aliases","german","scientific","german_status","note","references"],"plant identity");
    for(const k of ["id","spanish","scientific","note"])required(typeof p[k]==="string"&&p[k].trim()!=="",`Missing plant name ${k}.`);
    required(!ids.has(p.id),`Duplicate plant name ${p.id}.`);ids.add(p.id);
    required(Array.isArray(p.spanish_aliases)&&p.spanish_aliases.every(a=>typeof a==="string"&&a.trim()!==""),`Invalid aliases for ${p.id}.`);
    required((p.german_status==="not_established"&&p.german===null)||(p.german_status==="verified"&&typeof p.german==="string"&&p.german.trim()!==""),`Missing German name evidence for ${p.id}.`);
    required(Array.isArray(p.references)&&p.references.length>0&&p.references.every(url=>typeof url==="string"&&url.startsWith("https://")),`Missing name sources for ${p.id}.`);
  }
  required(ids.size===catalogue.plants.length&&catalogue.plants.every(p=>ids.has(p.id)),"Plant names must cover every catalogue entry exactly.");
  required(Array.isArray(value.downloadable_documents)&&value.downloadable_documents.every(d=>typeof d.title==="string"&&d.title!==""&&typeof d.url==="string"&&d.url.startsWith("https://")&&["suggested","in_library"].includes(d.library_status)),"Invalid downloadable name references.");
  return value;
}
export const plantNameReference=validatePlantNames(reference);
const names=new Map(plantNameReference.plants.map(p=>[p.id,p]));
export function plantNames(id){required(names.has(id),`Plant names unavailable for ${id}. Check plant-names.json.`);return names.get(id);}
export const germanName=p=>p.german===null?"German name not established":p.german;
export function displayPlant(plant){return plant.id.startsWith("custom-")?plant:{...plant,label:plantNames(plant.id).spanish};}
export function displayCatalogue(value){return {...value,plants:value.plants.map(displayPlant).sort((a,b)=>a.label.localeCompare(b.label,"es"))};}
export function plantSearchText(id){const p=plantNames(id);return [p.spanish,...p.spanish_aliases,p.german===null?"":p.german,p.scientific].join(" ").toLocaleLowerCase();}

// Immutable catalogue labels also identify old presentation wording. This
// conversion is for app-authored text, never user input or original evidence.
const aliases=catalogue.plants.filter(p=>!["retama","esparto","lycium","salsola","ziziphus"].includes(p.id)).map(p=>[p.label.toLowerCase(),p.id]);
aliases.push(["myrtle","myrtle"],["carobs","carob"]);
const aliasIds=new Map(aliases);
const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
const aliasPattern=new RegExp(`(${plantNameReference.plants.map(p=>escape(p.scientific)).sort((a,b)=>b.length-a.length).join("|")})|\\b(${[...aliasIds.keys()].sort((a,b)=>b.length-a.length).map(escape).join("|")})\\b`,"gi");
export function plantText(text){
  required(typeof text==="string","Plant presentation text must be a string.");
  return text.replace(aliasPattern,(match,scientific)=>{if(scientific!==undefined)return match;const target=plantNames(aliasIds.get(match.toLowerCase())).spanish+(match.toLowerCase()==="carobs"?"s":"");return /^[a-z]/.test(match)?target[0].toLowerCase()+target.slice(1):target;});
}
const preservedFields=new Set(["id","plant_id","source","sources","references","research","quote","quotation","credit","url","src","image","whole_image","license_url","publication_url"]);
export function plantPresentation(value){
  if(typeof value==="string")return plantText(value);
  if(Array.isArray(value))return value.map(plantPresentation);
  if(value!==null&&typeof value==="object")return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,preservedFields.has(key)?item:plantPresentation(item)]));
  return value;
}
