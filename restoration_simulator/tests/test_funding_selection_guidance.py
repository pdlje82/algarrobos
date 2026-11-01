"""Complete route-filtered advice, explicit failures, and no assessment mutations."""
from copy import deepcopy
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from backend import documents, funding, funding_selection_guidance as guidance
from backend.app import create_app
from backend.engine import Invalid
from test_designer_library import site


class SelectionGuidanceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.catalogue = funding.catalogue()
        cls.library = guidance.describe()["library"]

    def test_every_subcriterion_has_official_advice_staged_evidence_and_sources(self):
        data = self.library
        self.assertEqual(len(data["nodes"]), 45)
        self.assertEqual(len(self.catalogue["selection"]["profiles"]["line3"]["criteria"]), 14)
        for ident, node in data["nodes"].items():
            with self.subTest(node=ident):
                for field in guidance.BLOCKS:
                    self.assertTrue(node[field]["text"].strip())
                    if field in {"official", "restoration"}:
                        self.assertGreaterEqual(len(node[field]["text"].split()), 15)
                    self.assertTrue(node[field]["sources"])
                for route in guidance.ROUTES:
                    self.assertTrue(any(route in data["recommendations"][r]["routes"] for r in node["recommendations"]))
        for ident in data["publications"]:
            record, _ = documents.verified_file(ident)
            self.assertEqual(record["sha256"], data["publications"][ident]["sha256"])

    def test_shared_advice_is_stored_once_and_different_route_advice_is_explicit(self):
        data = self.library
        self.assertEqual(set(data["recommendations"]["PT.1.1-restoration"]["routes"]), guidance.ROUTES)
        for route, expected, excluded in [("3.4", "demonstration-design", "heritage-recovery-design"), ("3.5", "heritage-recovery-design", "demonstration-design")]:
            ids = [r for r in data["nodes"]["PT.1.1"]["recommendations"] if "LEADER-AL20-" + route in data["recommendations"][r]["routes"]]
            self.assertIn(expected, ids)
            self.assertNotIn(excluded, ids)
        self.assertIn("does not designate", data["nodes"]["IN.1.1"]["official"]["text"])
        self.assertIn("beyond", data["nodes"]["DRI.3.1"]["official"]["text"])
        self.assertIn("never", data["nodes"]["PS.3.1"]["official"]["text"])
        self.assertIn("No separate payment-stage", data["nodes"]["IN.1.2"]["payment"]["text"])
        self.assertNotIn("points", data["nodes"]["PT.1.1"])

    def test_bad_coverage_routes_text_sources_and_versions_are_rejected(self):
        first_source = next(iter(self.library["sources"]))
        def remove_node(d): del d["nodes"]["PT.1.1"]
        for mutate in [remove_node, lambda d:d.update(version=True),
                       lambda d:d["nodes"].update(UNKNOWN=deepcopy(d["nodes"]["PT.1.1"])),
                       lambda d:d.update(checked_on="2026-02-30"),
                       lambda d:d.update(routes=["LEADER-AL20-3.4"]),
                       lambda d:d["nodes"]["AT.3.1"]["official"].update(text=" "),
                       lambda d:d["nodes"]["AT.3.1"]["application"].update(sources=[]),
                       lambda d:d["nodes"]["AT.3.1"].update(recommendations=[]),
                       lambda d:d["recommendations"]["AT.3.1-restoration"].update(routes=["LEADER-AL20-3.4"]),
                       lambda d:d["recommendations"]["PT.1.1-restoration"].update(routes=["LEADER-AL20-2.6"]),
                       lambda d:d["nodes"]["PT.1.1"].update(unresolved=None),
                       lambda d:d["sources"][first_source].update(page=10000),
                       lambda d:d["sources"][first_source].update(page=True),
                       lambda d:d["sources"][first_source].update(label=""),
                       lambda d:d["sources"][first_source].update(sha256="0"*64),
                       lambda d:d["sources"][first_source].update(verified_on="2027-01-01"),
                       lambda d:d["publications"]["FUND-008"].update(download_url="javascript:alert(1)"),
                       lambda d:d["publications"]["FUND-010"].update(sha256="0"*64)]:
            with self.subTest(mutation=mutate), self.assertRaises(Invalid):
                data = deepcopy(self.library)
                mutate(data)
                guidance.validate(data, self.catalogue)

    def test_missing_malformed_and_duplicate_key_files_fail_actionably(self):
        with TemporaryDirectory() as directory:
            path = Path(directory) / "selection-guidance.json"
            with patch.object(guidance, "LIBRARY", path):
                with self.assertRaises(Invalid): guidance.describe()
                path.write_text('{"version":1,"version":1}', encoding="utf8")
                with self.assertRaises(Invalid): guidance.describe()

    def test_read_only_endpoint_does_not_initialise_or_replace_a_save(self):
        with TemporaryDirectory() as directory:
            path = Path(directory) / "untouched.json"
            with patch.dict("os.environ", {"RESTORATION_SAVE_PATH": str(path)}):
                app = create_app()
            with TestClient(app) as client:
                result = client.get("/api/funding/selection-guidance")
                self.assertEqual(result.status_code, 200)
                self.assertEqual(result.json()["library"], self.library)
                self.assertIsNone(app.state.store)
                self.assertFalse(path.exists())
                with patch.object(guidance, "LIBRARY", Path(directory) / "missing.json"):
                    failed = client.get("/api/funding/selection-guidance")
                    self.assertGreaterEqual(failed.status_code, 400)
                    self.assertIn("missing.json", failed.text)
                self.assertIsNone(app.state.store)
                self.assertFalse(path.exists())

    def test_reference_reads_preserve_current_and_historical_assessments(self):
        project = site()
        for name in ("funding-v1.json", "funding-v2.json", "funding.json"):
            bundle = json.loads((funding.CATALOGUE.parent / name).read_text(encoding="utf8"))
            with patch.object(funding, "catalogue", return_value=bundle):
                draft = funding.new_draft(project, None, [], "business")
                before = funding.evaluate(draft, project)
                saved = deepcopy(draft)
            guidance.describe()
            with patch.object(funding, "catalogue", return_value=bundle):
                self.assertEqual(funding.evaluate(draft, project), before)
                self.assertEqual(draft, saved)
