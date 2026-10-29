import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {symbolScheme, symbolForPlant, validateSymbolScheme} from "../src/plantSymbols.js";

const catalogue=JSON.parse(readFileSync(new URL("../../scenarios/planting-catalog-v2.json",import.meta.url)));
const css=readFileSync(new URL("../src/styles.css",import.meta.url),"utf8");
function luminance(hex){
  const rgb=hex.slice(1).match(/../g).map(s=>parseInt(s,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
  return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
}
function contrast(a,b){const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
function backgrounds(theme){
  const block=theme==="light"?css.slice(0,css.indexOf(".theme-warning")):css.slice(css.indexOf(':root[data-theme="dark"]'));
  return ["hover","panel"].map(name=>{const match=block.match(new RegExp("--"+name+":\\s*(#[0-9a-f]{6})","i"));assert.ok(match,"Missing actual theme background "+name);return match[1];});
}

test("all catalogue species have distinct colours within their growth-form family",()=>{
  assert.deepEqual(Object.keys(symbolScheme.species).sort(),catalogue.plants.map(p=>p.id).sort());
  for(const group of catalogue.groups){
    const members=catalogue.plants.filter(p=>p.group===group.id);
    for(const theme of ["light","dark"]){
      const colours=members.map(p=>symbolForPlant(p)[theme]);
      assert.equal(new Set(colours).size,members.length,group.id+" contains repeated species colours");
    }
    for(const member of members)assert.equal(symbolForPlant(member).group,group.id);
  }
});

test("every configured fill has at least 3:1 contrast against actual drawing and key backgrounds",()=>{
  for(const [id,group] of Object.entries(symbolScheme.groups)){
    for(const [index,pair] of group.colours.entries()){
      for(const theme of ["light","dark"]){
        for(const background of backgrounds(theme)){
          assert.ok(contrast(pair[theme],background)>=3,`${id}[${index}] ${theme}: ${pair[theme]} lacks contrast against ${background}`);
        }
      }
    }
  }
});

test("missing identities and broken palettes fail explicitly; custom identities retain stable colours",()=>{
  assert.throws(()=>symbolForPlant({id:"unknown-plant",group:"tree"}),/Add a symbol colour/);
  assert.throws(()=>symbolForPlant({id:"carob",group:"grass"}),/disagrees/);
  for(const change of [p=>delete p.groups.tree,p=>p.groups.grass.colours[0].dark="green",p=>p.species.carob.colour=100,p=>delete p.custom.seed]){
    const broken=structuredClone(symbolScheme);change(broken);assert.throws(()=>validateSymbolScheme(broken));
  }
  const plant={id:"custom-shrub-fixed",group:"shrub",quantity:1,unit_cost:2};
  const before=symbolForPlant(plant);
  symbolForPlant({id:"custom-another",group:"shrub"});
  assert.deepEqual(symbolForPlant({...plant,quantity:9,unit_cost:8}),before);
});

