"""Edition-2 guidance, territorial distinctions and immutable previous assessments."""
from copy import deepcopy
import json
from pathlib import Path
import unittest
from unittest.mock import patch
from backend import funding, funding_inputs, funding_visual, documents, planning_draft, planning_context, designer
from backend.engine import Invalid
from test_designer_library import site
import test_funding as fixtures


class EditionTests(unittest.TestCase):
    def setUp(self):
        self.project = site()
        # These tests freeze edition-2 semantics; edition-3 annex tests are separate.
        edition2=json.loads((funding.CATALOGUE.parent/"funding-v2.json").read_text(encoding="utf-8"))
        catalogue=patch.object(funding,"catalogue",return_value=edition2)
        catalogue.start();self.addCleanup(catalogue.stop)
        self.legacy = json.loads((funding.CATALOGUE.parent / "funding-v1.json").read_text(encoding="utf-8"))
        self.draft = funding.new_draft(self.project, None, [], "business")

    def result(self, d, rule):
        return next(r for r in funding.evaluate(d, self.project)["results"] if r["id"] == "LEADER-AL20-"+rule)

    def eligible(self):
        d = deepcopy(self.draft)
        d["applicant_choice"] = {"kind":"recorded", "party_id":"individual"}
        d["overrides"].update(municipality="Alhama de Almeria", selection_score=60, sector="general", unemployed="yes", new_activity="yes", no_same_reta="yes", resident="yes", exclusive="yes", start_after_application="yes", plan_24_months="yes", retention="yes", unemployment_percent=50, other_aid="no", net_year1=10000, smi_year1=20000, net_year2=20000, smi_year2=20000)
        return d

    def test_municipality_scope_residence_and_availability_are_independent(self):
        d = self.eligible(); r = self.result(d,"2.7")
        self.assertEqual(r["status"], "Possible match — eligibility unverified")
        self.assertFalse(any(c["field"]=="territory_verified" for c in r["checks"]))
        d["overrides"]["territory_verified"]="no"
        self.assertEqual(self.result(d,"2.7"),r)
        d["overrides"]["resident"]=None
        self.assertEqual(self.result(d,"2.7")["status"],"Needs information")
        d["overrides"]["municipality"]="A place not verified"
        self.assertEqual(next(c for c in self.result(d,"3.4")["checks"] if c["field"]=="municipality")["result"],"unknown")
        d["overrides"]["municipality"]="outside AL20"
        self.assertEqual(next(c for c in self.result(d,"3.4")["checks"] if c["field"]=="municipality")["result"],"fail")
        outside = next(c for c in self.result(d,"3.5")["checks"] if c["field"]=="municipality")
        self.assertEqual(outside["result"],"unknown"); self.assertIn("exceptions",outside["message"])
        self.assertIn("budget",r["availability"])

    def test_participation_and_operation_scope_are_separate_checks(self):
        d=deepcopy(self.draft); d["applicant_choice"]={"kind":"planned","legal_form":"nonprofit"}
        d["overrides"].update(municipality="Alhama de Almería", purpose="conservation", rights_sufficient="yes", permits="yes", related_competence="yes", not_started="yes", novelty="yes", testable="yes", dissemination="yes", publication_three_years="yes", selection_score=60, eligible_cost=10000, public_access="yes", heritage="yes", forest_plan="yes", land_purchase="no")
        checks=self.result(d,"3.4")["checks"]
        self.assertEqual(next(c for c in checks if c["field"]=="demonstration_participation")["result"],"unknown")
        self.assertEqual(next(c for c in checks if c["field"]=="operation_scope")["result"],"unknown")
        d["overrides"].update(demonstration_participation="yes",operation_scope="within",heritage_public_use="no")
        self.assertEqual(self.result(d,"3.4")["status"],"Possible match — eligibility unverified")
        self.assertEqual(self.result(d,"3.5")["status"],"Does not match these facts")
        d["overrides"].update(demonstration_participation="no",heritage_public_use="yes")
        self.assertEqual(self.result(d,"3.4")["status"],"Does not match these facts")
        self.assertEqual(self.result(d,"3.5")["status"],"Possible match — eligibility unverified")
        d["overrides"].update(demonstration_participation="yes",operation_scope="beyond")
        self.assertIsNone(self.result(d,"3.4")["finance"]["estimate"])

    def test_recorded_parcel_location_wins_and_ownership_does_not_prove_permissions(self):
        p=deepcopy(self.project); p["parcels"][0]["location"]="Alhama de Almería"
        planning=planning_draft.initial(p); planning["inputs"].update(municipality="Planning default",public_participation="open_days")
        d=funding.new_draft(p,planning,[p["parcels"][0]["id"]],"demonstrator")
        f=funding.effective(d)
        self.assertEqual(f["municipality"],"Alhama de Almería");self.assertEqual(f["rights"],"ownership")
        self.assertEqual(f["demonstration_participation"],"yes");self.assertIsNone(f["heritage_public_use"])
        self.assertIsNone(f["rights_sufficient"]);self.assertIsNone(f["permits"])
        old=funding.baseline(p,planning,[p["parcels"][0]["id"]],"demonstrator",self.legacy)
        self.assertEqual(old["facts"]["municipality"],"Planning default")

    def test_guidance_sources_and_dependencies_cover_modelled_questions(self):
        value=funding_visual.visualise(funding.evaluate(self.eligible(),self.project));qs=value["input_context"]["questions"]
        modeled={field for c in value["visualisation"]["conditions"] for field in c["fields"]}
        for q in qs:
            self.assertTrue(q["short_label"]);self.assertTrue(q["guidance"]["summary"])
            if q["id"] in modeled and q["id"]!="available_contribution": self.assertTrue(q["guidance"]["requirements"],q["id"])
            for rule in q["guidance"]["requirements"]:
                for ref in rule["sources"]:
                    doc=documents.record(ref["document_id"])
                    self.assertEqual(doc["sha256"],ref["sha256"]);self.assertLessEqual(ref["page"],doc["pages"])
        city=next(q for q in qs if q["id"]=="municipality")
        self.assertEqual(city["municipality_selection"],"Alhama de Almería")
        self.assertEqual(len(city["municipalities"]),32)
        self.assertFalse(next(q for q in qs if q["id"]=="territory_verified")["relevant"])
        self.assertFalse(any(c["fields"]==["public_access"] for c in value["visualisation"]["conditions"]))
        invalid=deepcopy(self.draft);invalid["bundle"]["questions"][0]["guidance"]["summary"]=""
        with self.assertRaises(Invalid):funding.evaluate(invalid,self.project)

    def test_update_is_explicit_retains_legacy_answers_and_leaves_history_unchanged(self):
        old=deepcopy(self.draft);old["bundle"]=deepcopy(self.legacy);old["baseline"]=funding.baseline(self.project,None,[],"business",self.legacy)
        old["overrides"].update(public_access="yes",territory_verified="yes")
        record=funding.operate(None,self.project,None,"save",old,None);previous=deepcopy(record)
        untouched=funding.prepare(old,self.project)
        self.assertIsNone(untouched["catalogue_review"]);self.assertEqual(untouched["draft"]["bundle"]["version"],1)
        update=funding.prepare(old,self.project,adopt_current_catalogue=True)
        d=update["draft"];self.assertEqual(d["bundle"]["version"],2)
        self.assertEqual(d["overrides"]["public_access"],"yes")
        self.assertIsNone(funding.effective(d)["demonstration_participation"])
        self.assertIsNone(funding.effective(d)["heritage_public_use"])
        self.assertEqual(len(update["catalogue_review"]["retained_answers"]),2)
        self.assertFalse(funding.evaluate(d,self.project)["stale"])
        after=funding.operate(record,self.project,None,"draft",d,None)
        self.assertEqual(after["scenarios"],previous["scenarios"]);self.assertEqual(record,previous)

    def test_financial_formulas_and_frozen_edition_one_are_preserved(self):
        d=self.eligible()
        self.assertEqual(self.result(d,"2.7")["finance"]["estimate"],37000)
        old=deepcopy(d);old["bundle"]=deepcopy(self.legacy);old["baseline"]=funding.baseline(self.project,None,[],"business",self.legacy)
        old["overrides"]["territory_verified"]="yes"
        self.assertEqual(self.result(d,"2.7")["finance"],self.result(old,"2.7")["finance"])
        for source in [old,d]:source["overrides"].update({k:"yes" for k in d["bundle"]["rules"]["2.7"]["bonuses"]})
        self.assertEqual(self.result(d,"2.7")["finance"],self.result(old,"2.7")["finance"])
        self.assertEqual(self.result(d,"2.7")["finance"]["estimate"],50000)
        old["overrides"]["territory_verified"]=None
        self.assertEqual(self.result(old,"2.7")["status"],"Needs information")

    def test_planning_context_detects_changed_and_deleted_sources_without_editing_snapshot(self):
        draft=planning_draft.initial(self.project);physical=designer.new_draft(self.project)
        draft["source"]={"origin":{"id":"source-id","name":"Transferred design"},"draft":physical}
        before=deepcopy(draft);library={"designs":[{"id":"source-id","name":"Current design", "draft":deepcopy(physical)}]}
        self.assertEqual(planning_context.describe(self.project,draft,library)["design"]["status"],"current")
        library["designs"][0]["draft"]["physical"]["restoration_area"]+=1
        self.assertEqual(planning_context.describe(self.project,draft,library)["design"]["status"],"changed")
        library["designs"]=[]
        context=planning_context.describe(self.project,draft,library)
        self.assertEqual(context["design"]["status"],"missing");self.assertEqual(context["parcel"]["access"]["status"],"active")
        self.assertEqual(draft,before)
        draft["inputs"]["municipality"]="  FICTIONAL DRYLAND SITE  "
        self.assertFalse(planning_context.describe(self.project,draft,library)["municipality_conflict"])

    def test_missing_planning_parcel_is_rejected_before_import_publishes_it(self):
        draft=planning_draft.initial(self.project);draft["inputs"]["parcel_id"]="missing-parcel"
        with self.assertRaisesRegex(Invalid,"missing parcel"):planning_draft.validate(draft,self.project)


class EditionApiTests(unittest.TestCase):
    setUp=fixtures.FundingPersistenceTests.setUp
    seed=fixtures.FundingPersistenceTests.seed
    def test_prepare_and_visualise_are_read_only_with_explicit_edition_review(self):
        d=self.seed();before=self.path.read_bytes()
        req={"revision":self.view["revision"],"draft":d,"adopt_current_catalogue":True}
        r=self.client.post("/api/funding/prepare",json=req)
        self.assertEqual(r.status_code,200,r.text);self.assertIsNotNone(r.json()["catalogue_review"])
        v=self.client.post("/api/funding/visualise",json={k:req[k] for k in ["revision","draft"]})
        self.assertEqual(v.status_code,200,v.text)
        self.assertEqual(self.path.read_bytes(),before)
