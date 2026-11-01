"""Capped scores, reviewed delivery plans and execution remain distinct."""
from copy import deepcopy
from unittest.mock import patch
from uuid import uuid4
import unittest
from backend import funding, funding_selection as scoring, delivery_plans as delivery, project_concepts
from backend.engine import Invalid
from backend.storage import Store, validate_export
from test_designer_library import site
import test_project_concepts as concept_tests
R34, R35 = concept_tests.R34, concept_tests.R35


class CompletionTests(unittest.TestCase):
    def setUp(self):
        self.project=site();self.draft=funding.new_draft(self.project,None,[],"activity")

    def test_every_route_can_complete_a_valid_cap_without_rejecting_other_options(self):
        for route in self.draft["selection_assessments"]:
            d=deepcopy(self.draft);row=d["selection_assessments"][route]["criteria"]["AT.3"]
            row["answers"]["AT.3.1"]=True
            score=scoring.calculate(d["bundle"],d["selection_assessments"],route)
            result=next(c for c in score["criteria"] if c["id"]=="AT.3")
            self.assertEqual(result["completion_reason"],"cap_reached")
            self.assertTrue(result["score_complete"]);self.assertFalse(result["answers_complete"])
            self.assertIsNone(row["answers"]["AT.3.2"])
        d=self.draft;row=d["selection_assessments"][R34]["criteria"]["JR.3"]
        definition=next(c for c in scoring.profile_for(d["bundle"],R34)["criteria"] if c["id"]=="JR.3")
        for choice in definition["choices"]:
            row["answers"][choice["id"]]=True
            if scoring.calculate(d["bundle"],d["selection_assessments"],R34)["criteria"][[c["id"] for c in scoring.profile_for(d["bundle"],R34)["criteria"]].index("JR.3")]["complete"]:break
        score=scoring.calculate(d["bundle"],d["selection_assessments"],R34)
        result=next(c for c in score["criteria"] if c["id"]=="JR.3")
        self.assertEqual((result["subtotal"],result["complete"],result["answers_complete"]),(4,True,False))
        self.assertTrue(any(v is None for v in row["answers"].values()))
        first=next(k for k,v in row["answers"].items() if v is True);row["answers"][first]=False
        self.assertFalse(next(c for c in scoring.calculate(d["bundle"],d["selection_assessments"],R34)["criteria"] if c["id"]=="JR.3")["complete"])

    def test_employment_and_ratio_inputs_cannot_be_bypassed(self):
        for route,pid in self.draft["bundle"]["selection"]["routes"].items():
            for cr in self.draft["bundle"]["selection"]["profiles"][pid]["criteria"]:
                row=self.draft["selection_assessments"][route]["criteria"][cr["id"]]
                if cr["method"]=="employment":
                    row["answers"][scoring.choices_for(cr,route)[0]["id"]]=True
                    result=next(c for c in scoring.calculate(self.draft["bundle"],self.draft["selection_assessments"],route)["criteria"] if c["id"]==cr["id"])
                    self.assertFalse(result["score_complete"]);self.assertEqual(result["subtotal"],0)
                elif cr["method"]=="ratio":
                    result=next(c for c in scoring.calculate(self.draft["bundle"],self.draft["selection_assessments"],route)["criteria"] if c["id"]==cr["id"])
                    self.assertFalse(result["complete"])

    def test_frozen_v1_and_explicit_upgrade_preserve_answers_and_points(self):
        d=self.draft;selection=d["bundle"]["selection"];selection["version"]=1;del selection["completion_policy"]
        row=d["selection_assessments"][R34]["criteria"]["DRI.3"];row["answers"]["DRI.3.1"]=True;row["answers"]["DRI.3.2"]=True
        old=scoring.calculate(d["bundle"],d["selection_assessments"],R34)
        original=deepcopy(d)
        next=funding.prepare(d,self.project,adopt_current_catalogue=True)["draft"]
        new=scoring.calculate(next["bundle"],next["selection_assessments"],R34)
        self.assertEqual(old["subtotal"],new["subtotal"]);self.assertEqual(d,original)
        self.assertEqual(next["selection_assessments"],d["selection_assessments"])
        self.assertNotIn("version",old);self.assertEqual(new["version"],2)
        self.assertEqual(old["unresolved"]-new["unresolved"],1)
        attachment=funding.operate(None,self.project,None,"save",original,None)
        retained=deepcopy(attachment)
        funding.validate_attachment(attachment,self.project)
        self.assertEqual(attachment,retained)
        self.assertEqual(attachment["scenarios"][0]["assessment"]["draft"]["bundle"]["selection"]["version"],1)
        self.assertEqual(old,scoring.calculate(d["bundle"],d["selection_assessments"],R34))
        bad=deepcopy(selection);bad["version"]=2;bad["completion_policy"]="guess"
        with self.assertRaises(Invalid):scoring.validate_rules(bad,d["bundle"])


