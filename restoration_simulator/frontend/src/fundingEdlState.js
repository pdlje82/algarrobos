// Strategy references are evidence annotations. Scoring answers remain separate.
export function validateEdlResponse(value){
  function require(ok){if(!ok)throw Error("Incompatible AL20 EDL library. Restart Python and reload the strategy content.");}
  require(value!==null&&typeof value==="object"&&value.version===1&&typeof value.library_hash==="string"&&/^[a-f0-9]{64}$/.test(value.library_hash));
  const data=value.library;
  require(data!==null&&typeof data==="object"&&data.version===1&&typeof data.id==="string"&&["title","edition","intro"].every(k=>typeof data[k]==="string"&&data[k]));
  require(data.source!==null&&typeof data.source==="object"&&data.source.document_id==="FUND-013"&&typeof data.source.sha256==="string"&&/^[a-f0-9]{64}$/.test(data.source.sha256)&&Number.isInteger(data.source.pages));
  require(Array.isArray(data.items)&&data.items.length>0&&Array.isArray(data.topics)&&data.topics.length>0&&data.bindings!==null&&typeof data.bindings==="object");
  const items=new Set(),topics=new Set();
  for(const item of data.items){require(item!==null&&typeof item==="object"&&["id","code","label","label_es","summary","section","classification"].every(k=>typeof item[k]==="string"&&item[k])&&!items.has(item.id)&&Number.isInteger(item.page)&&item.page>=1&&item.page<=data.source.pages);items.add(item.id);}
  for(const topic of data.topics){require(topic!==null&&typeof topic==="object"&&["id","title","summary","section"].every(k=>typeof topic[k]==="string"&&topic[k])&&!topics.has(topic.id)&&Array.isArray(topic.item_ids)&&new Set(topic.item_ids).size===topic.item_ids.length&&topic.item_ids.every(id=>items.has(id))&&Array.isArray(topic.pages)&&topic.pages.length>0&&topic.pages.every(p=>Number.isInteger(p)&&p>=1&&p<=data.source.pages)&&["documented","context","not_designated"].includes(topic.status)&&(topic.status==="not_designated")===(topic.item_ids.length===0));topics.add(topic.id);}
  for(const binding of Object.values(data.bindings))require(binding!==null&&typeof binding==="object"&&typeof binding.note==="string"&&Array.isArray(binding.topic_ids)&&binding.topic_ids.length>0&&binding.topic_ids.every(id=>topics.has(id)));
  return value;
}
export function edlBindingItems(value,bindingId){
  if(!Object.hasOwn(value.library.bindings,bindingId))throw Error(`No EDL content is registered for ${bindingId}. Reload the strategy library.`);
  const topics=value.library.bindings[bindingId].topic_ids.map(id=>value.library.topics.find(t=>t.id===id));
  return [...new Set(topics.flatMap(t=>t.item_ids))];
}
export function editEdlEvidence(row,value,bindingId,itemId,selected){
  if(![true,false].includes(selected)||!edlBindingItems(value,bindingId).includes(itemId))throw Error("Invalid EDL reference selection.");
  let evidence;
  if(Object.hasOwn(row,"edl_evidence")){
    evidence=row.edl_evidence;
    if(evidence.version!==1||evidence.library_id!==value.library.id||evidence.library_hash!==value.library_hash)throw Error("These references use a different EDL library edition. Retain the current draft and review the source edition before changing them.");
  }else evidence={version:1,library_id:value.library.id,library_hash:value.library_hash,selections:{}};
  const previous=Object.hasOwn(evidence.selections,bindingId)?evidence.selections[bindingId]:[];
  const ids=selected?[...new Set([...previous,itemId])]:previous.filter(id=>id!==itemId);
  return {...row,edl_evidence:{...evidence,selections:{...evidence.selections,[bindingId]:ids}}};
}
export function edlHasEvidence(row){return Object.hasOwn(row,"edl_evidence")&&Object.values(row.edl_evidence.selections).some(ids=>ids.length>0);}
export function edlSearch(text){return text.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();}
