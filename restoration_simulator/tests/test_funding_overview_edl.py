"""Every selected supporting reference stays attached to its scoring subnode."""
from copy import deepcopy
from unittest import TestCase
from unittest.mock import patch

from backend import engine, funding, funding_edl, funding_overview


class OverviewEdlTests(TestCase):
    def setUp(self):
        self.project = engine.new_project("Overview references")
        self.draft = funding.new_draft(self.project, None, [], "activity")
        self.library = funding_edl.describe()

    def evidence(self, selections):
        return dict(version=1, library_id=self.library["library"]["id"],
                    library_hash=self.library["library_hash"], selections=selections)

    def test_every_route_and_subnode_preserves_all_reference_text_without_scoring(self):
        data = self.library["library"]
        definitions = {i["id"]: i for i in data["items"]}
        for route, assessment in self.draft["selection_assessments"].items():
            expected = {}
            for row in assessment["criteria"].values():
                selections = {id: sorted(funding_edl.allowed_ids(data, id))
                              for id in row["answers"] if id in data["bindings"]}
                if selections:
                    row["edl_evidence"] = self.evidence(selections)
                    expected.update(selections)
            before = deepcopy(self.draft)
            result = funding_overview.describe(self.draft, self.project, route)
            items = {i["id"]: i for c in result["criteria"] for i in c["items"]}
            for id, refs in expected.items():
                self.assertEqual([r["id"] for r in items[id]["edl"]], refs)
                self.assertFalse(items[id]["selected"])
                for ref in items[id]["edl"]:
                    source = definitions[ref["id"]]
                    self.assertEqual((ref["label"], ref["summary"], ref["page"]),
                                     (source["label"], source["summary"], source["page"]))
                    self.assertIn(source["summary"], result["markdown"])
            self.assertEqual(result["score"]["subtotal"], 0)
            self.assertEqual({r["id"] for r in result["edl"]},
                             {rid for refs in expected.values() for rid in refs})
            self.assertIn("Not selected for scoring", result["markdown"])
            self.assertEqual(self.draft, before)

    def test_repeated_needs_appear_under_each_item_in_markdown(self):
        route = "LEADER-AL20-3.4"
        row = self.draft["selection_assessments"][route]["criteria"]["CO.1"]
        row["answers"]["CO.1.3"] = True
        row["edl_evidence"] = self.evidence({"CO.1.1": ["NPL3"], "CO.1.3": ["NPL3", "NPL50"]})
        result = funding_overview.describe(self.draft, self.project, route)
        markdown = result["markdown"]
        for id in ["CO.1.1", "CO.1.3"]:
            section = markdown.split("- " + id + " · ", 1)[1].split("\n- CO.", 1)[0]
            self.assertIn("  - NPL3 · ", section)
        self.assertIn("  - NPL50 · ", markdown)
        self.assertEqual(len(result["edl"]), 2)

    def test_unavailable_library_or_invalid_reference_is_an_error_without_changes(self):
        route = "LEADER-AL20-3.4"
        row = self.draft["selection_assessments"][route]["criteria"]["CO.1"]
        row["edl_evidence"] = self.evidence({"CO.1.3": ["NPL3"]})
        before = deepcopy(self.draft)
        with patch.object(funding_edl, "library", side_effect=engine.Invalid("Strategy library unavailable")):
            with self.assertRaisesRegex(engine.Invalid, "Strategy library unavailable"):
                funding_overview.describe(self.draft, self.project, route)
        self.assertEqual(self.draft, before)
        row["edl_evidence"]["selections"]["CO.1.3"] = ["unknown-reference"]
        before = deepcopy(self.draft)
        with self.assertRaisesRegex(engine.Invalid, "unrelated EDL reference"):
            funding_overview.describe(self.draft, self.project, route)
        self.assertEqual(self.draft, before)
