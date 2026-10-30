"""Transient visual metadata preserves the evaluator and envelope-8 contract."""
from copy import deepcopy
import unittest
from backend import funding, funding_visual
import test_funding as fixtures


class VisualMetadataTests(unittest.TestCase):
    setUp = fixtures.FundingTests.setUp
    eligible = fixtures.FundingTests.eligible
    def test_dependency_network(self):
        d = self.eligible()
        before = deepcopy(d)
        assessment = funding.evaluate(d, self.project)
        v = funding_visual.visualise(assessment)
        self.assertIs(v["assessment"], assessment)
        self.assertEqual(d, before)
        model = v["visualisation"]
        self.assertEqual(len(model["coverage"]), len(d["bundle"]["entries"]))
        self.assertEqual(next(c for c in model["coverage"] if c["option_id"] == "LEADER-AL20-2.7")["unresolved_count"], 5)
        self.assertEqual(len({c["id"] for c in model["conditions"]}), len(model["conditions"]))
        income = next(c for c in model["conditions"] if c["option_id"] == "LEADER-AL20-2.7" and c["fields"] == ["net_year1", "smi_year1"])
        self.assertEqual(income["result"], "pass")
        d["overrides"]["smi_year1"] = 30000
        changed = funding_visual.describe(funding.evaluate(d, self.project))
        self.assertEqual(next(c for c in changed["conditions"] if c["id"] == income["id"])["result"], "fail")
        d["overrides"]["smi_year1"] = None
        unknown = funding_visual.describe(funding.evaluate(d, self.project))
        self.assertEqual(next(c for c in unknown["conditions"] if c["id"] == income["id"])["result"], "unknown")
        research = [c for c in model["coverage"] if c["requirements"] == "research_only"]
        self.assertTrue(research)
        self.assertTrue(all(c["condition_ids"] == [] and c["unresolved_count"] == 0 for c in research))
        self.assertTrue(all(c["option_id"] not in {r["option_id"] for r in research} for c in model["conditions"]))

    def test_duplicate_checks_and_shared_fields_keep_separate_stable_ids(self):
        d = self.eligible(); d["overrides"]["applicant_kind"] = "public_company"
        v = funding_visual.describe(funding.evaluate(d, self.project))
        checks = [c for c in v["conditions"] if c["option_id"] == "LEADER-AL20-3.4" and c["fields"] == ["applicant_kind"]]
        self.assertEqual([c["result"] for c in checks], ["pass", "unknown"])
        self.assertNotEqual(checks[0]["id"], checks[1]["id"])
        shared = [c for c in v["conditions"] if c["fields"] == ["applicant_kind"]]
        self.assertEqual(len({c["option_id"] for c in shared}), 5)
        d["overrides"]["applicant_kind"] = "university"
        updated = funding_visual.describe(funding.evaluate(d, self.project))
        self.assertEqual([c["id"] for c in checks], [c["id"] for c in updated["conditions"] if c["option_id"] == "LEADER-AL20-3.4" and c["fields"] == ["applicant_kind"]])

    def test_amount_inputs_are_not_eligibility_conditions(self):
        d = self.eligible()
        d["overrides"].update(bonus_young="yes", eligible_cost=0)
        a = funding.evaluate(d, self.project)
        v = funding_visual.describe(a)
        bonuses = [c for c in v["conditions"] if c["fields"][0].startswith("bonus_")]
        self.assertEqual(len(bonuses), 5)
        self.assertTrue(all(c["effect"] == "amount" and c["sources"] for c in bonuses))
        young = next(c for c in bonuses if c["fields"] == ["bonus_young"])
        self.assertEqual(young["value"], d["bundle"]["rules"]["2.7"]["bonuses"]["bonus_young"])
        self.assertEqual(young["result"], "pass")
        self.assertTrue(all(c["result"] == "unknown" and c["value"] is None for c in bonuses if c != young))
        cost = next(c for c in v["conditions"] if c["option_id"] == "LEADER-AL20-3.4" and c["effect"] == "amount")
        self.assertEqual(cost["fields"], ["eligible_cost"])
        self.assertEqual(cost["value"], 0)
        self.assertEqual(cost["result"], "pass")
        self.assertFalse(any(c["field"] == "bonus_young" for r in a["results"] for c in r["checks"]))


class VisualEndpointTests(unittest.TestCase):
    setUp = fixtures.FundingPersistenceTests.setUp
    seed = fixtures.FundingPersistenceTests.seed
    body = fixtures.FundingPersistenceTests.body
    def test_visualise_is_identical_read_only_and_never_saved(self):
        d = self.seed()
        body = dict(revision=self.view["revision"], draft=d)
        before = self.client.get("/api/export").json()
        disk = self.path.read_bytes()
        expected = self.client.post("/api/funding/evaluate", json=body)
        visual = self.client.post("/api/funding/visualise", json=body)
        self.assertEqual(visual.status_code, 200, visual.text)
        self.assertEqual(visual.json()["assessment"], expected.json())
        self.assertEqual(self.path.read_bytes(), disk)
        self.assertEqual(self.client.get("/api/export").json(), before)
        self.assertEqual(self.client.post("/api/funding/save", json=self.body("save", d)).status_code, 200)
        exported = self.client.get("/api/export").json()
        self.assertEqual(exported["format_version"], 8)
        saved = exported["funding"]["scenarios"][0]["assessment"]
        self.assertEqual(saved, expected.json())
        self.assertNotIn("visualisation", saved)
        invalid = self.client.post("/api/funding/visualise", json={**body, "revision":body["revision"]+1})
        self.assertEqual(invalid.status_code, 409)
