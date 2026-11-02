"""Reviewed location actions retain a trace without changing historical arithmetic."""
from copy import deepcopy
from unittest.mock import patch
import unittest
from backend import funding, funding_statistics as stats, funding_selection as scoring
from backend import funding_location_decisions as decisions
from backend.engine import Invalid
from backend.storage import Store, validate_export
from test_designer_library import site
import test_funding as fixtures


class LocationDecisionsTests(unittest.TestCase):
    def setUp(self):
        self.project = site()
        self.draft = funding.new_draft(self.project, None, [], "business")
        self.data = stats.dataset()
        self.hash = funding.digest(self.data)
        self.route = "LEADER-AL20-3.4"
        self.settings = {**self.data["defaults"], "municipality": "Alhama de Almería"}

    def preview(self, draft=None, settings=None, route=None):
        return decisions.preview(self.draft if draft is None else draft, self.project, self.route if route is None else route, self.settings if settings is None else settings, self.hash)

    def apply(self, draft, settings, ids, route=None):
        route = self.route if route is None else route
        preview = self.preview(draft, settings, route)
        return decisions.apply(draft, self.project, route, settings, ids, self.hash, preview["hashes"]["both" if len(ids) == 2 else ids[0]])

    def test_business_explanation_is_independent_from_unresolved_population(self):
        before = deepcopy(self.draft)
        p = self.preview()
        rd, at = p["decisions"]["RD.5"], p["decisions"]["AT.3"]
        self.assertTrue(rd["ready"])
        self.assertFalse(at["ready"])
        self.assertIn("population basis", at["error"])
        self.assertIsNone(p["hashes"]["both"])
        c = rd["proposal"]["comparisons"][0]
        self.assertEqual((c["left"], c["operator"], c["right"], c["result"]), (284, "<", "60", False))
        self.assertEqual(rd["proposal"]["points"], 0)
        self.assertEqual(rd["proposal"]["cap"], 15)
        self.assertTrue({("FUND-010", 181), ("FUND-010", 182), ("FUND-004", 16)} <= {(s["document_id"], s["page"]) for s in rd["proposal"]["sources"]})
        self.assertEqual(self.draft, before)

    def test_separate_actions_preserve_other_routes_notes_and_per_item_locations(self):
        self.draft["selection_assessments"][self.route]["criteria"]["RD.5"]["notes"] = "Retain shared evidence"
        almocita = {**self.settings, "municipality": "Almócita", "population_mode": "municipality_proxy"}
        population = self.apply(self.draft, almocita, ["AT.3"])
        result = self.apply(population, self.settings, ["RD.5"])
        a = result["selection_assessments"][self.route]
        self.assertEqual(a["criteria"]["AT.3"], population["selection_assessments"][self.route]["criteria"]["AT.3"])
        self.assertEqual(a["criteria"]["RD.5"]["notes"], "Retain shared evidence")
        self.assertEqual(a["location_lookup"]["items"]["AT.3"]["settings"]["municipality"], "Almócita")
        self.assertEqual(a["location_lookup"]["items"]["RD.5"]["settings"], self.settings)
        for route in self.draft["selection_assessments"]:
            if route != self.route: self.assertEqual(result["selection_assessments"][route], self.draft["selection_assessments"][route])
        scored = scoring.calculate(result["bundle"], result["selection_assessments"], self.route)
        self.assertEqual(scored["subtotal"], 10)
        self.assertEqual(scored["location_basis"]["locations"], {"AT.3": "Almócita", "RD.5": "Alhama de Almería"})

    def test_before_after_trace_survives_manual_override(self):
        rd = self.draft["selection_assessments"][self.route]["criteria"]["RD.5"]["answers"]
        rd["RD.5.1"] = True
        result = self.apply(self.draft, self.settings, ["RD.5"])
        trace = self.preview(result)["decisions"]["RD.5"]["last_applied"]
        self.assertEqual((trace["before_points"], trace["points"]), (15, 0))
        a = result["selection_assessments"][self.route]
        a["location_lookup"]["automated"].remove("RD.5")
        a["criteria"]["RD.5"]["answers"]["RD.5.1"] = True
        p = self.preview(result)
        self.assertFalse(p["decisions"]["RD.5"]["active"])
        self.assertEqual(p["decisions"]["RD.5"]["last_applied"], trace)

    def test_legacy_review_preserves_unknown_before_and_unconfirmed_sibling(self):
        old = stats.apply(self.draft, self.project, self.route, self.settings, ["AT.3", "RD.5"], self.hash)
        updated = self.apply(old, self.settings, ["RD.5"])
        a = updated["selection_assessments"][self.route]
        self.assertEqual(a["criteria"]["AT.3"], old["selection_assessments"][self.route]["criteria"]["AT.3"])
        self.assertIn("AT.3", a["location_lookup"]["automated"])
        self.assertIsNone(a["location_lookup"]["items"]["AT.3"]["before_answers"])
        self.assertTrue(self.preview(updated)["decisions"]["AT.3"]["last_applied"]["legacy_no_population"])
        with self.assertRaisesRegex(Invalid, "legacy action cannot"):
            stats.apply(updated, self.project, self.route, self.settings, ["AT.3", "RD.5"], self.hash)

    def test_all_routes_strict_population_bands_and_business_points_unchanged(self):
        for route in self.draft["selection_assessments"]:
            for population, selected in [(0,"AT.3.1"),(538,"AT.3.1"),(539,"AT.3.2"),(2256,None)]:
                settings = {**self.settings,"municipality":"Almócita","population_mode":"settlement","settlement_name":"Verified núcleo","population":population,"population_year":2025}
                result = self.apply(self.draft, settings, ["AT.3", "RD.5"], route)
                proposal = self.preview(result, settings, route)["decisions"]["AT.3"]["proposal"]
                self.assertEqual([k for k,v in proposal["answers"].items() if v], [] if selected is None else [selected])
                legacy = stats.apply(self.draft, self.project, route, settings, ["AT.3", "RD.5"], self.hash)
                current_score = scoring.calculate(result["bundle"], result["selection_assessments"], route)
                old_score = scoring.calculate(legacy["bundle"], legacy["selection_assessments"], route)
                for key in ["subtotal", "total", "criteria", "unresolved"]: self.assertEqual(current_score[key], old_score[key])

    def test_old_scoring_editions_replay_without_implicit_upgrade(self):
        for edition in [1, 2]:
            catalogue = funding.catalogue()
            catalogue["selection"]["version"] = edition
            del catalogue["selection"]["defaults"]
            if edition == 1: del catalogue["selection"]["completion_policy"]
            else: catalogue["selection"]["completion_policy"] = "cap_or_all_answers"
            with patch.object(funding,"catalogue",side_effect=lambda:deepcopy(catalogue)):
                draft = funding.new_draft(self.project,None,[],"business")
                settings = {**self.settings,"municipality":"Almócita","population_mode":"municipality_proxy"}
                old = stats.apply(draft,self.project,self.route,settings,["AT.3","RD.5"],self.hash)
                result = self.apply(old,settings,["RD.5"])
                self.assertEqual(result["bundle"],old["bundle"])
                a = scoring.calculate(old["bundle"],old["selection_assessments"],self.route)
                b = scoring.calculate(result["bundle"],result["selection_assessments"],self.route)
                for key in ["criteria","subtotal","total","unresolved","result"]: self.assertEqual(a[key],b[key])

    def test_stale_answers_and_missing_inputs_reject_without_partial_mutation(self):
        p = self.preview()
        changed = deepcopy(self.draft)
        changed["selection_assessments"][self.route]["criteria"]["RD.5"]["answers"]["RD.5.1"] = True
        before = deepcopy(changed)
        with self.assertRaisesRegex(Invalid,"changed"):
            decisions.apply(changed,self.project,self.route,self.settings,["RD.5"],self.hash,p["hashes"]["RD.5"])
        with self.assertRaisesRegex(Invalid,"changed"):
            decisions.apply(changed,self.project,self.route,self.settings,["AT.3"],self.hash,p["hashes"]["AT.3"])
        self.assertEqual(changed,before)
        for settings in [{k:v for k,v in self.settings.items() if k != "population"},{**self.settings,"municipality":"Unknown"},{**self.settings,"population_mode":[]}]:
            result = self.preview(settings=settings)
            self.assertFalse(result["decisions"]["RD.5"]["ready"])
        with patch.object(stats,"DATASET_PATH",stats.DATASET_PATH.with_name("missing-statistics.json")):
            with self.assertRaisesRegex(Invalid,"Cannot load required"): self.preview()


