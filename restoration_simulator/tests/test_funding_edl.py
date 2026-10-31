from copy import deepcopy
from pathlib import Path
import re
import unittest
from unittest.mock import patch
from uuid import uuid4

from fastapi.testclient import TestClient
from backend import funding, funding_edl as edl, funding_selection, funding_inputs, documents
from backend.app import create_app
from backend.engine import Invalid
from backend.storage import Store, validate_export
from test_designer_library import site
import test_funding as persistence_fixtures


class EdlTests(unittest.TestCase):
    def setUp(self):
        self.data=edl.library();self.project=site();self.draft=funding.new_draft(self.project,None,[],"business")
        self.route="LEADER-AL20-3.4"

    def evidence(self,selections):
        return dict(version=1,library_id=self.data["id"],library_hash=funding.digest(self.data),selections=selections)

    def test_all_strategy_dependent_nodes_have_actual_content_and_valid_sources(self):
        for profile in funding.catalogue()["selection"]["profiles"].values():
            for criterion in profile["criteria"]:
                for choice in criterion["choices"]:
                    if re.search(r'\bEDLL?\b',choice["label"]+" "+choice["label_es"]):
                        self.assertIn(choice["id"],self.data["bindings"])
        self.assertEqual(len([i for i in self.data["items"] if i["classification"]=="innovative_theme"]),5)
        aspects=[i for i in self.data["items"] if i["classification"]=="innovative_aspect"]
        self.assertEqual(len(aspects),12)
        self.assertIn("excluding Dalías and Berja",aspects[-1]["summary"])
        sectors=next(t for t in self.data["topics"] if t["id"]=="innovation-sectors")
        self.assertEqual((sectors["status"],sectors["item_ids"]),("not_designated",[]))
        self.assertEqual(edl.allowed_ids(self.data,"CO.1.1"),{f'NPL{i}' for i in range(1,51)})
        women=[i for i in self.data["items"] if i["id"] in edl.allowed_ids(self.data,"IG.8.2")]
        self.assertTrue(any(i["label"]=="Active leisure and cultural activities for women" and i["page"]==186 for i in women))
        self.assertTrue(any(i["id"]=="TR3" and i["label"]=="Breadmaking" and i["page"]==283 for i in self.data["items"]))
        self.assertEqual(self.data["source"]["sha256"],documents.record("FUND-013")["sha256"])
        documents.verified_file("FUND-013",self.data["source"]["sha256"])

    def test_references_do_not_award_points_and_stay_route_specific(self):
        before=deepcopy(self.draft)
        row=self.draft["selection_assessments"][self.route]["criteria"]["IN.1"]
        row["edl_evidence"]=self.evidence({"IN.1.2":["IN-T1","IN-T3"]})
        funding.validate_draft(self.draft,self.project)
        self.assertEqual(funding_selection.calculate(self.draft["bundle"],self.draft["selection_assessments"],self.route)["subtotal"],0)
        self.assertEqual(row["answers"],before["selection_assessments"][self.route]["criteria"]["IN.1"]["answers"])
        row["answers"]["IN.1.2"]=True
        score=funding_selection.calculate(self.draft["bundle"],self.draft["selection_assessments"],self.route)
        self.assertEqual(score["subtotal"],2.49)
        self.assertEqual(self.draft["selection_assessments"]["LEADER-AL20-2.6"],before["selection_assessments"]["LEADER-AL20-2.6"])
        q=next(q for q in funding_inputs.describe(self.draft)["questions"] if q["id"]=="selection_score")
        self.assertTrue(q["overridden"])

    def test_malformed_unknown_duplicate_unrelated_or_incompatible_evidence_is_rejected(self):
        row=self.draft["selection_assessments"][self.route]["criteria"]["IN.1"]
        valid=self.evidence({"IN.1.2":["IN-T1"]})
        for mutate in [lambda e:e.update(version=2),lambda e:e.update(library_hash="0"*64),lambda e:e.update(selections={"IN.1.1":["IN-T1"]}),lambda e:e.update(selections={"IN.1.2":["NPL1"]}),lambda e:e.update(selections={"CO.1.1":["NPL1"]}),lambda e:e["selections"]["IN.1.2"].append("IN-T1"),lambda e:e.pop("library_hash")]:
            evidence=deepcopy(valid);mutate(evidence);row["edl_evidence"]=evidence
            with self.assertRaises(Invalid):funding.validate_draft(self.draft,self.project)
        for mutate in [lambda d:d["bindings"].pop("IG.8.2"),lambda d:d["topics"][0]["item_ids"].append("unknown"),lambda d:d["items"][0].update(page=545),lambda d:d.update(version=2),lambda d:d["source"].update(sha256="0"*64)]:
            invalid=deepcopy(self.data);mutate(invalid)
            with self.assertRaises(Invalid):edl.validate(invalid)
        with patch.object(edl,"LIBRARY",edl.LIBRARY.with_name("missing-edl.json")):
            with self.assertRaisesRegex(Invalid,"Cannot load required"):edl.library()

    def test_reading_strategy_does_not_initialise_a_project_store(self):
        app=create_app()
        with TestClient(app) as client:
            response=client.get("/api/funding/edl");self.assertEqual(response.status_code,200,response.text)
            self.assertEqual(response.json()["library"]["id"],self.data["id"])
            self.assertIsNone(app.state.store)


class EdlPersistenceTests(unittest.TestCase):
    setUp=persistence_fixtures.FundingPersistenceTests.setUp
    body=persistence_fixtures.FundingPersistenceTests.body
    seed=persistence_fixtures.FundingPersistenceTests.seed

    def test_autosave_named_export_import_and_review_preserve_references_and_old_snapshots(self):
        d=self.seed();before=deepcopy(d);route="LEADER-AL20-3.4"
        old=self.client.post("/api/funding/save",json=self.body("save",d)).json()["attachment"]["scenarios"][0]
        data=edl.describe()
        row=d["selection_assessments"][route]["criteria"]["IG.8"]
        row["edl_evidence"]=dict(version=1,library_id=data["library"]["id"],library_hash=data["library_hash"],selections={"IG.8.2":["W2","W10"]})
        row["notes"]="Explain my operation’s connection to the consultation priorities."
        saved=self.client.post("/api/funding/save",json=self.body("draft",d));self.assertEqual(saved.status_code,200,saved.text)
        snapshot=self.path.read_bytes()
        bad=deepcopy(d);bad["selection_assessments"][route]["criteria"]["IG.8"]["edl_evidence"]["selections"]["IG.8.2"]=["IN-A1"]
        rejected=self.client.post("/api/funding/save",json=self.body("draft",bad));self.assertEqual(rejected.status_code,422,rejected.text);self.assertEqual(self.path.read_bytes(),snapshot)
        exported=Store(self.path).export();self.assertEqual(validate_export(exported)["funding"]["draft"],d)
        self.assertEqual(exported["funding"]["scenarios"][0],old)
        clone=Store(self.path.with_name("clone.json"));clone.mutate("import",0,str(uuid4()),dict(save=exported,confirm_replace=False));self.assertEqual(clone.export()["funding"]["draft"],d)
        prepared=funding.prepare(d,exported["project"],adopt_current_catalogue=True)
        self.assertEqual(prepared["draft"]["selection_assessments"],d["selection_assessments"])
        self.assertNotIn("edl_evidence",before["selection_assessments"][route]["criteria"]["IG.8"])
