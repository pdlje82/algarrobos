from copy import deepcopy
import unittest
from unittest.mock import patch

from backend import engine, funding, funding_programmes


class FundingFocusTests(unittest.TestCase):
    def setUp(self):
        self.project = engine.new_project("Navigator focus fixture")
        self.draft = funding.new_draft(self.project, None, [], "activity")

    def focus(self, route="LEADER-AL20-3.4"):
        return {"version": 1, "programme_id": "LEADER-AL20", "route_id": route}

    def test_absence_is_unselected_and_focus_never_changes_scores_or_claims(self):
        before = deepcopy(self.draft)
        original = funding.evaluate(self.draft, self.project)
        self.assertNotIn("navigator_focus", self.draft)
        self.draft["navigator_focus"] = self.focus()
        result = funding.evaluate(self.draft, self.project)
        self.assertEqual(result["results"], original["results"])
        self.assertEqual(self.draft["selected"], [])
        self.assertEqual(self.draft["selection_assessments"], before["selection_assessments"])
        self.assertNotIn("navigator_focus", before)

    def test_saved_alternatives_and_prepared_updates_retain_their_own_focus(self):
        self.draft["navigator_focus"] = self.focus()
        attachment = funding.operate(None, self.project, None, "save", self.draft, None)
        other = deepcopy(self.draft)
        other["navigator_focus"] = self.focus("LEADER-AL20-3.5")
        attachment = funding.operate(attachment, self.project, None, "save", other, None)
        restored = funding.workspace(self.project, attachment, 2)["attachment"]
        self.assertEqual(restored["draft"]["navigator_focus"], other["navigator_focus"])
        self.assertEqual([r["draft"]["navigator_focus"] for r in restored["scenarios"]], [self.focus(), self.focus("LEADER-AL20-3.5")])
        prepared = funding.prepare(self.draft, self.project, adopt_current_catalogue=True)
        self.assertEqual(prepared["draft"]["navigator_focus"], self.focus())
        for focus in [self.focus(None), {"version": 1, "programme_id": None, "route_id": None}]:
            self.draft["navigator_focus"] = focus
            funding.validate_draft(self.draft, self.project)

    def test_invalid_missing_incompatible_and_unsupported_focus_fails(self):
        for focus in [None, {}, {**self.focus(), "version": 2}, {**self.focus(), "version": True},
                      {**self.focus(), "route_id": "missing"}, {**self.focus(), "programme_id": None},
                      {**self.focus(), "programme_id": "EU-LIFE"}, {**self.focus(), "programme_id": "missing"},
                      {**self.focus(), "unexpected": True}]:
            with self.subTest(focus=focus):
                self.draft["navigator_focus"] = focus
                with self.assertRaises(engine.Invalid):
                    funding.validate_draft(self.draft, self.project)
        self.draft["navigator_focus"] = self.focus()
        with patch.object(funding_programmes, "LIBRARY", funding_programmes.LIBRARY.with_name("missing-focus-library.json")):
            with self.assertRaisesRegex(engine.Invalid, "Cannot load required"):
                funding.validate_draft(self.draft, self.project)
