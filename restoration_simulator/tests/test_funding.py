"""Funding exploration is reproducible and cannot silently become simulation cash."""
from copy import deepcopy
import json
from pathlib import Path
import re
from tempfile import TemporaryDirectory
from unittest.mock import patch
from uuid import uuid4
import unittest

from fastapi.testclient import TestClient
from backend import funding, engine, documents
from backend.app import create_app
from backend.storage import Store, validate_export
from test_designer_library import site


class FundingTests(unittest.TestCase):
    def setUp(self):
        self.project = site()
        self.draft = funding.new_draft(self.project, None, [], "business")

    def eligible(self):
        d = deepcopy(self.draft)
        d["overrides"] = dict(applicant_kind="individual", applicant_id="individual", municipality="Alhama de Almería", territory_verified="yes", sector="general", unemployed="yes", new_activity="yes", no_same_reta="yes", resident="yes", exclusive="yes", start_after_application="yes", plan_24_months="yes", retention="yes", unemployment_percent=50, other_aid="no", net_year1=10000, smi_year1=20000, net_year2=20000, smi_year2=20000)
        d["overrides"]["selection_score"] = 60
        return d

    def result(self, d, identity="LEADER-AL20-2.7"):
        return next(r for r in funding.evaluate(d, self.project)["results"] if r["id"] == identity)

    def test_catalogue_covers_reference_ids_and_verified_core_sources(self):
        c = funding.catalogue()
        source = Path(__file__).resolve().parents[2] / "doc_library" / "FUND-007 - Algarroba - Funding Navigator Reference Catalogue - 2026-10-30.md"
        ids = set(re.findall(r"^#{3,4} `(LEADER-[^`]+|ES-[^`]+|EU-[^`]+|NATURE-[^`]+|FIN-[^`]+)`", source.read_text(encoding="utf-8"), re.M))
        self.assertEqual(ids | {"SELF-FUNDS", "PARTNER-FUNDS"}, {e["id"] for e in c["entries"]})
        for e in c["entries"]:
            for s in e["sources"]:
                doc = documents.record(s["document_id"])
                self.assertEqual(doc["sha256"], s["sha256"])
                self.assertLessEqual(s["page"], doc["pages"])

    def test_startup_lump_sum_bonuses_cap_and_no_cash_effects(self):
        before = deepcopy(self.project)
        d = self.eligible()
        r = self.result(d)
        self.assertEqual(r["status"], "Possible match — eligibility unverified")
        self.assertEqual(r["finance"]["estimate"], 37000)
        self.assertEqual([s["amount"] for s in r["finance"]["schedule"]], [18500, 18500])
        d["overrides"].update({k: "yes" for k in d["bundle"]["rules"]["2.7"]["bonuses"]})
        r = self.result(d)
        self.assertEqual(r["finance"]["estimate"], 50000)
        self.assertEqual(r["finance"]["bonus"], 13000)
        self.assertEqual(r["finance"]["schedule"][1]["amount"], 31500)
        self.assertEqual(self.project, before)

    def test_startup_conditions_and_forestry_classification(self):
        for field, value in [("applicant_kind", "nonprofit"), ("unemployed", "no"), ("no_same_reta", "no"), ("unemployment_percent", 49), ("start_after_application", "no"), ("retention", "no"), ("sector", "agrarian_services"), ("net_year2", 19999), ("other_aid", "yes")]:
            with self.subTest(field=field):
                d = self.eligible(); d["overrides"][field] = value
                r = self.result(d)
                self.assertEqual(r["status"], "Does not match these facts")
                self.assertIsNone(r["finance"]["estimate"])
        d = self.eligible(); d["overrides"]["sector"] = "mixed"
        self.assertEqual(self.result(d)["status"], "Needs information")

    def test_unknown_is_not_rejection_or_zero_and_zero_stays_zero(self):
        r = self.result(self.draft)
        self.assertEqual(r["status"], "Needs information")
        d = self.eligible(); d["overrides"].update(eligible_cost=0, budget_total=0, available_contribution=0, cash_before_receipts=0)
        self.assertEqual(self.result(d)["finance"]["estimate"], 37000)
        a = funding.evaluate(d, self.project)
        self.assertEqual(a["uncovered"], 0)
        self.assertEqual(a["upfront_shortfall"], 0)

    def test_demo_restoration_and_business_costs_are_distinct(self):
        d = deepcopy(self.draft)
        d["overrides"] = dict(activity="demonstration", applicant_kind="nonprofit", purpose="conservation", municipality="Alhama de Almería", territory_verified="yes", rights_sufficient="yes", permits="yes", public_access="yes", related_competence="yes", not_started="yes", novelty="yes", testable="yes", dissemination="yes", publication_three_years="yes", eligible_cost=10000)
        r = self.result(d, "LEADER-AL20-3.4")
        self.assertEqual(r["finance"]["estimate"], 10000)
        d["overrides"]["eligible_cost"] = 50000
        self.assertEqual(self.result(d, "LEADER-AL20-3.4")["finance"]["estimate"], 28000)
        d["overrides"]["novelty"] = "no"
        self.assertEqual(self.result(d, "LEADER-AL20-3.4")["status"], "Does not match these facts")
        d["overrides"].update(heritage="yes", forest_plan="yes", land_purchase="no")
        self.assertEqual(self.result(d, "LEADER-AL20-3.5")["finance"]["estimate"], 50000)
        d["overrides"]["land_purchase"] = "yes"
        self.assertIsNone(self.result(d, "LEADER-AL20-3.5")["finance"]["estimate"])
        d = self.eligible(); d["overrides"].update(sector="agrarian_services", sme="yes", not_started="yes", eligible_cost=10000)
        self.assertEqual(self.result(d, "LEADER-AL20-1.11")["finance"]["estimate"], 6500)
        self.assertIsNone(self.result(d, "LEADER-AL20-2.6")["finance"]["estimate"])

    def test_hypothetical_parties_snapshots_and_context_refresh(self):
        d = self.eligible(); d["selected"] = ["LEADER-AL20-2.7"]
        v = funding.operate(None, self.project, None, "save", d, None)
        v = funding.operate(v, self.project, None, "adopt", d, None)
        self.assertEqual(len(v["scenarios"]), 1)
        self.assertTrue(v["plans"][0]["active"])
        self.assertEqual(self.project["parties"][0]["kind"], "individual")
        next_d = deepcopy(d); next_d["name"] = "Alternative"; next_d["overrides"]["applicant_kind"] = "nonprofit"
        v = funding.operate(v, self.project, None, "adopt", next_d, None)
        self.assertEqual([p["active"] for p in v["plans"]], [False, True])
        self.assertEqual(v["scenarios"][0]["draft"], d)
        changed = deepcopy(self.project); changed["parties"][0]["name"] = "Updated individual"
        self.assertTrue(funding.evaluate(d, changed)["stale"])
        with self.assertRaises(engine.Invalid): funding.operate(v, changed, None, "adopt", d, None)

    def test_research_options_and_combination_warnings(self):
        d = self.eligible(); d["selected"] = ["LEADER-AL20-2.7", "LEADER-AL20-3.4"]
        d["allocations"] = [dict(mechanism_id=id, cost_line="Planting", amount=100, kind="anticipated") for id in d["selected"]]
        a = funding.evaluate(d, self.project)
        self.assertTrue(any("incompatible" in w or "cannot be combined" in w for w in a["warnings"]))
        self.assertTrue(any("same cost" in w for w in a["warnings"]))
        r = self.result(d, "EU-LIFE-NATURE")
        self.assertEqual(r["status"], "Needs information")
        self.assertIsNone(r["finance"]["estimate"])
        r = self.result(d, "NATURE-08")
        self.assertIsNone(r["finance"]["estimate"])

    def test_malformed_overrides_and_allocations_fail(self):
        for k, value in [("eligible_cost", True), ("eligible_cost", -1), ("unemployed", "perhaps"), ("activity", "unknown-made-up")]:
            d = deepcopy(self.draft); d["overrides"][k] = value
            with self.assertRaises(engine.Invalid): funding.evaluate(d, self.project)
        d = deepcopy(self.draft); del d["baseline"]["facts"]["activity"]
        with self.assertRaises(engine.Invalid): funding.evaluate(d, self.project)

    def test_unverified_location_and_selection_are_questions_not_guessed(self):
        d = self.eligible(); d["overrides"]["municipality"] = "Alhama de Almeria"
        self.assertEqual(self.result(d)["status"], "Possible match — eligibility unverified")
        d["overrides"]["municipality"] = "A place not yet resolved"
        self.assertEqual(self.result(d)["status"], "Needs information")
        d["overrides"].update(municipality="Alhama de Almería", selection_score=59)
        self.assertIsNone(self.result(d)["finance"]["estimate"])
        d["overrides"].update(selection_score=None, territory_verified="no")
        self.assertEqual(self.result(d)["status"], "Needs information")

    def test_frameworks_are_context_and_scenarios_can_be_updated(self):
        d = self.eligible(); d["selected"] = ["ES-FB-RENATURALISATION-BASES"]
        with self.assertRaises(engine.Invalid): funding.operate(None, self.project, None, "adopt", d, None)
        v = funding.operate(None, self.project, None, "save", d, None)
        id = v["scenarios"][0]["id"]
        d["name"] = "Renamed scenario"
        v = funding.operate(v, self.project, None, "save", d, id)
        self.assertEqual(len(v["scenarios"]), 1)
        self.assertEqual(v["scenarios"][0]["draft"]["name"], "Renamed scenario")
        tampered = deepcopy(v)
        tampered["scenarios"][0]["assessment"]["results"][0]["finance"]["estimate"] = 999999
        with self.assertRaises(engine.Invalid): funding.validate_attachment(tampered, self.project)


