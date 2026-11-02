// Validate the lookup interface; all comparison and scoring math stays in Python.
export function validateStatisticsResponse(value){
  function require(test){if(!test)throw Error("Incompatible AL20 statistics response. Restart Python and reload the lookup.");}
  require(value!==null&&typeof value==="object"&&value.version===1&&typeof value.dataset_hash==="string"&&/^[0-9a-f]{64}$/.test(value.dataset_hash));
  const data=value.dataset;
  require(data!==null&&typeof data==="object"&&data.version===1&&data.status==="provisional"&&Number.isInteger(data.year));
  require(Array.isArray(data.municipalities)&&data.municipalities.length===32&&new Set(data.municipalities.map(r=>r.name)).size===32);
  require(data.municipalities.every(r=>typeof r.name==="string"&&r.name&&Number.isInteger(r.population)&&r.population>=0&&Number.isInteger(r.businesses)&&r.businesses>=0));
  require(Array.isArray(data.sources)&&data.sources.length>0&&Array.isArray(data.limitations)&&data.limitations.every(t=>typeof t==="string"));
  require(data.defaults!==null&&typeof data.defaults==="object"&&data.defaults.municipality===null&&data.defaults.population_mode==="unconfirmed"&&data.defaults.settlement_name===null&&data.defaults.population===null&&data.defaults.population_year===null);
  require(data.benchmarks!==null&&typeof data.benchmarks==="object"&&["population_zrl_median","population_zrl_mean","population_andalusia_median","population_andalusia_mean","businesses_zrl_median","businesses_zrl_mean"].every(k=>typeof data.benchmarks[k]==="string"&&/^\d+(\.\d+)?$/.test(data.benchmarks[k])));
  return value;
}

export function validateLocationMetadata(value){
 const require=ok=>{if(!ok)throw Error("Incompatible saved location decision. Retain your draft and restart Python before reloading.");};
 const object=v=>v!==null&&typeof v==="object"&&!Array.isArray(v);
 const settings=v=>{require(object(v)&&Object.keys(v).sort().join(',')==='municipality,population,population_mode,population_year,settlement_name');require(typeof v.municipality==='string'&&['unconfirmed','municipality_proxy','settlement'].includes(v.population_mode)&&(v.settlement_name===null||typeof v.settlement_name==='string')&&(v.population===null||Number.isInteger(v.population)&&v.population>=0)&&(v.population_year===null||Number.isInteger(v.population_year)));};
 require(object(value)&&[1,2].includes(value.version)&&typeof value.dataset_id==='string'&&/^[a-f0-9]{64}$/.test(value.dataset_hash)&&Array.isArray(value.automated)&&new Set(value.automated).size===value.automated.length&&value.automated.every(id=>['AT.3','RD.5'].includes(id)));
 require(Object.keys(value).sort().join(',')===(value.version===1?'automated,dataset_hash,dataset_id,settings,version':'automated,dataset_hash,dataset_id,items,version'));
 if(value.version===1){settings(value.settings);return value;}
 require(object(value.items)&&Object.keys(value.items).every(id=>['AT.3','RD.5'].includes(id))&&value.automated.every(id=>Object.hasOwn(value.items,id)));
 for(const [id,item] of Object.entries(value.items)){require(object(item)&&Object.keys(item).sort().join(',')==='before_answers,settings');settings(item.settings);const expected=id==='AT.3'?['AT.3.1','AT.3.2']:['RD.5.1'];require(item.before_answers===null||object(item.before_answers)&&Object.keys(item.before_answers).length===expected.length&&expected.every(k=>Object.hasOwn(item.before_answers,k)&&[true,false,null].includes(item.before_answers[k])));}
 return value;
}

export function detachLocationCriterion(assessment,id){
 if(!Object.hasOwn(assessment,'location_lookup'))throw Error('This assessment has no location setup.');
 const old=validateLocationMetadata(assessment.location_lookup);
 if(!['AT.3','RD.5'].includes(id))throw Error('Unknown location criterion.');
 const metadata=old.version===2?old:{version:2,dataset_id:old.dataset_id,dataset_hash:old.dataset_hash,automated:[...old.automated],items:Object.fromEntries(old.automated.map(cid=>[cid,{settings:cid==='RD.5'?{...old.settings,population_mode:'unconfirmed',settlement_name:null,population:null,population_year:null}:{...old.settings},before_answers:null}]))};
 return {...assessment,location_lookup:{...metadata,automated:metadata.automated.filter(cid=>cid!==id)}};
}

