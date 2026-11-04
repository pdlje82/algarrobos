import test from "node:test";
import assert from "node:assert/strict";
import data from "../../scenarios/drone-irrigator-research-v1.json" with {type:"json"};
import rules from "../../design_rules/drone_irrigator_v1.json" with {type:"json"};
import {validateResearchRecord} from "../src/irrigationResearchState.js";

test("all plant profiles preserve explicitly unknown daily water, with independent product assessments",()=>{
  assert.equal(Object.keys(data.plant_profiles).length,23);
  for(const p of Object.values(data.plant_profiles)){
    assert.equal(validateResearchRecord("irrigation_profile",p),p);
    assert.equal(p.water_demand.status,"not_established");
    assert.deepEqual([p.water_demand.low_l_day,p.water_demand.central_l_day,p.water_demand.high_l_day],[null,null,null]);
    assert.deepEqual(Object.keys(p.reservoir_assessments).sort(),Object.keys(data.reservoirs).sort());
  }
});
test("missing rates and plausible zero substitutions fail visibly",()=>{
  for(const mutate of [p=>delete p.water_demand.low_l_day,p=>p.water_demand.central_l_day=0,p=>p.water_demand.status="estimated",p=>p.reservoir_assessments.cocoon.status="probably_safe"]){
    const p=structuredClone(data.plant_profiles.carob);mutate(p);assert.throws(()=>validateResearchRecord("irrigation_profile",p),/incompatible/);
  }
});
test("facts, sources and material classifications reject broken display contracts",()=>{
  for(const mutate of [p=>p.facts.nominal_capacity.value=Infinity,p=>p.material="biodegradable",p=>p.web_sources[0].url="javascript:alert(1)",p=>p.facts.nominal_capacity.citation_ids=["invented"],p=>p.unknown=0]){
    const p=structuredClone(data.reservoirs.waterboxx);mutate(p);assert.throws(()=>validateResearchRecord("reservoir_system",p),/incompatible/);
  }
});
test("prepared inputs and clusters validate without silently adopting rules",()=>{
  const scenario=data.scenarios["dry-weather-study"];
  assert.equal(validateResearchRecord("research_scenario",scenario),scenario);
  for(const r of Object.values(rules.templates))assert.equal(validateResearchRecord("cluster_template",r),r);
  const broken=structuredClone(scenario);broken.adoption="active";
  assert.throws(()=>validateResearchRecord("research_scenario",broken),/adoption/);
  const changed=structuredClone(scenario);changed.inputs.drone_count=99;
  assert.throws(()=>validateResearchRecord("research_scenario",changed),/scenario inputs/);
});
test("all eleven work packages and documented component types validate",()=>{
  assert.equal(Object.keys(data.work_packages).length,11);
  for(const [adapter,collection] of [["research_topic",data.work_packages],["drone_platform",data.aircraft],["drone_base",data.bases],["reservoir_system",data.reservoirs]])for(const value of Object.values(collection))validateResearchRecord(adapter,value);
});