class FundingPersistenceTests(unittest.TestCase):
    def setUp(self):
        self.tmp = TemporaryDirectory(); self.addCleanup(self.tmp.cleanup)
        self.path = Path(self.tmp.name) / "save.json"
        s = Store(self.path)
        s.mutate("import", 0, str(uuid4()), dict(save=dict(format_version=4, project=site(), undo=None), confirm_replace=False))
        self.client = TestClient(create_app(self.path)); self.addCleanup(self.client.close)
        self.view = self.client.get("/api/project").json()

    def body(self, operation, draft, **extra):
        w = self.client.get("/api/funding").json()
        return dict(revision=self.view["revision"], funding_revision=w["funding_revision"], planning_revision=self.view["planning"]["planning_revision"], design_revision=self.view["designer_revision"], request_id=str(uuid4()), operation=operation, draft=draft, record_id=None, **extra)

    def seed(self, target="business", parcel_ids=None):
        r = self.client.post("/api/funding/context", json={k:self.view[k] for k in ["revision"]} | dict(planning_revision=self.view["planning"]["planning_revision"], design_revision=self.view["designer_revision"], target=target, parcel_ids=[] if parcel_ids is None else parcel_ids))
        self.assertEqual(r.status_code, 200, r.text)
        return r.json()

    def add_parcel(self):
        f = self.client.post("/api/land/form", json=dict(revision=self.view["revision"], route_id="existing", parcel_id="new")).json()
        inputs = {f["name"]: f["default"] for f in f["fields"]}
        inputs.update(route_id="existing", parcel_id="new", parcel_area=4500, covered_area=4500)
        r = self.client.post("/api/commit", json=dict(revision=self.view["revision"], request_id=str(uuid4()), action_id="establish_access", inputs=inputs))
        self.assertEqual(r.status_code, 200, r.text)
        self.view = r.json()
        return self.view["project"]["parcels"][-1]["id"]

    def test_draft_save_adoption_idempotency_restart_export_and_no_effects(self):
        d = self.seed(); d["selected"] = ["LEADER-AL20-2.7"]
        before = self.client.get("/api/export").json()
        body = self.body("save", d)
        first = self.client.post("/api/funding/save", json=body)
        self.assertEqual(first.status_code, 200, first.text)
        self.assertEqual(self.client.post("/api/funding/save", json=body).json(), first.json())
        r = self.client.post("/api/funding/save", json=self.body("adopt", d)); self.assertEqual(r.status_code, 200, r.text)
        after = self.client.get("/api/export").json()
        for k in ["project", "designer", "planning", "undo"]: self.assertEqual(after[k], before[k])
        self.assertEqual(after["format_version"], 8)
        self.assertEqual(Store(self.path).snapshot()["funding"], after["funding"])
        self.assertEqual(validate_export(after)["funding"], after["funding"])
        clone = Store(Path(self.tmp.name) / "copy.json")
        clone.mutate("import", 0, str(uuid4()), dict(save=after, confirm_replace=False))
        self.assertEqual(clone.export()["funding"], after["funding"])

    def test_failures_and_stale_revisions_preserve_confirmed_state(self):
        d = self.seed(); body = self.body("draft", d)
        original = self.path.read_bytes()
        body["funding_revision"] += 1
        self.assertEqual(self.client.post("/api/funding/save", json=body).status_code, 409)
        body["funding_revision"] -= 1
        with patch.object(Store, "write", side_effect=OSError("Disk full")):
            self.assertEqual(self.client.post("/api/funding/save", json=body).status_code, 503)
        self.assertEqual(self.path.read_bytes(), original)
        self.assertEqual(self.client.post("/api/funding/save", json=body).status_code, 200)

    def test_v7_backup_and_no_invented_funding(self):
        exported = self.client.get("/api/export").json()
        old = {k:v for k,v in exported.items() if not k.startswith("funding")}; old["format_version"] = 7
        old.update(receipts={}, revision=self.view["revision"], undo_edit=None)
        path = Path(self.tmp.name) / "v7.json"; path.write_text(json.dumps(old), encoding="utf-8")
        original = path.read_bytes(); s = Store(path).snapshot()
        self.assertIsNone(s["funding"])
        self.assertEqual(s["format_version"], 8)
        self.assertEqual(next(Path(self.tmp.name).glob("v7.schema-v7-*.json")).read_bytes(), original)

    def test_parcel_deletion_preview_cleanup_and_undo(self):
        pid = self.view["project"]["parcels"][0]["id"]
        d = self.seed(parcel_ids=[pid])
        self.assertEqual(self.client.post("/api/funding/save", json=self.body("save", d)).status_code, 200)
        before = self.client.get("/api/export").json()
        preview = self.client.post("/api/parcels/removal-preview", json=dict(revision=self.view["revision"], parcel_id=pid))
        self.assertEqual(preview.status_code, 200, preview.text)
        self.assertTrue(any(a["title"].startswith("Funding:") for a in preview.json()["removed_actions"]))
        result = self.client.post("/api/parcels/delete", json=dict(revision=self.view["revision"], request_id=str(uuid4()), parcel_id=pid, confirm=True))
        self.assertEqual(result.status_code, 200, result.text)
        self.assertEqual(self.client.get("/api/funding").json()["attachment"]["scenarios"], [])
        self.assertIsNone(self.client.get("/api/export").json()["funding_undo"])
        undo = self.client.post("/api/undo", json=dict(revision=result.json()["revision"], request_id=str(uuid4())))
        self.assertEqual(undo.status_code, 200, undo.text)
        self.assertEqual(self.client.get("/api/export").json()["funding"], before["funding"])

    def test_shared_adopted_plan_blocks_parcel_deletion_until_unlinked(self):
        self.add_parcel()
        ids = [p["id"] for p in self.view["project"]["parcels"]]
        d = self.seed(parcel_ids=ids); d["selected"] = ["LEADER-AL20-2.7"]
        r = self.client.post("/api/funding/save", json=self.body("adopt", d))
        self.assertEqual(r.status_code, 200, r.text)
        before = self.path.read_bytes()
        preview = self.client.post("/api/parcels/removal-preview", json=dict(revision=self.view["revision"], parcel_id=ids[0]))
        self.assertEqual(preview.status_code, 422)
        self.assertIn("shared adopted", preview.text)
        self.assertEqual(self.path.read_bytes(), before)

    def test_retained_parcel_links_remap_and_later_alternative_survives_undo(self):
        second = self.add_parcel(); first = self.view["project"]["parcels"][0]["id"]
        d = self.seed(parcel_ids=[second]); d["name"] = "Retained parcel"
        self.assertEqual(self.client.post("/api/funding/save", json=self.body("save", d)).status_code, 200)
        deleted = self.client.post("/api/parcels/delete", json=dict(revision=self.view["revision"], request_id=str(uuid4()), parcel_id=first, confirm=True))
        self.assertEqual(deleted.status_code, 200, deleted.text); self.view = deleted.json()
        survivor = self.view["project"]["parcels"][0]["id"]
        w = self.client.get("/api/funding").json()
        self.assertEqual(w["attachment"]["scenarios"][0]["draft"]["baseline"]["parcel_ids"], [survivor])
        later = self.seed(parcel_ids=[survivor]); later["name"] = "Saved after deletion"
        self.assertEqual(self.client.post("/api/funding/save", json=self.body("save", later)).status_code, 200)
        undo = self.client.post("/api/undo", json=dict(revision=self.view["revision"], request_id=str(uuid4())))
        self.assertEqual(undo.status_code, 200, undo.text)
        w = self.client.get("/api/funding").json()
        self.assertEqual({r["draft"]["name"] for r in w["attachment"]["scenarios"]}, {"Retained parcel", "Saved after deletion"})
        self.assertTrue(all(r["draft"]["baseline"]["parcel_ids"] == [second] for r in w["attachment"]["scenarios"]))

    def test_undo_of_new_parcel_removes_its_funding_links(self):
        second = self.add_parcel()
        d = self.seed(parcel_ids=[second])
        self.assertEqual(self.client.post("/api/funding/save", json=self.body("save", d)).status_code, 200)
        undo = self.client.post("/api/undo", json=dict(revision=self.view["revision"], request_id=str(uuid4())))
        self.assertEqual(undo.status_code, 200, undo.text)
        self.assertEqual(self.client.get("/api/funding").json()["attachment"]["scenarios"], [])


if __name__ == "__main__": unittest.main()