export function initialLocationSettings(dataset,assessment,criterion,municipality){
 if(Object.hasOwn(assessment,'location_lookup')){const saved=validateLocationMetadata(assessment.location_lookup);if(saved.version===1)return {...saved.settings};if(Object.hasOwn(saved.items,criterion))return {...saved.items[criterion].settings};}
 return {...dataset.defaults,municipality:dataset.municipalities.some(row=>row.name===municipality)?municipality:null};
}

export function validateLocationDecision(value){
 const require=ok=>{if(!ok)throw Error('Incompatible location comparison. Keep your inputs, restart Python and retry the preview.');};
 const obj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v),finite=v=>typeof v==='number'&&Number.isFinite(v),hash=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
 require(obj(value)&&value.version===1&&typeof value.route==='string'&&typeof value.dataset_id==='string'&&hash(value.dataset_hash)&&Number.isInteger(value.year)&&finite(value.before_score)&&obj(value.decisions)&&obj(value.hashes));
 function proposal(p){require(obj(p)&&obj(p.settings)&&typeof p.municipality==='string'&&typeof p.basis==='string'&&Number.isInteger(p.year)&&obj(p.answers)&&Object.values(p.answers).every(v=>[true,false,null].includes(v))&&finite(p.points)&&finite(p.cap)&&p.points>=0&&p.points<=p.cap&&typeof p.outcome==='string'&&typeof p.explanation==='string'&&Array.isArray(p.comparisons)&&p.comparisons.length>0&&Array.isArray(p.sources)&&p.sources.length>0);for(const c of p.comparisons)require(obj(c)&&typeof c.label==='string'&&finite(c.left)&&c.operator==='<'&&typeof c.right==='string'&&/^\d+(\.\d+)?$/.test(c.right)&&typeof c.result==='boolean'&&Array.isArray(c.source_pages));for(const s of p.sources)require(obj(s)&&typeof s.document_id==='string'&&Number.isInteger(s.page)&&s.page>0&&hash(s.sha256)&&typeof s.label==='string'&&typeof s.role==='string');}
 require(Object.keys(value.decisions).length===2);
 for(const id of ['AT.3','RD.5']){const d=value.decisions[id];require(obj(d)&&d.id===id&&typeof d.label==='string'&&typeof d.ready==='boolean'&&typeof d.active==='boolean'&&typeof d.error==='string'&&obj(d.before_answers)&&finite(d.before_points)&&Array.isArray(d.choices)&&d.choices.length>0);for(const c of d.choices)require(obj(c)&&typeof c.id==='string'&&typeof c.label==='string'&&typeof c.points==='string'&&Object.hasOwn(d.before_answers,c.id));require(Object.values(d.before_answers).every(v=>[true,false,null].includes(v)));if(d.ready){proposal(d.proposal);require(finite(d.points_delta)&&finite(d.after_score)&&hash(value.hashes[id]));}else require(d.proposal===null&&d.error.length>0&&d.points_delta===null&&d.after_score===null&&value.hashes[id]===null);if(d.last_applied!==null){require(obj(d.last_applied)&&typeof d.last_applied.legacy_no_population==='boolean');if(d.last_applied.legacy_no_population)require(typeof d.last_applied.outcome==='string'&&obj(d.last_applied.settings)&&Number.isInteger(d.last_applied.year));else{proposal(d.last_applied);require(d.last_applied.before_answers===null?d.last_applied.before_points===null:obj(d.last_applied.before_answers)&&finite(d.last_applied.before_points));}}}
 require(value.decisions['AT.3'].ready&&value.decisions['RD.5'].ready?hash(value.hashes.both)&&finite(value.both_after_score):value.hashes.both===null&&value.both_after_score===null);
 return value;
}
