from copy import deepcopy
from pathlib import Path
from uuid import uuid4
import unittest
from unittest.mock import patch

from backend import funding, funding_selection as selection, funding_versions as versions, funding_overview, engine
import test_project_concepts as fixtures

R34, R35 = fixtures.R34, fixtures.R35


def historic_bundle(bundle, edition):
    result = deepcopy(bundle)
    result["selection"].pop("defaults")
    result["selection"]["version"] = edition
    if edition == 1: result["selection"].pop("completion_policy")
    else: result["selection"]["completion_policy"] = "cap_or_all_answers"
    return result


class SelectedItemsTests(unittest.TestCase):
    def setUp(self):
        self.project = engine.new_project("Selected items fixture")
        self.draft = funding.new_draft(self.project, None, [], "activity")

    def score(self, route=R34):
        funding.validate_draft(self.draft, self.project)
        return selection.calculate(self.draft["bundle"], self.draft["selection_assessments"], route)

    def test_all_five_routes_start_with_zero_and_no_unanswered_items(self):
        for route in self.draft["selection_assessments"]:
            score = self.score(route)
            self.assertEqual((score["subtotal"], score["total"], score["unresolved"], score["version"]), (0, 0, 0, 3))
            self.assertTrue(all(c["completion_reason"] == "not_selected" for c in score["criteria"]))

    def test_neutral_applicant_control_retains_all_authoritative_types(self):
        from backend.funding_inputs import describe
        question = next(q for q in describe(self.draft)["questions"] if q["id"] == "applicant_choice")
        self.assertEqual(dict(question["forms"]), funding.legal_forms(self.draft))
        self.assertTrue({"nonprofit", "public"} <= set(dict(question["forms"])))

    def test_caps_and_qualifying_conditions_are_unchanged(self):
        for route in self.draft["selection_assessments"]:
            profile = selection.profile_for(self.draft["bundle"], route)
            for criterion in profile["criteria"]:
                if criterion["method"] != "employment": continue
                row = self.draft["selection_assessments"][route]["criteria"][criterion["id"]]
                row["answers"][selection.choices_for(criterion, route)[0]["id"]] = True
                score = self.score(route)
                result = next(c for c in score["criteria"] if c["id"] == criterion["id"])
                self.assertFalse(result["complete"]); self.assertEqual(result["subtotal"], 0)
                row["inputs"]["qualifying_uta"] = False
                result = next(c for c in self.score(route)["criteria"] if c["id"] == criterion["id"])
                self.assertTrue(result["complete"]); self.assertEqual(result["subtotal"], 0)
                row["inputs"]["qualifying_uta"] = True
                self.assertGreater(next(c for c in self.score(route)["criteria"] if c["id"] == criterion["id"])["subtotal"], 0)
        row = self.draft["selection_assessments"][R34]["criteria"]["JR.3"]
        row["answers"].update({"JR.3.4": True, "JR.3.5": True})
        result = next(c for c in self.score()["criteria"] if c["id"] == "JR.3")
        self.assertEqual((result["uncapped"], result["subtotal"], result["completion_reason"]), (6, 4, "cap_reached"))
        row["answers"]["JR.3.5"] = False
        self.assertEqual(next(c for c in self.score()["criteria"] if c["id"] == "JR.3")["subtotal"], 2)

    def test_ratio_is_explicit_and_retains_excluded_inputs(self):
        for route in self.draft["selection_assessments"]:
            for criterion in selection.profile_for(self.draft["bundle"], route)["criteria"]:
                if criterion["method"] != "ratio": continue
                row = self.draft["selection_assessments"][route]["criteria"][criterion["id"]]
                row["calculation_included"] = True
                self.assertIsNone(self.score(route)["total"])
                row["inputs"].update(grant=0, quality_jobs=1)
                self.assertGreater(self.score(route)["total"], 0)
                row["calculation_included"] = False
                self.assertEqual(self.score(route)["total"], 0)
                self.assertEqual(row["inputs"], {"grant": 0, "quality_jobs": 1})

    def test_frozen_editions_and_reviewed_upgrade_preserve_raw_answers(self):
        for edition in [1, 2]:
            d = deepcopy(self.draft)
            d["bundle"] = historic_bundle(d["bundle"], edition)
            d["selection_assessments"] = selection.empty(d["bundle"])
            row = d["selection_assessments"][R34]["criteria"]["JR.3"]
            row["answers"].update({"JR.3.4": True, "JR.3.5": True})
            row.update(notes="Retain these notes", reference="Retain this source")
            before = deepcopy(d)
            from backend.funding_selection_v2 import calculate as frozen
            expected = frozen(d["bundle"], d["selection_assessments"], R34)
            self.assertEqual(selection.calculate(d["bundle"], d["selection_assessments"], R34), expected)
            upgraded = funding.prepare(d, self.project, adopt_current_catalogue=True)["draft"]
            self.assertEqual(d, before)
            self.assertEqual(upgraded["selection_assessments"][R34], d["selection_assessments"][R34])
            score = selection.calculate(upgraded["bundle"], upgraded["selection_assessments"], R34)
            self.assertEqual(score["subtotal"], expected["subtotal"])
            self.assertEqual(score["unresolved"], 0)

    def test_overview_exists_without_concept_shortlist_or_completed_application(self):
        self.draft["selection_assessments"][R34]["criteria"]["JR.3"]["answers"].update({"JR.3.4": True, "JR.3.5": True})
        before = deepcopy(self.draft)
        result = funding_overview.describe(self.draft, self.project, R34)
        self.assertEqual(sum(len(c["items"]) for c in result["criteria"]), 45)
        self.assertEqual(result["score"]["subtotal"], 4)
        self.assertIn("JR.3.4", result["markdown"])
        self.assertIn("4", result["markdown"])
        self.assertIsNone(result["concept"])
        self.assertEqual(self.draft, before)


