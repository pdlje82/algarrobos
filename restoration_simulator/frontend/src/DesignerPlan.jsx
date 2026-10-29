import React, { useEffect, useRef, useState } from "react";
import { required } from "./contracts.js";
import { symbolForPlant, symbolPath } from "./plantSymbols.js";
import { designerInteractions, keyboardPosition, movementKeys } from "./designerInteractions.js";

export function DesignerPlan({ evaluation, catalogue, selected, highlightedSpecies, onSelect, onCommand, zoom, pan, setPan, disabled, showRoots, showCrowns, showClearance }) {
  const svg = useRef(null), drag = useRef(null), latest = useRef(null);
  const keyboard = useRef(null);
  const selectedOnPointerDown=useRef(null);
  const [moving, setMoving] = useState(null);
  const { draft, width, height } = evaluation;
  const padding = Math.max(width, height) / 10;
  const area = draft.physical.restoration_area;
  const point = e => { const p = svg.current.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.current.getScreenCTM().inverse()); };
  const update = value => { latest.current = value; setMoving(value); };
  function cancel() { if (drag.current !== null) setPan(drag.current.pan); drag.current = null; keyboard.current=null; update(null); }
  useEffect(() => { const key = e => { if (e.key === "Escape" && (drag.current !== null||keyboard.current!==null)) { e.preventDefault(); cancel(); } }; window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key); });
  function finishKeyboard(){
    const gesture=keyboard.current, value=latest.current;
    keyboard.current=null;
    if(gesture===null||value===null)return;
    if(gesture.start.x===value.x&&gesture.start.y===value.y){update(null);return;}
    Promise.resolve(onCommand({kind:"position",id:gesture.id,x:value.x,y:value.y})).finally(()=>update(null));
  }
  function plantKey(e,p){
    if(e.key==="Escape"&&keyboard.current!==null){e.preventDefault();e.stopPropagation();cancel();return;}
    if(!movementKeys.has(e.key)){activate(e,p.id);return;}
    e.preventDefault();e.stopPropagation();
    if(disabled||drag.current!==null||e.ctrlKey||e.altKey||e.metaKey)return;
    if(keyboard.current===null){keyboard.current={id:p.id,start:p,keys:new Set()};onSelect(p.id);}
    const gesture=keyboard.current;
    if(gesture.id!==p.id)return;
    gesture.keys.add(e.key);
    const current=latest.current===null?p:latest.current;
    update({type:"plant",id:p.id,...keyboardPosition(current,e.key,e.shiftKey,width,height)});
  }
  function plantKeyUp(e){
    if(keyboard.current===null||!movementKeys.has(e.key))return;
    e.preventDefault();e.stopPropagation();keyboard.current.keys.delete(e.key);
    if(keyboard.current.keys.size===0)finishKeyboard();
  }
  function down(e, type, id) {
    if (disabled || e.button !== 0) return;
    if(keyboard.current!==null)finishKeyboard();
    e.stopPropagation(); e.preventDefault(); svg.current.setPointerCapture(e.pointerId);
    const p = point(e);
    drag.current = { type, id, x: p.x, y: p.y, clientX: e.clientX, clientY: e.clientY, scale: svg.current.getScreenCTM().a, pan };
    if (type === "plant") {selectedOnPointerDown.current=id;onSelect(id);}
    if (type === "pocket") onSelect("pocket");
    if (type === "resize") onSelect("zone");
  }
  function move(e) {
    if (drag.current === null) return;
    const d = drag.current, p = point(e);
    if (d.type === "pan") { setPan({ x: d.pan.x - (e.clientX - d.clientX) / d.scale, y: d.pan.y - (e.clientY - d.clientY) / d.scale }); return; }
    if (d.type === "resize") {
      const vertical = d.id === "left" || d.id === "right";
      const raw = Math.abs((vertical ? p.x - width / 2 : p.y - height / 2) * 2);
      const limits = draft.bundle.defaults.aspect_limits;
      const min = Math.sqrt(area * (vertical ? limits[0] : 1 / limits[1]));
      const max = Math.sqrt(area * (vertical ? limits[1] : 1 / limits[0]));
      const length = Math.max(min, Math.min(max, raw));
      update({ type: "resize", axis: vertical ? "width" : "height", length, width: vertical ? length : area / length, height: vertical ? area / length : length });
    } else {
      const start = d.type === "pocket" ? draft.pocket : evaluation.instances.find(v => v.id === d.id);
      update({ type: d.type, id: d.id, x: Math.max(0, Math.min(width, start.x + p.x - d.x)), y: Math.max(0, Math.min(height, start.y + p.y - d.y)) });
    }
  }
  function up() {
    const d = drag.current, value = latest.current; drag.current = null;
    if (d === null || value === null) return;
    const cmd = value.type === "resize" ? { kind: "resize", axis: value.axis, length: value.length }
      : value.type === "pocket" ? { kind: "patch", section: "pocket", values: { x: value.x, y: value.y } }
      : { kind: "position", id: value.id, x: value.x, y: value.y };
    Promise.resolve(onCommand(cmd)).finally(() => update(null));
  }
  const w = moving?.type === "resize" ? moving.width : width, h = moving?.type === "resize" ? moving.height : height;
  const dx = (w - width) / 2, dy = (h - height) / 2;
  const position = p => ({ x: p.x + dx, y: p.y + dy });
  const pocket = moving?.type === "pocket" ? moving : position(draft.pocket);
  const boundary = { bottom: [0,h,w,h], top: [0,0,w,0], left: [0,0,0,h], right: [w,0,w,h] }[draft.zone.boundary_side];
  function activate(e, id) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(id); } }
  const associations = draft.version===3 ? draft.associations : {};
  function atPosition(p) {
    if(moving?.type==="plant"&&moving.id===p.id)return moving;
    const pocketTree=v=>moving?.type==="pocket"&&v.species===draft.bundle.defaults.pocket_species&&v.id.endsWith(":0")&&!v.manual;
    if(pocketTree(p))return moving;
    if(Object.hasOwn(associations,p.id)){
      const link=associations[p.id], parent=evaluation.instances.find(v=>v.id===link.parent_id);
      if(parent!==undefined){
        const at=moving?.type==="plant"&&moving.id===parent.id?moving:pocketTree(parent)?moving:position(parent);
        return {x:at.x+link.dx,y:at.y+link.dy};
      }
    }
    return position(p);
  }
  function associationLines(){
    return Object.entries(associations).filter(([id,link])=>id===selected||link.parent_id===selected).map(([id,link])=>{
      const child=evaluation.instances.find(v=>v.id===id), parent=evaluation.instances.find(v=>v.id===link.parent_id);
      if(child===undefined||parent===undefined)return null; // Unplaced relationships remain in the inspector/report.
      const a=atPosition(parent), b=atPosition(child);
      return <line key={id} className="designer-association" x1={a.x} y1={a.y} x2={b.x} y2={b.y} vectorEffect="non-scaling-stroke"><title>Associated shrub; moving the tree carries it. Moving the shrub detaches it.</title></line>;
    });
  }
  function crown(p) {
    const overlay = evaluation.overlays[p.species].crown;
    if (!showCrowns || overlay === null) return null;
    const [min, max] = overlay.diameter_m, v = atPosition(p);
    return <g key={p.id} className="designer-crown" pointerEvents="none">
      {max > min && <circle cx={v.x} cy={v.y} r={(max+min)/4} style={{strokeWidth:(max-min)/2}} className="designer-crown-band"/>}
      <circle cx={v.x} cy={v.y} r={max/2} vectorEffect="non-scaling-stroke"/>
      {max > min && <circle cx={v.x} cy={v.y} r={min/2} vectorEffect="non-scaling-stroke"/>}
      <title>{catalogue.find(s=>s.id===p.species).label}: crown / plant drawing diameter {min===max?min:`${min}–${max}`} m; {overlay.context}</title>
    </g>;
  }
  return <div className="designer-drawing">
    <div className="designer-north" aria-label="Assumed north points up"><strong>N ↑</strong><small>Assumed north</small></div>
    <svg ref={svg} className="designer-svg" viewBox={`${-padding+pan.x} ${-padding+pan.y} ${(width+2*padding)/zoom} ${(height+2*padding)/zoom}`}
      role="group" aria-label="Assumed planting zone, top-down plan" onPointerDown={e=>down(e,"pan",null)} onPointerMove={move} onPointerUp={up} onPointerCancel={cancel}>
      <title>Assumed rectangular planting zone</title><desc>Drag plants to move them. Focus a plant and use arrow keys to move {designerInteractions.keyboard_step_m} m, or Shift and arrow keys for {designerInteractions.keyboard_large_step_m} m. Escape cancels a gesture. Drag edge handles to change proportions while preserving area, or drag the circular moisture pocket by its outline. Numeric geometry and pocket controls remain available.</desc>
      <defs><pattern id="designer-organic" width=".25" height=".25" patternUnits="userSpaceOnUse"><path d="M0 .05L.2 .15M.05 .2L.25 .25" stroke="currentColor" strokeWidth=".035"/></pattern><pattern id="designer-stones" width=".25" height=".25" patternUnits="userSpaceOnUse"><circle cx=".09" cy=".08" r=".05" fill="currentColor"/><path d="M.15 .2l.06-.02" stroke="currentColor" strokeWidth=".025"/></pattern><marker id="designer-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="currentColor"/></marker></defs>
      <g transform={`translate(${-dx} ${-dy})`}>
        <rect x="0" y="0" width={w} height={h} className="designer-ground"/>
        <line x1={boundary[0]} y1={boundary[1]} x2={boundary[2]} y2={boundary[3]} className="designer-boundary"/>
        <text x={w/2} y={h+padding*.55} textAnchor="middle" fontSize={padding*.25}>{w.toFixed(2)} m × {h.toFixed(2)} m · {draft.zone.boundary_side}: {draft.zone.boundary_type==="custom"?draft.zone.boundary_custom:draft.zone.boundary_type}</text>
        <text x={w/2} y={-padding*.35} textAnchor="middle" fontSize={padding*.3}>Assumed geometry · {area} m²</text>
        {evaluation.features.catchment!==null && <g className="designer-catchment" pointerEvents="none">{(()=>{const c=evaluation.features.catchment;return <><rect x={c.donor[0]} y={c.donor[1]} width={c.donor[2]} height={c.donor[3]} rx=".1"/><text x={c.donor_label[0]} y={c.donor_label[1]} textAnchor="middle" fontSize={padding*.25}>Assumed donor catchment</text>{c.islands.map((p,i)=><g key={i}><path d={`M${p.x} ${p.flow_start}V${p.y-p.width/2}`} markerEnd="url(#designer-arrow)"/><path d={`M${p.x-p.width/2} ${p.y}q${p.width/2} ${p.depth} ${p.width} 0`}/></g>)}<path d={`M${c.overflow[0]} ${c.overflow[1]}L${c.overflow[2]} ${c.overflow[3]}`} markerEnd="url(#designer-arrow)"/><text x={c.overflow_label[0]} y={c.overflow_label[1]} fontSize={padding*.23}>Review safe overflow</text></>;})()}</g>}
        {evaluation.instances.map(crown)}
        <g pointerEvents="none">{associationLines()}</g>
        {draft.pocket.enabled && <g className={`designer-pocket-group ${selected==="pocket"?"is-selected":""}`} role="button" tabIndex="0" aria-label="Select moisture pocket" onKeyDown={e=>activate(e,"pocket")} onPointerDown={e=>down(e,"pocket","pocket")} onClick={e=>{e.stopPropagation();onSelect("pocket");}}>
          <circle cx={pocket.x} cy={pocket.y} r={draft.pocket.radius} className="designer-pocket"/>
          <circle cx={pocket.x} cy={pocket.y} r={draft.pocket.radius} className="designer-pocket-hit" vectorEffect="non-scaling-stroke"/>
        </g>}
        {draft.existing.map(p=>{const v=position(p);return <g key={p.id} className="designer-existing" pointerEvents="none"><circle cx={v.x} cy={v.y} r={p.radius}/><path d={`M${v.x} ${v.y-.2}l.2 .2-.2 .2-.2-.2Z`}/><title>Existing {catalogue.find(s=>s.id===p.species).label}; assumed position, retained even outside resized zone</title></g>;})}
        {evaluation.instances.map(p=>{
          const at=atPosition(p);
          const root=showRoots?evaluation.overlays[p.species].root_ball:null;
          const label=catalogue.find(s=>s.id===p.species);
          required(label!==undefined,`Missing plant identity for ${p.species}.`);
          const name=label.label;
          const appearance=symbolForPlant(label), path=symbolPath(appearance.shape,at.x,at.y);
          return <g key={p.id} className={`designer-plant plant-symbol-colours ${highlightedSpecies!==null&&highlightedSpecies!==p.species?"is-locate-dimmed":""} ${selected===p.id?"is-selected":""} ${Object.hasOwn(associations,p.id)&&associations[p.id].parent_id===selected?"is-associated":""}`} style={appearance.style} data-instance={p.id} data-species={p.species} data-growth-form={label.group} role="button" tabIndex="0" aria-label={`Select ${name} ${Number(p.id.split(":")[1])+1}`} aria-pressed={selected===p.id} onKeyDown={e=>plantKey(e,p)} onKeyUp={plantKeyUp} onBlur={finishKeyboard} onPointerDown={e=>down(e,"plant",p.id)} onClick={e=>{e.stopPropagation();if(selectedOnPointerDown.current===p.id){selectedOnPointerDown.current=null;return;}onSelect(p.id);}}>
            {showClearance&&<circle cx={at.x} cy={at.y} r={p.radius} className="designer-clearance"/>}
            {draft.mulch.enabled&&draft.mulch.plant_ids.includes(p.species)&&<circle cx={at.x} cy={at.y} r={(draft.mulch.radius+draft.bundle.defaults.collar_gap)/2} className="designer-mulch" style={{fill:"none",stroke:`url(#designer-${draft.bundle.treatments.find(t=>t.id===draft.mulch.type).pattern})`,strokeWidth:draft.mulch.radius-draft.bundle.defaults.collar_gap}}/>}
            {root!==null&&<circle cx={at.x} cy={at.y} r={root.diameter_m[1]/2} className="designer-root-ball" vectorEffect="non-scaling-stroke"/>}
            <circle cx={at.x} cy={at.y} r=".32" className="designer-plant-hit"/>
            <circle cx={at.x} cy={at.y} r=".37" className="designer-selection-ring" vectorEffect="non-scaling-stroke"/>
            <path d={path} className="designer-symbol-halo" vectorEffect="non-scaling-stroke"/>
            <path d={path} className="designer-plant-symbol" vectorEffect="non-scaling-stroke"/>
            <text x={at.x} y={at.y+.5} textAnchor="middle" fontSize=".23">{name}</text><title>{name} · {p.manual?"manual position":"generated position"}</title>
          </g>;
        })}
        <g className="designer-locate-layer" pointerEvents="none" aria-hidden="true">
          {evaluation.instances.filter(p=>p.species===highlightedSpecies).map(p=>{const at=atPosition(p);return <g key={p.id} data-located-instance={p.id}>
            <circle cx={at.x} cy={at.y} r=".43" className="designer-locate-halo-back" vectorEffect="non-scaling-stroke"/>
            <circle cx={at.x} cy={at.y} r=".43" className="designer-locate-halo" vectorEffect="non-scaling-stroke"/>
          </g>;})}
        </g>
        {[{id:"left",x:0,y:h/2},{id:"right",x:w,y:h/2},{id:"top",x:w/2,y:0},{id:"bottom",x:w/2,y:h}].map(edge=><g key={edge.id} className={`designer-edge designer-edge-${edge.id}`} role="button" tabIndex="0" aria-label={`Resize ${edge.id} edge; area stays fixed`} onKeyDown={e=>activate(e,"zone")} onPointerDown={e=>down(e,"resize",edge.id)} onClick={e=>{e.stopPropagation();onSelect("zone");}}>
          <circle cx={edge.x} cy={edge.y} r={padding*.3} className="designer-edge-hit"/>
          <rect x={edge.x-padding*.13} y={edge.y-padding*.13} width={padding*.26} height={padding*.26} rx={padding*.04}/>
        </g>)}
      </g>
    </svg>
    <p className="designer-live-size" aria-live="polite">{w.toFixed(2)} m × {h.toFixed(2)} m · {area} m²{moving?.type==="resize"?" · area fixed":""}</p>
  </div>;
}
