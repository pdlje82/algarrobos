"""Editorial references are complete, explicit on failure and isolated from saves."""
from copy import deepcopy
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from backend import documents, funding, funding_guides
from backend.app import create_app
from backend.engine import Invalid
from test_designer_library import site


class FundingGuideTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.catalogue = funding.catalogue()
        cls.library = funding_guides.describe()["library"]

    def test_all_research_only_options_have_readable_sourced_introductions(self):
        library = self.library
        self.assertEqual(set(library["guides"]), funding_guides.research_ids(self.catalogue))
        self.assertEqual(len(library["guides"]), 92)
        groups = {e["id"]: e["group"] for e in self.catalogue["entries"]}
        self.assertEqual({groups[i] for i in library["guides"]}, set(self.catalogue["groups"]))
        for ident, guide in library["guides"].items():
            words = " ".join(guide[k] for k in funding_guides.SECTIONS).split()
            self.assertTrue(200 <= len(words) <= 350, (ident, len(words)))
            self.assertTrue(guide["fit"].startswith("Illustrative"), ident)
            self.assertTrue(guide["unresolved"], ident)
        for ident in ("LEADER-AL20-3.4", "LEADER-AL20-3.5", "LEADER-AL20-2.7", "LEADER-AL20-2.6", "LEADER-AL20-1.11", "SELF-FUNDS", "PARTNER-FUNDS"):
            self.assertNotIn(ident, library["guides"])

    def test_bad_coverage_text_sources_dates_and_editions_are_rejected(self):
        def missing_guide(d): del d["guides"]["NATURE-01"]
        def extra_guide(d): d["guides"]["SELF-FUNDS"] = deepcopy(d["guides"]["NATURE-01"])
        for mutate in [missing_guide, extra_guide,
                       lambda d: d.update(version=True),
                       lambda d: d["guides"]["NATURE-01"].update(what=" "),
                       lambda d: d["guides"]["NATURE-01"].update(source_ids=["missing"]),
                       lambda d: d["guides"]["NATURE-01"].update(related=["missing"]),
                       lambda d: d["guides"]["NATURE-01"].update(checked_on="2026-02-30"),
                       lambda d: d["sources"]["carbon-guide"].update(page=10000),
                       lambda d: d["sources"]["carbon-guide"].update(page=True),
                       lambda d: d["sources"]["carbon-guide"].update(sha256="0" * 64),
                       lambda d: d["sources"]["carbon-guide"].update(document_id="MISSING-001"),
                       lambda d: d["sources"]["enisa"].update(url="javascript:alert(1)"),
                       lambda d: d["sources"]["enisa"].update(url=None),
                       lambda d: d["sources"]["enisa"].update(page=1)]:
            data = deepcopy(self.library)
            mutate(data)
            with self.subTest(mutation=mutate), self.assertRaises(Invalid):
                funding_guides.validate(data, self.catalogue)

    def test_missing_or_malformed_file_is_an_actionable_error(self):
        with TemporaryDirectory() as folder:
            path = Path(folder) / "guides.json"
            with patch.object(funding_guides, "LIBRARY", path):
                with self.assertRaises(Invalid): funding_guides.describe()
                path.write_text('{"version":1,"version":1}', encoding="utf8")
                with self.assertRaises(Invalid): funding_guides.describe()

    def test_endpoint_is_read_only_and_failure_does_not_initialise_a_save(self):
        with TemporaryDirectory() as folder:
            path = Path(folder) / "untouched-save.json"
            with patch.dict("os.environ", {"RESTORATION_SAVE_PATH": str(path)}):
                app = create_app()
            with TestClient(app) as client:
                result = client.get("/api/funding/guides")
                self.assertEqual(result.status_code, 200)
                self.assertEqual(result.json()["library"], self.library)
                self.assertIsNone(app.state.store)
                self.assertFalse(path.exists())
                with patch.object(funding_guides, "LIBRARY", Path(folder) / "missing.json"):
                    failed = client.get("/api/funding/guides")
                    self.assertGreaterEqual(failed.status_code, 400)
                    self.assertIn("missing.json", failed.text)
                self.assertIsNone(app.state.store)
                self.assertFalse(path.exists())

    def test_current_reference_reads_leave_current_and_historical_evaluations_identical(self):
        project = site()
        for name in ("funding-v1.json", "funding-v2.json", "funding.json"):
            bundle = json.loads((funding.CATALOGUE.parent / name).read_text(encoding="utf8"))
            with patch.object(funding, "catalogue", return_value=bundle):
                draft = funding.new_draft(project, None, [], "business")
                before = funding.evaluate(draft, project)
            funding_guides.describe()
            with patch.object(funding, "catalogue", return_value=bundle):
                self.assertEqual(funding.evaluate(draft, project), before)

    def test_every_new_pdf_is_verified_and_its_download_endpoint_serves_original_bytes(self):
        with TestClient(create_app()) as client:
            for n in range(14, 21):
                ident = f"FUND-{n:03}"
                record, path = documents.verified_file(ident)
                response = client.get(f"/api/documents/{ident}/file?expected_sha256={record['sha256']}&download=true")
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.content, path.read_bytes())
                self.assertTrue(response.headers["content-disposition"].startswith("attachment;"))
                self.assertTrue(record["aliases"])
