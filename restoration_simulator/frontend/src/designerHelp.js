import data from "./designer-help.json" with { type: "json" };

export function validateDesignerHelp(value) {
  const fail=message=>{throw new Error(`Invalid designer help: ${message}`);};
  const text=(v,path)=>{if(typeof v!=="string"||!v.trim())fail(path);};
  if(value?.version!==1)fail("unsupported version");
  for(const group of ["features","rules","combinations","placement","unplaced"])
    if(!value[group]||typeof value[group]!=="object"||Array.isArray(value[group]))fail(group);
  const topics=["zone","approaches","combinations","dimensions","placement","mulch","unplaced","density","pocket"];
  for(const id of topics){const v=value.features[id];if(!v)fail(`missing feature ${id}`);text(v.title,id);text(v.text,id);}
  for(const id of ["mr1","mr2","pocket","stone_mulch","density","autumn","survival","care","layout","companion_context","density_scenarios","plant_dimensions","root_ball_default","mature_diameters","shrub_placement"])
    if(!value.rules[id])fail(`missing rule ${id}`);
  for(const id of ["mr1_mix","mr2_mix","lentisk_series","coscoja_series","system_woodland","system_scrub","system_arid","system_watercourse"])
    text(value.combinations[id],`combination ${id}`);
  for(const id of ["associated","manual","tree","open_ground","independent"])text(value.placement[id],`placement ${id}`);
  for(const id of ["with_tree_outside","outside","not_positioned"])text(value.unplaced[id],`unplaced ${id}`);
  for(const [id,v] of Object.entries(value.rules)){
    text(v.title,id);
    if(Object.hasOwn(v,"feature")){if(!topics.includes(v.feature))fail(`unknown feature ${id}`);}
    else if(Object.hasOwn(v,"sections")){
      if(!Array.isArray(v.sections)||!v.sections.length)fail(`sections ${id}`);
      for(const section of v.sections){text(section.title,id);if(!Array.isArray(section.paragraphs)||!section.paragraphs.length)fail(`paragraphs ${id}`);section.paragraphs.forEach(p=>text(p,id));}
    }else text(v.text,id);
    if(Object.hasOwn(v,"caution"))text(v.caution,id);
  }
  for(const group of ["combinations","placement","unplaced"])for(const [id,v] of Object.entries(value[group]))text(v,`${group}.${id}`);
  for(const state of ["off","linked","independent","unplaced","absent"])text(value.features.pocket.states?.[state],`pocket.${state}`);
  for(const key of ["crown","crown_hidden","extra","caution"])text(value.features.pocket[key],`pocket.${key}`);
  text(value.features.density.example,"density.example");
  return value;
}

export const designerHelp=validateDesignerHelp(data);
export function helpFor(group,id){
  const value=designerHelp[group][id];
  if(value===undefined)throw new Error(`Designer help unavailable for ${group}: ${id}. Update the presentation content.`);
  return value;
}
