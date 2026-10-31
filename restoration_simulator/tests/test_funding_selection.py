"""Source-backed AL20 arithmetic, route isolation, failure paths and compatibility."""
from copy import deepcopy
from decimal import Decimal
import json
import unittest
from unittest.mock import patch

from backend import funding, funding_selection as scoring, funding_visual, documents
from backend.engine import Invalid
from test_designer_library import site
import test_funding as persistence_fixtures


class SelectionTests(unittest.TestCase):
    def setUp(self):
        self.project = site()
        self.draft = funding.new_draft(self.project, None, [], "business")

    def score(self, route="3.4", draft=None):
        d = self.draft if draft is None else draft
        funding.validate_draft(d, self.project)
        return scoring.calculate(d["bundle"], d["selection_assessments"], "LEADER-AL20-" + route)

    def row(self, cid, route="3.4"):
        return self.draft["selection_assessments"]["LEADER-AL20-" + route]["criteria"][cid]

    def zero(self, route="3.4"):
        for row in self.draft["selection_assessments"]["LEADER-AL20-" + route]["criteria"].values():
            row["answers"] = {k: False for k in row["answers"]}
            row["inputs"] = {k: False if k == "qualifying_uta" else 0 for k in row["inputs"]}

    def test_profiles_sources_and_frozen_catalogue(self):
        c = self.draft["bundle"]
        self.assertEqual((self.draft["version"], c["version"]), (4, 3))
        self.assertEqual({p: len(v["criteria"]) for p, v in c["selection"]["profiles"].items()}, {"line1": 17, "line2": 16, "line3": 14})
        for profile in c["selection"]["profiles"].values():
            self.assertEqual(sum(Decimal(x["cap"]) for x in profile["criteria"]), 100)
            for cr in profile["criteria"]:
                self.assertTrue(cr["label_es"])
                for ref in cr["sources"] + [s for ch in cr["choices"] for s in ch["sources"]]:
                    doc = documents.record(ref["document_id"])
                    self.assertEqual(ref["sha256"], doc["sha256"])
                    self.assertLessEqual(ref["page"], doc["pages"])
        for edition in [1, 2]:
            old = json.loads((funding.CATALOGUE.parent / f"funding-v{edition}.json").read_text(encoding="utf-8"))
            funding.validate_catalogue(old)
            self.assertNotIn("selection", old)

    def test_unknown_explicit_zero_partial_and_route_isolation(self):
        old = deepcopy(self.draft)
        s = self.score()
        self.assertIsNone(s["total"]); self.assertEqual(s["result"], "unknown")
        self.row("AT.3")["answers"].update({"AT.3.1": True, "AT.3.2": False})
        self.assertEqual(self.score()["subtotal"], 10)
        self.assertIsNone(self.score()["total"])
        self.assertEqual(self.score("3.5")["subtotal"], 0)
        self.assertEqual(self.draft["selection_assessments"]["LEADER-AL20-3.5"], old["selection_assessments"]["LEADER-AL20-3.5"])
        differences = funding.evaluate(self.draft, self.project)["differences"]
        assessments = [d for d in differences if d["editor"] == "funding"]
        self.assertEqual(len(assessments), 1)
        self.assertEqual(assessments[0]["field"], "selection_assessment:LEADER-AL20-3.4")
        self.assertIn("self-assessed", assessments[0]["assumed"])
        self.zero(); self.assertEqual(self.score()["total"], 0)
        self.assertEqual(self.score()["result"], "fail")

    def test_exact_fractional_points_and_cumulative_caps(self):
        self.zero()
        row = self.row("IN.1")
        row["answers"] = {k: True for k in row["answers"]}
        result = self.score()
        self.assertEqual(result["total"], 5)
        pt = self.row("PT.1"); pt["answers"] = {k: True for k in pt["answers"]}
        cr = next(c for c in self.score()["criteria"] if c["id"] == "PT.1")
        self.assertEqual((cr["uncapped"], cr["subtotal"]), (22, 15))
        self.assertEqual(self.score()["total"], 20)

    def test_subtotal_above_threshold_stays_unknown_until_every_criterion_is_answered(self):
        for cid, selected in {"AT.3": ["AT.3.1"], "CO.1": ["CO.1.3"], "RD.5": ["RD.5.1"], "CC.2": ["CC.2.1"],
                              "IN.1": ["IN.1.1", "IN.1.2", "IN.1.3"], "PT.1": ["PT.1.1"]}.items():
            row = self.row(cid)
            row["answers"] = {key: key in selected for key in row["answers"]}
        result = self.score()
        self.assertEqual(result["subtotal"], 63)
        self.assertEqual(result["unresolved"], 8)
        self.assertIsNone(result["total"])
        self.assertEqual(result["result"], "unknown")

    def test_exclusions_upward_additions_and_route_specific_choices(self):
        self.row("AT.3")["answers"].update({"AT.3.1": True, "AT.3.2": True})
        with self.assertRaisesRegex(Invalid, "mutually exclusive"): self.score()
        self.zero()
        self.zero("2.7")
        row = self.row("PE.2", "2.7")
        row["answers"]["PE.2.5"] = True
        with self.assertRaisesRegex(Invalid, "requires PE.2.4"): self.score("2.7")
        row["answers"]["PE.2.4"] = True
        s = self.score("2.7")
        self.assertIsNone(s["total"])
        row["inputs"]["qualifying_uta"] = True
        self.assertEqual(self.score("2.7")["total"], 5)
        self.assertIn("PE.1.5", self.row("PE.1", "2.7")["answers"])
        self.assertNotIn("PE.1.5", self.row("PE.1", "2.6")["answers"])
        self.assertNotIn("PE.1.5", self.row("PE.1", "1.11")["answers"])

    def test_ratio_strict_boundaries_and_no_implicit_financial_inputs(self):
        self.zero("2.6")
        row = self.row("PE.4", "2.6")
        for grant, jobs, expected in [(19999.99, 1, 3), (20000, 1, 2), (59999.99, 1, 2), (60000, 1, 1), (99999.99, 1, 1), (100000, 1, 0), (0, 0, 0), (40000, 2, 2)]:
            row["inputs"].update(grant=grant, quality_jobs=jobs)
            self.assertEqual(self.score("2.6")["total"], expected)
        row["inputs"]["grant"] = None
        self.draft["overrides"]["eligible_cost"] = 10000
        self.assertIsNone(self.score("2.6")["total"])

    def test_thresholds_below_at_above_for_every_route(self):
        # Build valid choices using actual annex rows, not invented total overrides.
        for short in ["1.11", "2.6", "2.7", "3.4", "3.5"]:
            route = "LEADER-AL20-" + short
            self.zero(short)
            candidates = {0: []}
            for cr in scoring.profile_for(self.draft["bundle"], route)["criteria"]:
                choices = scoring.choices_for(cr, route)
                alternatives = [(0, None)]
                alternatives += [(int(Decimal(ch["points"]) * 100), ch["id"]) for ch in choices if ch["id"] not in cr["requires"]]
                if cr["method"] == "ratio": alternatives = [(0, None), (300, "ratio")]
                next_candidates = {}
                for before, selections in candidates.items():
                    for amount, choice in alternatives:
                        if before + amount <= 6100: next_candidates[before + amount] = selections + [(cr["id"], choice)]
                candidates = next_candidates
            for target in [5900, 6000, 6100]:
                self.assertIn(target, candidates, short)
                self.zero(short)
                for cid, choice in candidates[target]:
                    if choice is None: continue
                    row = self.row(cid, short)
                    if choice == "ratio": row["inputs"].update(grant=0, quality_jobs=1)
                    else: row["answers"][choice] = True
                    if cid == "PE.2": row["inputs"]["qualifying_uta"] = True
                s = self.score(short)
                self.assertEqual(s["total"], target / 100)
                self.assertEqual(s["result"], "fail" if target == 5900 else "pass")
                r = next(r for r in funding.evaluate(self.draft, self.project)["results"] if r["id"] == route)
                self.assertEqual(next(c for c in r["checks"] if c["field"] == "selection_score")["result"], s["result"])

    def test_malformed_rules_answers_and_manual_totals_are_rejected(self):
        corruptions = [lambda d: d["selection_assessments"].pop("LEADER-AL20-3.4"),
                       lambda d: d["selection_assessments"]["LEADER-AL20-3.4"].update(total=100),
                       lambda d: d["selection_assessments"]["LEADER-AL20-3.4"]["criteria"]["AT.3"]["answers"].update(guessed=True),
                       lambda d: d["overrides"].update(selection_score=100),
                       lambda d: d.update(version=99),
                       lambda d: d["bundle"]["selection"]["profiles"]["line3"]["criteria"][0].pop("sources"),
                       lambda d: d["bundle"]["selection"]["profiles"]["line3"]["criteria"][0].update(exclusive_groups=[]),
                       lambda d: d["selection_assessments"]["LEADER-AL20-2.6"]["criteria"]["PE.4"]["inputs"].update(grant=float("nan"))]
        for change in corruptions:
            bad = deepcopy(self.draft); change(bad)
            with self.assertRaises(Invalid): funding.evaluate(bad, self.project)

    def test_upgrade_preserves_old_manual_score_and_saved_snapshots(self):
        for edition in [1, 2]:
            legacy = json.loads((funding.CATALOGUE.parent / f"funding-v{edition}.json").read_text(encoding="utf-8"))
            with patch.object(funding, "catalogue", return_value=legacy):
                old = funding.new_draft(self.project, None, [], "business")
                old["overrides"]["selection_score"] = 76
                saved = funding.operate(None, self.project, None, "save", old, None)
            before = deepcopy(saved)
            self.assertEqual(funding.prepare(old, self.project)["draft"], old)
            updated = funding.prepare(old, self.project, adopt_current_catalogue=True)
            draft = updated["draft"]
            self.assertEqual((draft["version"], draft["legacy_selection_score"]), (4, 76))
            self.assertNotIn("selection_score", draft["overrides"])
            self.assertIsNone(self.score(draft=draft)["total"])
            after = funding.operate(saved, self.project, None, "draft", draft, None)
            self.assertEqual(after["scenarios"], before["scenarios"])
            self.assertEqual(saved, before)
            value = funding_visual.visualise(funding.evaluate(draft, self.project))
            self.assertEqual(value["visualisation"]["version"], 2)
            self.assertEqual(len(value["visualisation"]["annex"]["routes"]), 5)
            question = next(q for q in value["input_context"]["questions"] if q["id"] == "selection_score")
            self.assertEqual((question["type"], question["legacy_selection_score"]), ("selection", 76))


