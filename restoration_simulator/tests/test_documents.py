"""Library metadata/file requests never initialise or mutate project storage."""
from copy import deepcopy
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from backend import documents
from backend.app import create_app
from backend.engine import Invalid


class DocumentTests(unittest.TestCase):
    def test_catalogue_and_registered_editions_are_valid(self):
        c=documents.catalogue()
        self.assertEqual(len(c["documents"]),27)
        for d in c["documents"]:
            _,path=documents.verified_file(d["id"])
            self.assertTrue(path.is_file())
        book=documents.record("FOREST-002")
        for page in (75,92,95,100,125,128,134,135,137):self.assertEqual(book["printed_pages"][str(page)],page)
        self.assertEqual(documents.record("FOREST-004")["pages"],1)

    def test_endpoints_inline_download_range_and_no_store(self):
        app=create_app()
        with TestClient(app) as client:
            self.assertIsNone(app.state.store)
            data=client.get("/api/documents/FOREST-004").json()
            self.assertEqual(data["media_type"],"application/pdf")
            url=data["file_url"]+"?expected_sha256="+data["sha256"]
            result=client.get(url)
            self.assertEqual(result.status_code,200)
            self.assertTrue(result.content.startswith(b"%PDF-"))
            self.assertTrue(result.headers["content-disposition"].startswith("inline;"))
            self.assertTrue(client.get(url+"&download=true").headers["content-disposition"].startswith("attachment;"))
            part=client.get(url,headers={"Range":"bytes=0-31"})
            self.assertEqual(part.status_code,206)
            self.assertEqual(part.content,result.content[:32])
            self.assertEqual(client.get(url,headers={"Range":"bytes=999999999-"}).status_code,416)
            self.assertIsNone(app.state.store)

    def test_missing_changed_and_unregistered_documents_fail_explicitly(self):
        with TestClient(create_app()) as client:
            self.assertEqual(client.get("/api/documents/unknown").status_code,404)
            wrong=client.get("/api/documents/FOREST-004?expected_sha256="+"0"*64)
            self.assertEqual(wrong.status_code,409)
            self.assertIn("different document edition",wrong.json()["detail"])
            with TemporaryDirectory() as folder,patch.object(documents,"LIBRARY",Path(folder)):
                self.assertEqual(client.get("/api/documents/FOREST-004").status_code,404)
                (Path(folder)/documents.record("FOREST-004")["filename"]).write_bytes(b"%PDF- changed")
                self.assertEqual(client.get("/api/documents/FOREST-004/file").status_code,409)

    def test_configuration_rejects_unsafe_paths_duplicates_and_bad_mappings(self):
        for mutate in [lambda c:c.update(version=True),lambda c:c["documents"][0].update(filename="../outside.pdf"),lambda c:c["documents"][0].update(sha256="missing"),lambda c:c["documents"][0].update(printed_pages={"9":999}),lambda c:c["documents"].append(deepcopy(c["documents"][0])),lambda c:c["viewer"].pop("initial_page")]:
            c=deepcopy(documents.catalogue());mutate(c)
            with self.assertRaises(Invalid):documents.validate_catalogue(c)

    def test_existing_aliases_remain_files_and_do_not_create_a_project(self):
        app=create_app()
        with TestClient(app) as client:
            for alias in ("plant-supply","pilot-primer","vega-baseline","coast-tender"):
                r=client.get("/api/sources/"+alias)
                self.assertEqual(r.status_code,200)
                self.assertEqual(r.headers["content-type"],"application/pdf")
            self.assertEqual(client.get("/api/sources/land-poster").headers["content-type"],"image/png")
            self.assertIsNone(app.state.store)
