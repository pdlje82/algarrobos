import React, {useEffect,useRef,useState} from "react";

export function FundingMunicipality({question:q,value,disabled,onChange,onFlush,resetKey}){
  const [search,setSearch]=useState(""),[manual,setManual]=useState(false);
  const initialReset=useRef(resetKey);
  useEffect(()=>{if(initialReset.current!==resetKey){initialReset.current=resetKey;setManual(false);setSearch("");}},[resetKey]);
  const previous=q.municipality_selection;
  const initial=q.municipality_initial_selection;
  const selection=value===null||value.trim().toLowerCase()==="unknown"||value===""?"__unknown__":q.municipalities.includes(value)?value:value===q.initial_value?initial:value.toLowerCase()==="outside al20"||value.toLowerCase()==="outside"?"__outside__":previous===value?previous:"__other__";
  // Python supplies canonical aliases for inherited spellings; matching here only selects a UI option.
  const resolved=JSON.stringify(value)===JSON.stringify(q.assessed_value)?q.municipality_selection:selection;
  const shown=manual?"__other__":resolved;
  const matches=q.municipalities.filter(name=>name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().includes(search.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()));
  const options=matches.includes(shown)||shown.startsWith("__")?matches:[shown,...matches];
  return <div className="funding-municipality">
    <label className="funding-input-caption" htmlFor="funding-municipality-search">Find a municipality</label><input id="funding-municipality-search" type="search" value={search} disabled={disabled} onChange={e=>setSearch(e.target.value)} placeholder="Search the verified AL20 list"/>
    <select id="funding-municipality" value={shown} disabled={disabled} onChange={e=>{const choice=e.target.value;setManual(choice==="__other__");onChange(choice==="__unknown__"||choice==="__other__"?null:choice==="__outside__"?"outside AL20":choice);}}>
      <option value="__unknown__">Unknown / I don’t know yet</option><optgroup label="Verified AL20 municipalities">{options.map(name=><option key={name} value={name}>{name}</option>)}</optgroup><option value="__other__">Another municipality</option><option value="__outside__">Outside AL20 — coverage checked</option>
    </select>
    {shown==="__other__"&&<><label className="funding-input-caption" htmlFor="funding-municipality-other">Municipality name (coverage not yet verified)</label><input id="funding-municipality-other" value={value===null?"":value} disabled={disabled} maxLength={1000} onChange={e=>onChange(e.target.value===""?null:e.target.value,200)} onBlur={onFlush} onKeyDown={e=>{if(e.key==="Enter")onFlush();}}/></>}
    {shown==="__outside__"&&<p>Outside-area location is an explicit scenario assumption. Some programmes have conditional exceptions requiring verification.</p>}
    {search&&<small>{matches.length} listed municipalities match this search.</small>}
  </div>;
}