class GuidanceUpdateTests(unittest.TestCase):
    setUp = SelectionTests.setUp
    score = SelectionTests.score
    def test_population_guidance_update_is_reviewed_and_preserves_answers(self):
        old = deepcopy(self.draft)
        for profile in old["bundle"]["selection"]["profiles"].values():
            criterion = next(c for c in profile["criteria"] if c["id"] == "AT.3")
            criterion.update(guidance="Use the INE 2023 settlement population and local median.", limitations=[])
            criterion["sources"] = [s for s in criterion["sources"] if s["page"] not in {11, 113}]
        row = old["selection_assessments"]["LEADER-AL20-3.4"]["criteria"]["AT.3"]
        row["answers"] = {"AT.3.1": True, "AT.3.2": False}
        row["reference"] = "Keep my population evidence"
        previous = deepcopy(old)
        saved = funding.operate(None, self.project, None, "save", old, None)
        self.assertEqual(funding.prepare(old, self.project)["draft"], previous)
        prepared = funding.prepare(old, self.project, adopt_current_catalogue=True)
        self.assertIsNotNone(prepared["catalogue_review"])
        self.assertEqual(prepared["draft"]["selection_assessments"], old["selection_assessments"])
        for profile in prepared["draft"]["bundle"]["selection"]["profiles"].values():
            criterion = next(c for c in profile["criteria"] if c["id"] == "AT.3")
            self.assertIn("539", criterion["guidance"])
            self.assertIn("2025", criterion["guidance"])
            self.assertIn("https://www.ine.es/nomen2/index.do?L=1", criterion["guidance"])
            self.assertIn(113, [s["page"] for s in criterion["sources"] if s["document_id"] == "FUND-010"])
        self.assertEqual(self.score(draft=prepared["draft"])["subtotal"], 10)
        after = funding.operate(saved, self.project, None, "draft", prepared["draft"], None)
        self.assertEqual(after["scenarios"], saved["scenarios"])
        self.assertEqual(old, previous)

    def test_guidance_adapter_rejects_scoring_changes_and_removed_sources(self):
        old = deepcopy(self.draft)
        for mutation in ["points", "source"]:
            changed = deepcopy(old["bundle"])
            criterion = changed["selection"]["profiles"]["line3"]["criteria"][0]
            if mutation == "points": criterion["choices"][0]["points"] = "9"
            else: criterion["sources"].pop()
            with patch.object(funding, "catalogue", return_value=changed):
                with self.assertRaisesRegex(Invalid, "version-specific"):
                    funding.prepare(old, self.project, adopt_current_catalogue=True)


