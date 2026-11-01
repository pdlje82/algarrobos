import {programmeMembers} from "./fundingProgrammeState.js";

export function programmeNodeLayout(value,catalogue,selected,{browse,search,expandedFamilies}){
  const rows=[];let top=44;
  const add=(kind,key,data,height)=>{rows.push({kind,key,...data,top,height});top+=height+8;};
  if(value===null)return {rows,height:240}; // The column renders an explicit loading/error state.
  const programmes=value.library.programmes.filter(p=>programmeMembers(p,catalogue).length>0);
  const chosen=selected===null?null:programmes.find(p=>p.id===selected);
  if(selected!==null&&chosen===undefined)throw Error("The graph programme is absent from this catalogue. Clear programme focus and retry.");
  const norm=s=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase(),query=norm(search.trim());
  if(chosen!==null){add("programme",`programme:${chosen.id}`,{programme:chosen,selected:true},124);add("browse","programme-browser",{count:programmes.length-1},60);}
  if(chosen!==null&&!browse&&query==="")return {rows,height:top+16};
  for(const [id,title] of Object.entries(value.library.families)){
    const matches=programmes.filter(p=>p.family===id&&p.id!==selected&&(query===""||norm(`${p.title} ${p.id} ${p.entry_ids.join(" ")}`).includes(query)));
    if(matches.length===0)continue;
    const expanded=query!==""||expandedFamilies.includes(id);
    add("family",`family:${id}`,{id,title,count:matches.length,expanded},72);
    if(expanded)for(const p of matches)add("programme",`programme:${p.id}`,{programme:p,selected:false,indented:true},124);
  }
  if(rows.every(r=>r.kind!=="family")&&query!=="")add("empty","programme-search-empty",{},76);
  return {rows,height:top+16};
}
