import {test} from "node:test";
import assert from "node:assert/strict";
import {fundingEntryAction,fundingSaveIsCurrent} from "../src/fundingState.js";

const draft={version:4,baseline:{target:"demonstrator",parcel_ids:["parcel-1"]},overrides:{novelty:"yes"},selection_assessments:{route:{criteria:{"CO.1":{answers:{"CO.1.2":true},notes:"Retain my evidence"}}}}};
test("direct parcel and demonstrator entry resumes a matching saved draft after reload",()=>{
  const before=structuredClone(draft);
  assert.equal(fundingEntryAction(draft,{target:"demonstrator",parcelId:"parcel-1"}),"resume");
  assert.equal(fundingEntryAction(draft,{}),"resume");
  assert.equal(fundingEntryAction(null,{target:"demonstrator",parcelId:"parcel-1"}),"create");
  assert.deepEqual(draft,before);
  const activity={...draft,baseline:{target:"activity",parcel_ids:["parcel-1"]}};
  assert.equal(fundingEntryAction(activity,{target:"activity",parcelId:"parcel-1"}),"resume");
  assert.equal(fundingSaveIsCurrent(null,draft),false,"A new, unpersisted context must not be labelled saved");
});
test("different context requires explicit review without dropping saved work",()=>{
  assert.equal(fundingEntryAction(draft,{target:"demonstrator",parcelId:"parcel-2"}),"review");
  assert.equal(fundingEntryAction(draft,{target:"activity",parcelId:"parcel-1"}),"review");
  assert.equal(fundingEntryAction(draft,{target:"demonstrator"}),"review");
  assert.throws(()=>fundingEntryAction(draft,{target:"unsupported"}),/Unsupported/);
  assert.throws(()=>fundingEntryAction(draft,{target:"demonstrator",parcelId:""}),/invalid/);
  assert.throws(()=>fundingEntryAction({...draft,baseline:{}},{target:"demonstrator"}),/incomplete/);
});
test("retrying an older snapshot cannot mark newer annex answers or notes as saved",()=>{
  const failed=structuredClone(draft),latest=structuredClone(draft);
  latest.selection_assessments.route.criteria["CO.1"].notes="Newer evidence entered after the failure";
  assert.equal(fundingSaveIsCurrent(failed,latest),false);
  assert.equal(fundingSaveIsCurrent(latest,latest),true);
  latest.selection_assessments.route.criteria["CO.1"].answers["CO.1.2"]=false;
  assert.equal(fundingSaveIsCurrent(failed,latest),false);
});