class LocationDecisionsAPITests(unittest.TestCase):
    setUp = fixtures.FundingPersistenceTests.setUp
    seed = fixtures.FundingPersistenceTests.seed
    body = fixtures.FundingPersistenceTests.body

    def test_preview_apply_candidates_do_not_write_and_saved_trace_round_trips(self):
        d = self.seed(); route = "LEADER-AL20-3.4"
        data = self.client.get("/api/funding/statistics").json()
        payload = {"revision":self.view["revision"],"draft":d,"route":route,"settings":{**data["dataset"]["defaults"],"municipality":"Alhama de Almería"},"dataset_hash":data["dataset_hash"]}
        before = self.path.read_bytes()
        response = self.client.post("/api/funding/location-decision-preview", json=payload)
        self.assertEqual(response.status_code,200,response.text)
        preview = response.json()
        response = self.client.post("/api/funding/location-apply",json=payload | {"criteria":["RD.5"],"preview_hash":preview["hashes"]["RD.5"]})
        self.assertEqual(response.status_code,200,response.text)
        candidate = response.json()
        self.assertEqual(self.path.read_bytes(),before)
        saved = self.client.post("/api/funding/save",json=self.body("draft",candidate))
        self.assertEqual(saved.status_code,200,saved.text)
        exported = Store(self.path).export()
        self.assertEqual(validate_export(exported)["funding"]["draft"],candidate)
        clone = Store(self.path.with_name("imported.json"))
        from uuid import uuid4
        clone.mutate("import",0,str(uuid4()),dict(save=exported,confirm_replace=False))
        self.assertEqual(clone.export()["funding"]["draft"],candidate)
        bad = deepcopy(candidate)
        bad["selection_assessments"][route]["location_lookup"]["items"]["RD.5"]["settings"]["municipality"] = "Unknown"
        before = self.path.read_bytes()
        response = self.client.post("/api/funding/save",json=self.body("draft",bad))
        self.assertEqual(response.status_code,422,response.text)
        self.assertEqual(self.path.read_bytes(),before)
