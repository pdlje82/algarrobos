import test from "node:test";
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import config from "../../scenarios/funding-delivery-plan-v1.json" with {type:"json"};
import conceptGuide from "../../scenarios/funding-project-concept-v1.json" with {type:"json"};
import {validateDeliveryLibrary,validateDeliveryPlan,editDeliveryTopic,removeConceptActivity,deliveryActivityLinks} from "../src/deliveryPlanState.js";
import {copyConcepts,validateConcept} from "../src/projectConceptState.js";
const hash="a".repeat(64);
const concept=()=>({version:1,id:randomUUID(),route:"LEADER-AL20-3.4",guide_id:conceptGuide.id,guide_hash:hash,title:"Test",purpose:"",notes:"",objectives:[],justifications:{},activities:[],delivery_plan:{version:1,library_id:config.id,library_hash:hash,legacy_source:null,...structuredClone(config.defaults)}});
test("delivery library has unresolved defaults, all six topics and exact documented routes",()=>{
 assert.equal(validateDeliveryLibrary({version:1,library:config,library_hash:hash}).library,config);
 const c=concept();validateConcept(c);assert(Object.values(c.delivery_plan.topics).every(t=>!t.reviewed));
 for(const mutate of [g=>delete g.topics.sharing,g=>g.version=2,g=>g.sources[Object.keys(g.sources)[0]].page=9999,g=>g.defaults.topics.publication.reviewed=true]){const g=structuredClone(config);mutate(g);assert.throws(()=>validateDeliveryLibrary({version:1,library:g,library_hash:hash}),/Incompatible/);}
});
test("editing a reviewed intention resets its review and preserves independent topics",()=>{
 const c=concept();c.delivery_plan.topics.sharing.reviewed=true;const before=structuredClone(c),next=editDeliveryTopic(c,"sharing","outputs","A public report");assert.deepEqual(c,before);assert.equal(next.delivery_plan.topics.sharing.reviewed,false);assert.equal(next.delivery_plan.topics.comparison,c.delivery_plan.topics.comparison);
 assert.equal(editDeliveryTopic(next,"sharing","reviewed",true).delivery_plan.topics.sharing.reviewed,true);
});
test("activity duplication remaps planning links and explicit removal clears only affected links",()=>{
 const c=concept(),aid=randomUUID();c.activities=[{...conceptGuide.defaults.activity,id:aid,template_id:null,bindings:[]}];c.delivery_plan.topics.sharing.activity_ids=[aid];c.delivery_plan.topics.sharing.reviewed=true;
 validateDeliveryPlan(c.delivery_plan,c);assert.deepEqual(deliveryActivityLinks(c,aid),["sharing"]);
 const copied=copyConcepts({[c.route]:c})[c.route];assert.equal(copied.delivery_plan.topics.sharing.activity_ids[0],copied.activities[0].id);assert.notEqual(copied.activities[0].id,aid);
 const removed=removeConceptActivity(c,aid);assert.equal(removed.activities.length,0);assert.deepEqual(removed.delivery_plan.topics.sharing.activity_ids,[]);assert.equal(removed.delivery_plan.topics.sharing.reviewed,false);assert.equal(c.activities.length,1);
 const bad=structuredClone(c);bad.activities=[];assert.throws(()=>validateConcept(bad),/Incompatible/);
});
test("route 3.5 does not inherit a local-novelty or three-year-publication assertion",()=>{
 const c=concept();c.route="LEADER-AL20-3.5";validateDeliveryPlan(c.delivery_plan,c);c.delivery_plan.topics.publication.answer="three_years";assert.throws(()=>validateDeliveryPlan(c.delivery_plan,c));
});
