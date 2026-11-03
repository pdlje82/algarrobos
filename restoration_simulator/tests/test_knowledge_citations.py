"""Shared evidence must expose drift without rewriting libraries or saved projects."""

from contextlib import redirect_stdout, redirect_stderr
from copy import deepcopy
import io
import json
from pathlib import Path
import subprocess
import sys
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch
from uuid import uuid4

from fastapi import HTTPException
from fastapi.testclient import TestClient

from backend import documents, funding, funding_selection_guidance as guidance
from backend import project_concepts as concepts, delivery_plans as delivery
from backend import knowledge_citations as shared
from backend.app import create_app
from backend.configuration import read_json
from backend.engine import Invalid
from backend.storage import Store, validate_export
import test_project_concepts as concept_tests


HASHES = {
    "selection_guidance": "4a55f602ea8279264afcb8c3135908e4b96ffe2d3b9017559dcec95ae660c03d",
    "project_concept": "19d260ade0296e99dc2ffc678ae93f49b513f45d959253bd20baddcd4fc7d542",
    "delivery_plan": "bbfd549874c6f0152c7a5b13ae5edef5e43a416785ea3afd72ea44b43faa6ca2",
}
LOADERS = {
    "selection_guidance": lambda: guidance.describe()["library"],
    "project_concept": concepts.guide,
    "delivery_plan": delivery.library,
}


class SharedCitationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.original = shared.load_registry()
        # Preserve the original milestone-2 feature contracts as the registry grows.
        cls.libraries = {cid: read_json(shared.CONSUMER_PATHS[cid]) for cid in LOADERS}

    def setUp(self):
        self.registry = deepcopy(self.original)
        self.edition = next(iter(self.registry["editions"]))
        self.passage = next(iter(self.registry["passages"]))
        self.citation = "FUND-008-p120-route-requirements"

    def cli(self, args):
        out, err = io.StringIO(), io.StringIO()
        with redirect_stdout(out), redirect_stderr(err):
            status = shared.main(args)
        return status, out.getvalue(), err.getvalue()

    def test_exact_pilot_memberships_and_unchanged_library_hashes(self):
        sha = "48c3cc653a5f38bae9480009873bfdb35f26133f513e8d2894d872216ccf6399"
        edition = "FUND-008@" + sha
        self.assertEqual(self.registry["editions"][edition], {"document_id": "FUND-008", "sha256": sha})
        for page in range(120, 125):
            pid = edition + f":pdf:{page}"
            self.assertEqual(self.registry["passages"][pid], {"edition_id": edition, "page_basis": "pdf", "page": page})
            self.assertEqual(self.registry["citations"][f"FUND-008-p{page}-route-requirements"],
                             {"passage_id": pid, "role": "route requirements", "verified_on": "2026-11-01"})
        for cid, loader in LOADERS.items():
            pages = [120, 121, 123, 124] if cid == "delivery_plan" else list(range(120, 125))
            ids = [f"FUND-008-p{page}-route-requirements" for page in pages]
            self.assertEqual(self.registry["consumers"][cid]["citation_ids"], ids)
            actual = loader()
            self.assertEqual(actual, self.libraries[cid])
            self.assertEqual(funding.digest(actual), HASHES[cid])

    def test_projection_preserves_distinct_labels_order_and_all_inputs(self):
        for cid, library in self.libraries.items():
            ids = self.registry["consumers"][cid]["citation_ids"]
            labels = {key: library["sources"][key]["label"] for key in ids}
            before = deepcopy((self.registry, library, labels))
            projected = shared.project_sources(cid, labels)
            self.assertEqual(list(projected), ids)
            self.assertEqual(projected, {key: library["sources"][key] for key in ids})
            shared.validate_consumer_sources(cid, library["sources"])
            self.assertEqual((self.registry, library, labels), before)
            projected[ids[0]]["role"] = "Changed output only"
            self.assertEqual((self.registry, library, labels), before)
        self.assertIn("\u00c2\u00b7", self.libraries["project_concept"]["sources"][self.citation]["label"])
        self.assertNotIn("\u00c2", self.libraries["selection_guidance"]["sources"][self.citation]["label"])

    def test_closed_shapes_versions_and_bad_record_types_fail_actionably(self):
        mutations = [lambda r: r.pop("version"), lambda r: r.update(version=True),
                     lambda r: r.update(version="1"), lambda r: r.update(version=2),
                     lambda r: r.update(extra=1), lambda r: r.update({1: "non-JSON key"}),
                     lambda r: r["consumers"].pop("delivery_plan"),
                     lambda r: r["consumers"].update(unknown={"citation_ids": [self.citation]})]
        for name in ("editions", "passages", "citations", "consumers"):
            ident = next(iter(self.registry[name]))
            field = next(iter(self.registry[name][ident]))
            mutations.extend([
                lambda r, n=name: r.update({n: {}}),
                lambda r, n=name: r.update({n: []}),
                lambda r, n=name, k=ident: r[n].update({k: None}),
                lambda r, n=name, k=ident: r[n][k].update(extra=True),
                lambda r, n=name, k=ident, f=field: r[n][k].pop(f),
            ])
        for mutate in mutations:
            with self.subTest(mutation=mutations.index(mutate)):
                value = deepcopy(self.registry)
                mutate(value)
                with self.assertRaises(Invalid) as caught:
                    shared.validate_registry(value)
                self.assertIn("citations-v1.json", str(caught.exception))
        for value in (None, [], 1, "registry"):
            with self.assertRaises(Invalid): shared.validate_registry(value)

    def test_passage_identity_bounds_and_dangling_references_are_rejected(self):
        for page in (0, -1, 99999, True, 120.0, "120", None):
            value = deepcopy(self.registry)
            value["passages"][self.passage]["page"] = page
            with self.subTest(page=page), self.assertRaises(Invalid): shared.validate_registry(value)
        mutations = [
            lambda r: r["passages"][self.passage].update(edition_id="missing"),
            lambda r: r["passages"][self.passage].update(page_basis="printed"),
            lambda r: r["passages"].update(wrong=r["passages"].pop(self.passage)),
            lambda r: r["citations"][self.citation].update(passage_id="missing"),
            lambda r: r["consumers"]["delivery_plan"].update(citation_ids=["missing"]),
            lambda r: r["consumers"]["delivery_plan"].update(citation_ids=[self.citation, self.citation]),
            lambda r: r["consumers"]["delivery_plan"]["citation_ids"].reverse(),
            lambda r: r["consumers"]["delivery_plan"].update(citation_ids=[None]),
        ]
        for mutate in mutations:
            value = deepcopy(self.registry); mutate(value)
            with self.assertRaises(Invalid): shared.validate_registry(value)

    def test_document_identity_and_registered_edition_must_match(self):
        for document_id, sha in [("UNKNOWN-999", self.registry["editions"][self.edition]["sha256"]),
                                 ("FUND-008", "0" * 64), ("FUND-008", "UPPER"), ("FUND-008", None)]:
            value = deepcopy(self.registry)
            value["editions"] = {f"{document_id}@{sha}": {"document_id": document_id, "sha256": sha}}
            with self.assertRaises(Invalid): shared.validate_registry(value)
        value = deepcopy(self.registry)
        value["editions"]["wrong-identity"] = value["editions"].pop(self.edition)
        with self.assertRaisesRegex(Invalid, "Edition identity"): shared.validate_registry(value)

    def test_review_dates_are_explicit_real_iso_dates_and_roles_are_required(self):
        for reviewed in (None, True, "", "2026-02-30", "20261101", "2026-11-01T00:00:00", 20261101):
            value = deepcopy(self.registry); value["citations"][self.citation]["verified_on"] = reviewed
            with self.subTest(reviewed=reviewed), self.assertRaises(Invalid): shared.validate_registry(value)
        for role in (None, "", "   ", []):
            value = deepcopy(self.registry); value["citations"][self.citation]["role"] = role
            with self.assertRaises(Invalid): shared.validate_registry(value)

    def test_unreferenced_records_fail_but_distinct_passage_uses_are_supported(self):
        value = deepcopy(self.registry)
        document = documents.record("FOREST-004")
        value["editions"][document["id"] + "@" + document["sha256"]] = {"document_id": document["id"], "sha256": document["sha256"]}
        with self.assertRaisesRegex(Invalid, "Unreferenced editions"): shared.validate_registry(value)
        value = deepcopy(self.registry)
        value["passages"][self.edition + ":pdf:125"] = {"edition_id": self.edition, "page_basis": "pdf", "page": 125}
        with self.assertRaisesRegex(Invalid, "Unreferenced passages"): shared.validate_registry(value)
        value = deepcopy(self.registry)
        value["citations"]["different-use"] = {"passage_id": self.passage, "role": "Different evidence role", "verified_on": "2026-10-31"}
        with self.assertRaisesRegex(Invalid, "Unreferenced citations"): shared.validate_registry(value)
        value["consumers"]["selection_guidance"]["citation_ids"].insert(0, "different-use")
        self.assertIs(shared.validate_registry(value), value)

    def test_missing_corrupt_duplicate_and_failed_reads_never_use_previous_data(self):
        with TemporaryDirectory() as folder:
            path = Path(folder) / "citations.json"
            with patch.object(shared, "REGISTRY_PATH", path):
                for raw in (None, "{broken", '{"version":1,"version":1}',
                            json.dumps(self.registry).replace('"page": 120', '"page": 120, "page": 120', 1)):
                    if raw is not None: path.write_text(raw, encoding="utf-8")
                    with self.assertRaises(Invalid) as caught: shared.load_registry()
                    self.assertIn(str(path), str(caught.exception))
                path.write_text(json.dumps(self.registry), encoding="utf-8")
                self.assertEqual(shared.load_registry(), self.registry)
                with patch.object(Path, "read_text", side_effect=PermissionError("fixture denied")):
                    with self.assertRaisesRegex(Invalid, "fixture denied"): shared.load_registry()
                path.unlink()
                with self.assertRaises(Invalid): shared.load_registry()

    def test_document_catalogue_errors_keep_their_explicit_status(self):
        with patch.object(documents, "catalogue", side_effect=HTTPException(500, "fixture catalogue missing")):
            with self.assertRaises(HTTPException) as caught: shared.load_registry()
            self.assertEqual(caught.exception.status_code, 500)
            status, out, err = self.cli(["--check"])
            self.assertEqual((status, out), (1, "")); self.assertIn("fixture catalogue missing", err)

    def test_each_mirror_field_and_missing_membership_are_checked_without_repair(self):
        alternatives = {"document_id": "FUND-009", "page": 121, "sha256": "0" * 64,
                        "role": "Different role", "verified_on": "2026-10-31"}
        for cid, library in self.libraries.items():
            for field, alternative in alternatives.items():
                sources = deepcopy(library["sources"]); sources[self.citation][field] = alternative
                before = deepcopy(sources)
                with self.subTest(consumer=cid, field=field), self.assertRaisesRegex(Invalid, field):
                    shared.validate_consumer_sources(cid, sources)
                self.assertEqual(sources, before)
            for change in (lambda s: s.pop(self.citation), lambda s: s[self.citation].pop("label"),
                           lambda s: s[self.citation].update(label=""), lambda s: s[self.citation].update(extra=1)):
                sources = deepcopy(library["sources"]); change(sources)
                with self.assertRaises(Invalid): shared.validate_consumer_sources(cid, sources)
        registry = deepcopy(self.registry)
        registry["consumers"]["delivery_plan"]["citation_ids"].remove(self.citation)
        shared.validate_registry(registry)
        with patch.object(shared, "load_registry", return_value=registry):
            with self.assertRaisesRegex(Invalid, "membership differs"):
                shared.validate_consumer_sources("delivery_plan", self.libraries["delivery_plan"]["sources"])

    def test_projection_requires_exact_labels_and_supported_consumers(self):
        labels = {cid: "Label" for cid in self.registry["consumers"]["selection_guidance"]["citation_ids"]}
        for bad in (None, [], {}, {**labels, "unknown": "Extra"}, {**labels, self.citation: None}, {**labels, 1: "bad key"}):
            with self.assertRaises(Invalid): shared.project_sources("selection_guidance", bad)
        for cid in (None, [], "unknown"):
            with self.assertRaises(Invalid): shared.project_sources(cid, labels)

    def test_all_live_consumers_require_registry_and_reject_drift(self):
        for cid, loader in LOADERS.items():
            with self.subTest(consumer=cid), patch.object(shared, "REGISTRY_PATH", Path("missing-citations.json")):
                with self.assertRaisesRegex(Invalid, "missing-citations"): loader()
            self.assertEqual(loader(), self.libraries[cid])
        for cid, module, attribute in [("selection_guidance", guidance, "LIBRARY"),
                                       ("project_concept", concepts, "GUIDE"),
                                       ("delivery_plan", delivery, "LIBRARY")]:
            with TemporaryDirectory() as folder:
                value = deepcopy(self.libraries[cid]); value["sources"][self.citation]["role"] = "Drift"
                path = Path(folder) / "drift.json"; path.write_text(json.dumps(value), encoding="utf-8")
                with patch.object(module, attribute, path):
                    with self.assertRaisesRegex(Invalid, "Mirror differs"): LOADERS[cid]()

    def test_read_only_endpoints_fail_and_retry_without_creating_a_save(self):
        endpoints = {"selection_guidance": "selection-guidance", "project_concept": "project-concept-guide", "delivery_plan": "delivery-plan-guide"}
        with TemporaryDirectory() as folder:
            save = Path(folder) / "untouched.json"
            with patch.dict("os.environ", {"RESTORATION_SAVE_PATH": str(save)}): app = create_app()
            with TestClient(app) as client:
                for cid, endpoint in endpoints.items():
                    url = "/api/funding/" + endpoint
                    before = client.get(url); self.assertEqual(before.status_code, 200)
                    with patch.object(shared, "REGISTRY_PATH", Path(folder) / "missing.json"):
                        failed = client.get(url)
                        self.assertEqual(failed.status_code, 422); self.assertIn("missing.json", failed.text)
                        self.assertIsNone(app.state.store); self.assertFalse(save.exists())
                    retry = client.get(url); self.assertEqual(retry.status_code, 200)
                    self.assertEqual(retry.json(), before.json())
                    self.assertEqual(retry.json()["library"], self.libraries[cid])
                self.assertIsNone(app.state.store); self.assertFalse(save.exists())

    def test_cli_check_verifies_each_edition_once_and_all_projections_match(self):
        with patch.object(documents, "verified_file", wraps=documents.verified_file) as verify:
            status, out, err = self.cli(["--check"])
            self.assertEqual((status, err), (0, ""))
            mirrors = sum(len(c["citation_ids"]) for c in self.registry["consumers"].values())
            self.assertIn(f"{mirrors} mirrors", out)
            self.assertEqual(verify.call_count, len(self.registry["editions"]))
            self.assertEqual([(call.args[0], call.kwargs["expected_sha256"]) for call in verify.call_args_list],
                             [(e["document_id"], e["sha256"]) for e in self.registry["editions"].values()])
        for cid, library in self.libraries.items():
            status, out, err = self.cli(["--project", cid])
            self.assertEqual((status, err), (0, ""))
            self.assertEqual(json.loads(out), {key: library["sources"][key] for key in self.registry["consumers"][cid]["citation_ids"]})

    def test_cli_preview_handles_metadata_drift_but_check_fails_and_neither_writes(self):
        for cid in self.libraries:
            with TemporaryDirectory() as folder:
                value = deepcopy(self.libraries[cid]); value["sources"][self.citation]["page"] = 99999
                path = Path(folder) / "drift.json"; path.write_text(json.dumps(value), encoding="utf-8")
                before = path.read_bytes()
                with patch.dict(shared.CONSUMER_PATHS, {cid: path}):
                    status, out, err = self.cli(["--check"])
                    self.assertEqual((status, out), (1, "")); self.assertIn(str(path), err)
                    status, out, err = self.cli(["--project", cid])
                    self.assertEqual((status, err), (0, ""))
                    self.assertEqual(json.loads(out)[self.citation]["page"], 120)
                    self.assertEqual(path.read_bytes(), before)
                    value["sources"][self.citation].pop("label")
                    path.write_text(json.dumps(value), encoding="utf-8"); before = path.read_bytes()
                    status, out, err = self.cli(["--project", cid])
                    self.assertEqual((status, out), (1, "")); self.assertIn("label", err)
                    self.assertEqual(path.read_bytes(), before)

    def test_cli_missing_changed_pdf_and_registry_fail_without_success_output(self):
        with TemporaryDirectory() as folder, patch.object(documents, "LIBRARY", Path(folder)):
            status, out, err = self.cli(["--check"])
            self.assertEqual((status, out), (1, "")); self.assertIn("unavailable", err)
            path = Path(folder) / documents.record("FUND-008")["filename"]
            path.write_bytes(b"%PDF- changed fixture")
            status, out, err = self.cli(["--check"])
            self.assertEqual((status, out), (1, "")); self.assertIn("changed", err)
        with patch.object(shared, "REGISTRY_PATH", Path("missing.json")):
            for args in (["--check"], ["--project", "project_concept"]):
                status, out, err = self.cli(args)
                self.assertEqual((status, out), (1, "")); self.assertIn("missing.json", err)

    def test_cli_usage_and_real_utf8_module_entrypoint(self):
        for args in ([], ["--project", "unknown"], ["--check", "--project", "delivery_plan"]):
            with redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()), self.assertRaises(SystemExit) as caught:
                shared.main(args)
            self.assertEqual(caught.exception.code, 2)
        result = subprocess.run([sys.executable, "-m", "backend.knowledge_citations", "--project", "project_concept"], cwd=shared.DIRECTORY, capture_output=True, check=False)
        self.assertEqual(result.returncode, 0, result.stderr)
        projected = json.loads(result.stdout.decode("utf-8"))
        self.assertEqual(projected[self.citation], self.libraries["project_concept"]["sources"][self.citation])