class VersionAPITests(unittest.TestCase):
    setUp = fixtures.ConceptAPITests.setUp
    post = fixtures.ConceptAPITests.post
    context = fixtures.ConceptAPITests.context
    save = fixtures.ConceptAPITests.save
    transfer = fixtures.ConceptAPITests.transfer
    preview = fixtures.ConceptAPITests.preview

    def body(self, operation, **kwargs):
        state = self.client.get("/api/project").json()
        return dict(revision=state["revision"], funding_revision=state["funding_revision"], planning_revision=state["planning"]["planning_revision"], design_revision=state["designer_revision"], request_id=str(uuid4()), operation=operation, **kwargs)

    def upgrade(self):
        self.draft["navigator_focus"] = dict(version=1, programme_id="LEADER-AL20", route_id=R34)
        self.save()
        before = self.path.read_bytes()
        self.review = self.post("funding/workspace-preview", dict(revision=self.state["revision"], draft=self.draft, version_id=str(uuid4())))
        self.assertEqual(self.path.read_bytes(), before)
        self.upgrade_body = self.body("upgrade_workspace", draft=self.draft, record_id=self.review["version_id"], preview_hash=self.review["preview_hash"])
        self.workspace = self.post("funding/save", self.upgrade_body)
        self.draft = self.workspace["attachment"]["draft"]
        return self.workspace

    def test_version_identity_autosave_duplicate_activate_and_export_import(self):
        w = self.upgrade();vid = w["attachment"]["active_version_id"]
        self.draft["notes"] = "Autosave to this named version"
        w = self.post("funding/save", self.body("draft", draft=self.draft, record_id=vid))
        self.assertEqual(w["attachment"]["scenarios"][0]["draft"], self.draft)
        duplicate_body = self.body("duplicate", record_id=vid)
        duplicate = self.post("funding/save", duplicate_body)
        other_id = duplicate["attachment"]["active_version_id"]
        self.assertEqual(other_id, duplicate_body["request_id"])
        self.assertEqual(self.post("funding/save", duplicate_body)["attachment"], duplicate["attachment"])
        self.assertNotEqual(other_id, vid)
        self.assertNotEqual(duplicate["attachment"]["draft"]["project_concepts"][R34]["id"], self.concept["id"])
        duplicate_draft = duplicate["attachment"]["draft"];duplicate_draft["notes"] = "Independent copy"
        self.post("funding/save", self.body("draft", draft=duplicate_draft, record_id=other_id))
        original = self.post("funding/save", self.body("activate", record_id=vid))
        self.assertEqual(original["attachment"]["draft"]["notes"], self.draft["notes"])
        exported = self.client.get("/api/export").json()
        from backend.storage import Store
        path = self.path.with_name("imported.json")
        store = Store(path)
        store.mutate("import", 0, str(uuid4()), dict(save=exported, confirm_replace=False))
        self.assertEqual(store.snapshot()["funding"], original["attachment"])

    def test_atomic_retries_stale_revisions_bad_hash_and_incompatible_versions(self):
        self.upgrade()
        self.assertEqual(self.post("funding/save", self.upgrade_body)["attachment"], self.workspace["attachment"])
        body = self.body("draft", draft={**self.draft, "notes": "Keep my draft"}, record_id=self.workspace["attachment"]["active_version_id"])
        before = self.path.read_bytes()
        with patch.object(self.client.app.state.store, "write", side_effect=OSError("test disk unavailable")):
            self.post("funding/save", body, 503)
        self.assertEqual(self.path.read_bytes(), before)
        self.post("funding/save", body)
        self.post("funding/save", {**body, "request_id": str(uuid4())}, 409)
        before = self.path.read_bytes()
        broken = deepcopy(self.draft);broken["bundle"]["selection"]["version"] = 99
        self.post("funding/save", self.body("draft", draft=broken), 422)
        self.assertEqual(self.path.read_bytes(), before)

    def test_transfer_updates_the_active_named_version_in_the_same_write(self):
        self.upgrade()
        self.transfer()
        w = self.client.get("/api/funding").json()["attachment"]
        self.assertEqual(w["draft"], next(r["draft"] for r in w["scenarios"] if r["id"] == w["active_version_id"]))
        self.assertEqual(self.client.get("/api/project").json()["planning"]["draft"]["project_concepts"][0]["concept"]["id"], self.concept["id"])

    def test_workspace_comparison_hash_and_active_record_cannot_be_guessed(self):
        before = self.path.read_bytes()
        review = self.post("funding/workspace-preview", dict(revision=self.state["revision"], draft=self.draft, version_id=str(uuid4())))
        self.post("funding/save", self.body("upgrade_workspace", draft=self.draft, record_id=review["version_id"], preview_hash="0" * 64), 422)
        self.assertEqual(self.path.read_bytes(), before)
        self.upgrade()
        exported = self.client.get("/api/export").json()
        exported["funding"]["active_version_id"] = str(uuid4())
        before = self.path.read_bytes()
        self.post("import", dict(revision=self.state["revision"], request_id=str(uuid4()), save=exported, confirm_replace=True), 422)
        self.assertEqual(self.path.read_bytes(), before)
