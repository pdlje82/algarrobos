"""Applicant inheritance is versioned so historical assessment facts stay frozen."""
from copy import deepcopy
import unittest
import json
from unittest.mock import patch
from backend import funding, funding_visual
import test_funding as fixtures


class ApplicantTests(unittest.TestCase):
    setUp = fixtures.FundingTests.setUp

    def demonstration(self):
        d=deepcopy(self.draft)
        d["baseline"]["facts"].update(applicant_id="individual",applicant_kind="individual",activity="demonstration",owner_id="individual")
        return d

    def test_selected_applicant_drives_inherited_form_and_dependency(self):
        d=self.demonstration();original=deepcopy(d)
        d["overrides"]["applicant_id"]="municipality"
        a=funding.evaluate(d,self.project)
        self.assertEqual(a["facts"]["applicant_kind"],"public")
        self.assertEqual(d["baseline"],original["baseline"])
        self.assertEqual(a["facts"]["owner_id"],"individual")
        r=next(r for r in a["results"] if r["id"]=="LEADER-AL20-3.4")
        self.assertEqual(next(c for c in r["checks"] if c["field"]=="applicant_kind")["result"],"pass")
        self.assertEqual(r["status"],"Needs information")
        v=funding_visual.visualise(a)
        c=next(c for c in v["visualisation"]["conditions"] if c["option_id"]==r["id"] and c["fields"]==["applicant_choice"])
        self.assertEqual(c["result"],"pass")
        self.assertTrue(v["applicant_context"]["derived"])
        self.assertEqual(v["applicant_context"]["inherited_form"],"public")
        self.assertTrue(any(x["field"]=="applicant_kind" for x in a["differences"]))

    def test_explicit_form_override_and_unknown_are_retained_until_reset(self):
        d=self.demonstration()
        d["overrides"].update(applicant_id="municipality",applicant_kind="nonprofit")
        a=funding.evaluate(d,self.project)
        self.assertEqual(a["facts"]["applicant_kind"],"nonprofit")
        self.assertTrue(funding_visual.visualise(a)["applicant_context"]["override_conflict"])
        self.assertTrue(any("explicit legal-form" in w for w in a["warnings"]))
        d["overrides"]["applicant_id"]="individual"
        self.assertEqual(funding.effective(d)["applicant_kind"],"nonprofit")
        d["overrides"]["applicant_kind"]=None
        self.assertIsNone(funding.effective(d)["applicant_kind"])
        del d["overrides"]["applicant_kind"]
        self.assertEqual(funding.effective(d)["applicant_kind"],"individual")
        d["overrides"]["applicant_id"]="municipality"
        self.assertEqual(funding.effective(d)["applicant_kind"],"public")
        del d["overrides"]["applicant_id"]
        self.assertEqual(funding.effective(d)["applicant_kind"],"individual")

    def test_owner_does_not_determine_form_and_unrecorded_applicants_are_unknown(self):
        d=self.demonstration();d["overrides"]["owner_id"]="municipality"
        self.assertEqual(funding.effective(d)["applicant_kind"],"individual")
        for identity in [None,"hypothetical"]:
            d["overrides"]["applicant_id"]=identity
            self.assertIsNone(funding.evaluate(d,self.project)["facts"]["applicant_kind"])

    def test_old_assessments_remain_frozen_and_only_editing_copy_is_upgraded(self):
        d=self.demonstration();d["version"]=1;d["overrides"]["applicant_id"]="municipality"
        saved=funding.operate(None,self.project,None,"save",d,None)
        snapshot=deepcopy(saved)
        self.assertEqual(saved["scenarios"][0]["assessment"]["facts"]["applicant_kind"],"individual")
        pending=funding.prepare(d,self.project)
        self.assertIsNotNone(pending["applicant_review"])
        self.assertEqual(pending["draft"],d)
        prepared=funding.prepare(d,self.project,{"kind":"recorded","party_id":"municipality"},resolve=True)
        self.assertEqual(prepared["draft"]["version"],3)
        self.assertTrue(prepared["notice"])
        self.assertEqual(funding.effective(prepared["draft"])["applicant_kind"],"public")
        funding.validate_attachment(saved,self.project)
        updated=funding.operate(saved,self.project,None,"draft",prepared["draft"],None)
        self.assertEqual(updated["scenarios"],snapshot["scenarios"])
        self.assertEqual(saved,snapshot)
        self.assertEqual(d["version"],1)


class PrepareEndpointTests(unittest.TestCase):
    def setUp(self):
        fixtures.FundingPersistenceTests.setUp(self)
        edition2=json.loads((funding.CATALOGUE.parent/"funding-v2.json").read_text(encoding="utf-8"))
        catalogue=patch.object(funding,"catalogue",return_value=edition2)
        catalogue.start();self.addCleanup(catalogue.stop)
    seed = fixtures.FundingPersistenceTests.seed

    def test_prepare_never_writes_or_changes_rules_and_sources(self):
        d=self.seed();d["version"]=1;del d["applicant_choice"]
        before=self.path.read_bytes()
        r=self.client.post("/api/funding/prepare",json={"revision":self.view["revision"],"draft":d})
        self.assertEqual(r.status_code,200,r.text)
        self.assertEqual(r.json()["draft"]["bundle"],d["bundle"])
        self.assertEqual(r.json()["draft"]["baseline"],d["baseline"])
        self.assertEqual(self.path.read_bytes(),before)
        self.assertEqual(self.client.get("/api/funding").json()["attachment"]["scenarios"],[])