class SharedCitationMutationTests(unittest.TestCase):
    # Reuse the established isolated fixture without inheriting/rerunning its tests.
    setUp = concept_tests.ConceptAPITests.setUp
    post = concept_tests.ConceptAPITests.post
    context = concept_tests.ConceptAPITests.context
    save = concept_tests.ConceptAPITests.save
    preview = concept_tests.ConceptAPITests.preview
    transfer = concept_tests.ConceptAPITests.transfer

    def test_failed_registry_read_preserves_save_and_local_draft_then_retry_succeeds(self):
        self.concept["notes"] = "Unsaved local explanation"
        local = deepcopy(self.draft)
        context = self.context(); context.pop("concept_id")
        body = dict(**context, design_revision=self.state["designer_revision"], request_id=str(uuid4()), operation="draft", draft=self.draft, record_id=None)
        before = self.path.read_bytes(); state = self.client.app.state.store.snapshot()
        with patch.object(shared, "REGISTRY_PATH", Path(self.folder.name) / "missing.json"):
            failed = self.client.post("/api/funding/save", json=body)
            self.assertEqual(failed.status_code, 422, failed.text)
            self.assertIn("missing.json", failed.text)
            self.assertEqual(self.path.read_bytes(), before)
            self.assertEqual(self.client.app.state.store.snapshot(), state)
            self.assertEqual(self.draft, local)
        self.post("funding/save", body)
        self.assertEqual(self.client.get("/api/funding").json()["attachment"]["draft"]["project_concepts"][concept_tests.R34]["notes"], "Unsaved local explanation")

    def test_old_hashes_report_transfer_failure_and_import_export_remain_compatible(self):
        self.concept["delivery_plan"] = delivery.new(self.concept)
        self.save()
        self.assertEqual(self.concept["guide_hash"], HASHES["project_concept"])
        self.assertEqual(self.concept["delivery_plan"]["library_hash"], HASHES["delivery_plan"])
        report = concepts.report(self.concept, concepts.source_context(self.draft, concept_tests.R34), self.state["project"])
        preview = self.preview()
        body = dict(**self.context(), request_id=str(uuid4()), preview_hash=preview["preview_hash"], resolutions={})
        before = self.path.read_bytes(); state = self.client.app.state.store.snapshot()
        with patch.object(shared, "REGISTRY_PATH", Path(self.folder.name) / "missing.json"):
            failed = self.client.post("/api/funding/project-concept/transfer", json=body)
            self.assertEqual(failed.status_code, 422, failed.text)
            self.assertEqual(self.path.read_bytes(), before)
            self.assertEqual(self.client.app.state.store.snapshot(), state)
        self.post("funding/project-concept/transfer", body)
        self.assertEqual(report, concepts.report(self.concept, concepts.source_context(self.draft, concept_tests.R34), self.state["project"]))
        exported = self.client.get("/api/export").json()
        checked = validate_export(exported)
        self.assertEqual(checked["planning"]["project_concepts"][0]["concept"], self.concept)
        clone = Store(Path(self.folder.name) / "clone.json")
        clone.mutate("import", 0, str(uuid4()), dict(save=exported, confirm_replace=False))
        self.assertEqual(clone.snapshot()["funding"]["draft"]["project_concepts"][concept_tests.R34], self.concept)