class SelectionPersistenceTests(unittest.TestCase):
    setUp = persistence_fixtures.FundingPersistenceTests.setUp
    seed = persistence_fixtures.FundingPersistenceTests.seed
    body = persistence_fixtures.FundingPersistenceTests.body
    def test_selection_references_roundtrip_and_failed_save_is_atomic(self):
        d = self.seed()
        row = d["selection_assessments"]["LEADER-AL20-3.4"]["criteria"]["AT.3"]
        row["answers"] = {"AT.3.1": True, "AT.3.2": False}
        row.update(reference="Scenario evidence reference", notes="Assumed INE comparison")
        saved = self.client.post("/api/funding/save", json=self.body("save", d))
        self.assertEqual(saved.status_code, 200, saved.text)
        snapshot = self.path.read_bytes()
        bad = deepcopy(d)
        bad["selection_assessments"]["LEADER-AL20-3.4"]["criteria"]["AT.3"]["answers"]["AT.3.2"] = True
        failed = self.client.post("/api/funding/save", json=self.body("draft", bad))
        self.assertEqual(failed.status_code, 422)
        self.assertEqual(self.path.read_bytes(), snapshot)
        from backend.storage import Store, validate_export
        stored = Store(self.path).export()
        self.assertEqual(validate_export(stored)["funding"]["draft"]["selection_assessments"], d["selection_assessments"])