class DeliveryAPITests(unittest.TestCase):
    setUp=concept_tests.ConceptAPITests.setUp
    post=concept_tests.ConceptAPITests.post
    context=concept_tests.ConceptAPITests.context
    save=concept_tests.ConceptAPITests.save
    transfer=concept_tests.ConceptAPITests.transfer
    preview=concept_tests.ConceptAPITests.preview
    edit=concept_tests.ConceptAPITests.edit

    def plan(self,import_execution=False):
        response=self.post("funding/delivery-plan/prepare",dict(revision=self.state["revision"],concept_id=self.concept["id"],concept=self.concept,import_execution=import_execution))
        self.concept["delivery_plan"]=response["plan"]
        return response

    def ready(self):
        self.plan()
        choices={"comparison":"comparison","novelty":"new_locally","monitoring":["fixed_photos","vegetation_cover","erosion_notes"],"participation":"open_days","sharing":"web_report","publication":"three_years"}
        for tid,t in self.concept["delivery_plan"]["topics"].items():t.update(answer=choices[tid],reviewed=True,explanation="Reviewed intention and evidence to prepare.")
        self.concept["delivery_plan"]["topics"]["sharing"].update(outputs="Public report",responsible="Project association",location="Project website during delivery")
        self.save();self.transfer()

    def execution(self,choices=None):
        return self.post("demonstrator/delivery-plan-preview",dict(**self.context(),choices={"primary_monitoring":None,"financing":None} if choices is None else choices))

    def apply_body(self,p):return dict(**self.context(),choices=p["choices"],preview_hash=p["preview_hash"],request_id=str(uuid4()))

    def test_library_and_unresolved_defaults_do_not_change_saved_state(self):
        g=self.client.get("/api/funding/delivery-plan-guide");self.assertEqual(g.status_code,200)
        before=self.path.read_bytes();p=self.plan()
        self.assertEqual(before,self.path.read_bytes());self.assertEqual(p["origin"],"unresolved")
        self.assertTrue(all(not t["reviewed"] for t in p["plan"]["topics"].values()))
        self.assertTrue(all(t["answer"] in [None,[]] for t in p["plan"]["topics"].values()))
        self.save();self.transfer();review=self.execution();self.assertFalse(review["can_apply"])
        self.post("demonstrator/delivery-plan-apply",self.apply_body(review),422)

    def test_legacy_import_is_explicit_unreviewed_and_retains_custom_values(self):
        before=self.path.read_bytes();p=self.plan(True)
        self.assertEqual(p["origin"],"scenario_defaults");self.assertEqual(before,self.path.read_bytes())
        self.assertEqual(p["retained_settings"],p["plan"]["legacy_source"])
        self.assertEqual(p["plan"]["topics"]["monitoring"]["answer"],["fixed_photos","vegetation_cover","erosion_notes"])
        self.assertFalse(p["plan"]["topics"]["publication"]["reviewed"])
        self.save();self.transfer()
        report=self.post("demonstrator/project-concept/preview",dict(revision=self.state["revision"],concept_id=self.concept["id"],concept=self.concept))
        self.assertIn("Monitoring, participation and sharing",report["markdown"])
        self.assertTrue(any("review" in g.lower() for g in report["gaps"]))

    def test_plan_merges_by_field_and_rejects_dangling_activity_links(self):
        self.ready();d=deepcopy(self.concept);d["delivery_plan"]["topics"]["monitoring"]["explanation"]="Demo monitoring";self.edit(d)
        self.concept["delivery_plan"]["topics"]["sharing"]["outputs"]="Navigator output";self.save()
        p=self.preview();self.assertFalse(any(f["conflict"] for f in p["fields"]))
        self.transfer();merged=self.state["planning"]["draft"]["project_concepts"][0]["concept"]
        self.assertEqual(merged["delivery_plan"]["topics"]["monitoring"]["explanation"],"Demo monitoring")
        self.assertEqual(merged["delivery_plan"]["topics"]["sharing"]["outputs"],"Navigator output")
        bad=deepcopy(merged);bad["delivery_plan"]["topics"]["sharing"]["activity_ids"]=[str(uuid4())]
        with self.assertRaisesRegex(Invalid,"removed activity"):project_concepts.validate(bad,self.state["project"])

    def test_execution_is_reviewed_atomic_idempotent_and_keeps_finance_and_physical_inputs(self):
        self.ready();before=deepcopy(self.state);p=self.execution();self.assertTrue(p["can_apply"],p)
        body=self.apply_body(p);after=self.post("demonstrator/delivery-plan-apply",body)
        self.assertEqual(after,self.post("demonstrator/delivery-plan-apply",body))
        self.assertEqual(after["project"],before["project"])
        self.assertEqual({k:v for k,v in after["planning"]["draft"]["inputs"].items() if k not in delivery.library()["legacy_fields"].values()},{k:v for k,v in before["planning"]["draft"]["inputs"].items() if k not in delivery.library()["legacy_fields"].values()})
        self.assertIn("applied_delivery_plan",after["planning"]["draft"])
        exported=self.client.get("/api/export").json();validate_export(exported)
        self.post("demonstrator/delivery-plan-detach",dict(**self.context(),request_id=str(uuid4())))
        self.assertNotIn("applied_delivery_plan",self.client.get("/api/project").json()["planning"]["draft"])

    def test_execution_stale_hash_failed_write_and_retry_preserve_state(self):
        self.ready();p=self.execution();body=self.apply_body(p);before=self.path.read_bytes()
        bad={**body,"preview_hash":"a"*64};self.post("demonstrator/delivery-plan-apply",bad,422);self.assertEqual(before,self.path.read_bytes())
        with patch.object(Store,"write",side_effect=OSError("execution disk fixture")):self.post("demonstrator/delivery-plan-apply",body,503)
        self.assertEqual(before,self.path.read_bytes());self.post("demonstrator/delivery-plan-apply",body)
        self.post("demonstrator/delivery-plan-apply",{**body,"request_id":str(uuid4())},409)

    def test_monitoring_union_requires_primary_and_retains_all_intentions(self):
        self.ready();self.concept["delivery_plan"]["topics"]["monitoring"]["answer"].append("plant_inventory_survival")
        self.save();self.transfer();self.assertFalse(self.execution()["can_apply"])
        p=self.execution({"primary_monitoring":"photo_cover","financing":None});self.assertTrue(p["can_apply"])
        self.post("demonstrator/delivery-plan-apply",self.apply_body(p))
        saved=self.client.get("/api/project").json()["planning"]["draft"]
        self.assertIn("plant_inventory_survival",saved["applied_delivery_plan"]["delivery_plan"]["topics"]["monitoring"]["answer"])
        self.assertEqual(saved["inputs"]["baseline_method"],"photo_cover")

    def test_route35_has_no_universal_novelty_publication_or_unsupported_financing(self):
        c=project_concepts.new(self.draft,R35);self.concept=c;self.draft["project_concepts"][R35]=c;self.plan(True)
        for tid,t in c["delivery_plan"]["topics"].items():
            if tid not in {"novelty","publication"}:t.update(reviewed=True,explanation="Reviewed")
        c["delivery_plan"]["topics"]["participation"]["answer"]="open_days";self.save();self.transfer()
        p=self.execution();self.assertFalse(p["can_apply"]);self.assertTrue(any("3.4 simulator" in b for b in p["blockers"]))
        p=self.execution({"primary_monitoring":None,"financing":"self"});self.assertTrue(p["can_apply"],p)
        after=self.post("demonstrator/delivery-plan-apply",self.apply_body(p))
        self.assertEqual(after["planning"]["draft"]["inputs"]["funding_route"],"self")
        self.assertIsNone(c["delivery_plan"]["topics"]["novelty"]["answer"])
        self.assertIsNone(c["delivery_plan"]["topics"]["publication"]["answer"])

    def test_missing_configuration_version_and_sources_fail_explicitly(self):
        for change in [lambda g:g["topics"].pop("sharing"),lambda g:g.update(version=9),lambda g:g["sources"][next(iter(g["sources"]))].update(page=9999)]:
            g=delivery.library();change(g)
            with self.assertRaises(Invalid):delivery.validate_library(g)

if __name__=="__main__":unittest.main()
