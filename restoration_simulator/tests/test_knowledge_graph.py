"""The connected pilot explains evidence and bounded review paths without app effects."""

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

from fastapi import HTTPException

from backend import knowledge_graph as graph, knowledge_citations as citations
from backend import designer, documents
from backend.configuration import read_json
from backend.engine import Invalid


CAROB = "species:carob"
MR2 = "approach:mr2"
STOCK_NARRATIVE = "claim:mr2-stock-narrative"
STOCK_TABLE = "claim:mr2-stock-table"
DENSITY = "claim:designer-carob-density-assumption"


class KnowledgeGraphTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.original = read_json(graph.LIBRARY_PATH)

    def setUp(self):
        self.data = deepcopy(self.original)

    def cli(self, args):
        out, err = io.StringIO(), io.StringIO()
        with redirect_stdout(out), redirect_stderr(err): status = graph.main(args)
        return status, out.getvalue(), err.getvalue()

    def assert_header(self, result, version=1):
        self.assertEqual(result["version"], version)
        self.assertEqual(result["dataset_id"], "algarroba-connected-pilot-v1")
        self.assertEqual(len(result["dataset_hash"]), 64)
        self.assertEqual(result["coverage"]["mode"], "registered-pilot-only")
        self.assertTrue(result["coverage"]["excluded"])

    def test_seed_and_shared_references_are_complete_and_not_retyped(self):
        ctx = graph.load_library(); self.assertEqual(ctx["data"], self.original)
        self.assertEqual((len(ctx["data"]["claims"]), len(ctx["entities"]), len(ctx["data"]["issues"])), (12, 11, 2))
        registry = citations.load_registry()
        self.assertEqual(len(registry["consumers"]), 4)
        self.assertEqual(len(registry["citations"]), 14)
        self.assertEqual(set(self.data["sources"]), set(registry["consumers"]["knowledge_pilot"]["citation_ids"]))
        self.assertEqual(ctx["entities"]["call:FUND-009"]["availability"], "not_assessed")
        self.assertEqual(ctx["entities"]["palette:mr2_mix"]["type"], "planting_palette")
        self.assertEqual(ctx["entities"][MR2]["type"], "restoration_approach")

    def test_search_unicode_aliases_case_filters_ambiguity_and_legitimate_empty_matches(self):
        result = graph.find_entities("ＣＥＲＡＴＯＮＩＡ ＳＩＬＩＱＵＡ", "species")
        self.assert_header(result)
        self.assertEqual([e["id"] for e in result["matches"]], [CAROB])
        self.assertEqual(graph.find_entities("jOhAnNiSbRoTbAuM")["matches"][0]["id"], CAROB)
        self.assertTrue(graph.find_entities("AL20")["ambiguous"])
        self.assertTrue(graph.find_entities("MR2")["ambiguous"])
        self.assertEqual(graph.find_entities("No such registered subject")["matches"], [])
        self.assertFalse(graph.find_entities("No such registered subject")["ambiguous"])
        for query, kind in [("", None), ("   ", None), (None, None), ("carob", "ecosystem")]:
            with self.assertRaises(Invalid): graph.find_entities(query, kind)

    def test_entity_details_retain_claim_context_pages_and_relationship_basis(self):
        result = graph.entity_details(MR2); self.assert_header(result)
        self.assertEqual(result["entity"]["id"], MR2)
        claim = next(c for c in result["claims"] if c["id"] == "claim:mr2-stone-mulch")
        self.assertEqual(claim["evidence"][0]["page"], 134)
        self.assertEqual(claim["evidence"][0]["document_id"], "FOREST-002")
        self.assertIn(":pdf:134", claim["evidence"][0]["passage_id"])
        self.assertTrue(claim["limitations"]); self.assertTrue(claim["context"])
        illustration = graph.entity_details("example_activity:carob-mr2-demonstrator")
        self.assertTrue(all(r["basis"] == "project_assumption" for r in illustration["relations"]))
        self.assertEqual(illustration["entity"]["availability"], "not_applicable")
        for eid in ("carob", "species:unknown", None, []):
            with self.assertRaises(Invalid): graph.entity_details(eid)

    def test_both_stock_contexts_survive_and_no_preferred_value_is_inferred(self):
        result = graph.issues(CAROB); self.assert_header(result)
        tension = next(i for i in result["issues"] if i["type"] == "source_tension")
        claims = {c["id"]: c for c in tension["claims"]}
        self.assertEqual(set(claims), {STOCK_NARRATIVE, STOCK_TABLE})
        self.assertIn("1000 cm3", claims[STOCK_NARRATIVE]["statement"])
        self.assertIn("200-300 cm3", claims[STOCK_TABLE]["statement"])
        self.assertEqual(claims[STOCK_NARRATIVE]["evidence"][0]["page"], 133)
        self.assertEqual(claims[STOCK_TABLE]["evidence"][0]["page"], 134)
        self.assertEqual(tension["status"], "unresolved")
        self.assertNotIn("preferred", tension)
        gap = next(i for i in result["issues"] if i["type"] == "evidence_gap")
        self.assertEqual(gap["claims"][0]["evidence_kind"], "research_gap")
        self.assertIn("not a literature-wide", gap["claims"][0]["limitations"][0])
        self.assertEqual(graph.issues("programme:LEADER-AL20")["issues"], [])
        with self.assertRaises(Invalid): graph.issues("species:missing")

    def test_assumptions_resolve_live_authority_values_without_copying_a_default(self):
        claim = next(c for c in graph.entity_details(CAROB)["claims"] if c["id"] == DENSITY)
        self.assertEqual(claim["citation_ids"], [])
        self.assertNotIn("350", claim["statement"])
        actual = designer.load_bundle()
        bound = claim["configuration_values"][0]["value"]
        self.assertEqual(bound["value"], actual["defaults"]["density_defaults"]["carob"])
        self.assertEqual(bound["basis"], "project_assumption")
        self.assertEqual(bound["unit"], "plants_per_hectare")
        changed = deepcopy(actual); changed["defaults"]["density_defaults"]["carob"] = 400
        original_hash = graph.entity_details(CAROB)["dataset_hash"]
        with patch.object(designer, "load_bundle", return_value=changed):
            result = graph.entity_details(CAROB)
            new = next(c for c in result["claims"] if c["id"] == DENSITY)
            self.assertEqual(new["configuration_values"][0]["value"]["value"], 400)
            self.assertNotEqual(result["dataset_hash"], original_hash)
        with patch.object(designer, "load_bundle", side_effect=Invalid("fixture missing required density")):
            with self.assertRaisesRegex(Invalid, "fixture missing"): graph.entity_details(CAROB)

    def test_impact_paths_separate_citation_dependencies_from_manual_review(self):
        cid = "claim:al20-34-novel-demonstration"
        result = graph.impact("claim", cid); self.assert_header(result, version=2)
        self.assertEqual(result["validation_dependencies"], [])
        self.assertEqual({r["binding_id"] for r in result["review_targets"]}, {"guide-34", "delivery-novelty"})
        self.assertTrue(all(r["effect"] == "review_required" for r in result["review_targets"]))
        registry = citations.load_registry()
        passage = registry["citations"]["FUND-008-p120-route-requirements"]["passage_id"]
        result = graph.impact("passage", passage)
        self.assertEqual(result["claim_ids"], [cid])
        self.assertEqual({d["consumer_id"] for d in result["validation_dependencies"]}, set(citations.CONSUMER_PATHS))
        self.assertTrue(all(d["effect"] == "citation_validation_dependency" for d in result["validation_dependencies"]))
        self.assertEqual(result["review_targets"][0]["path"][0], {"kind": "passage", "id": passage})
        outside = registry["citations"]["FUND-008-p123-route-requirements"]["passage_id"]
        for kind, target in [("passage", outside), ("passage", "missing"), ("claim", "missing"), ("entity", CAROB), (None, "missing")]:
            with self.assertRaises(Invalid): graph.impact(kind, target)

    def test_call_passage_impact_identifies_knowledge_records_without_fabricated_claims(self):
        registry = citations.load_registry()
        passage = registry["citations"]["pilot:FUND-009:p1:call-context"]["passage_id"]
        result = graph.impact("passage", passage)
        self.assertEqual(result["claim_ids"], [])
        self.assertEqual(result["entity_ids"], ["call:FUND-009"])
        self.assertEqual(result["relation_ids"], ["relation:call-al20-context"])
        self.assertEqual(result["review_targets"], [])
        self.assertEqual([d["consumer_id"] for d in result["validation_dependencies"]], ["knowledge_pilot"])

    def test_unknown_versions_fields_types_references_and_bindings_fail(self):
        mutations = [
            lambda d: d.update(version=True), lambda d: d.update(version=2), lambda d: d.update(extra=1),
            lambda d: d["entities"][CAROB].update(type="ecosystem"),
            lambda d: d["entities"][CAROB].update(binding_id="missing"),
            lambda d: d["entities"][CAROB].update(native_id="unknown"),
            lambda d: d["entities"]["palette:mr2_mix"].update(type="vegetation_series"),
            lambda d: d["entities"]["call:FUND-009"].update(availability="open"),
            lambda d: d["bindings"]["plant-carob"].update(adapter="automatic_lookup"),
            lambda d: d["bindings"]["plant-carob"].update(native_id="missing"),
            lambda d: d["claims"][DENSITY].update(configuration_ids=["plant-carob"]),
            lambda d: d["claims"][DENSITY].update(evidence_kind="guidance"),
            lambda d: d["claims"][DENSITY].update(subject_ids=["missing"]),
            lambda d: d["claims"][DENSITY].update(review_targets=["missing"]),
            lambda d: d["claims"][DENSITY].update(reviewed_on="2026-02-30"),
            lambda d: d["claims"][DENSITY].update(reviewed_on="2026-11-04"),
            lambda d: d["claims"][STOCK_TABLE].update(citation_ids=["missing"]),
            lambda d: d["sources"].pop("pilot:FOREST-002:p134:mr2-guidance"),
            lambda d: d["sources"]["pilot:FOREST-002:p134:mr2-guidance"].update(sha256="0"*64),
            lambda d: d["coverage"].update(mode="complete_application"),
            lambda d: d["coverage"].update(excluded=[]),
        ]
        for i, mutate in enumerate(mutations):
            with self.subTest(mutation=i):
                value = deepcopy(self.data); mutate(value)
                with self.assertRaises(Invalid): graph.validate_library(value)

    def test_relationship_endpoint_types_native_membership_and_interpretation_are_checked(self):
        for change in [lambda r: r.update(type="compatible_with"), lambda r: r.update(target="missing"),
                       lambda r: r.update(target="palette:mr2_mix"), lambda r: r.update(basis="project_assumption")]:
            value = deepcopy(self.data); change(value["relations"]["relation:al20-route-34"])
            with self.assertRaises(Invalid): graph.validate_library(value)
        value = deepcopy(self.data)
        value["relations"]["relation:example-route"]["basis"] = "source_reference"
        with self.assertRaises(Invalid): graph.validate_library(value)
        value = deepcopy(self.data)
        value["relations"]["relation:mr2-stone"]["claim_ids"] = [STOCK_TABLE]
        with self.assertRaises(Invalid): graph.validate_library(value)

    def test_bindings_cannot_retype_an_ordinary_document_as_a_published_call(self):
        value = deepcopy(self.data)
        value["bindings"]["call-2026"]["native_id"] = "FOREST-002"
        with self.assertRaisesRegex(Invalid, "not registered as a call source"):
            graph.validate_library(value)
        value = deepcopy(self.data)
        value["bindings"]["palette-mr2"]["native_id"] = "system_woodland"
        with self.assertRaisesRegex(Invalid, "poster presets are distinct types"):
            graph.validate_library(value)

    def test_changed_authoritative_membership_is_not_silently_kept_as_a_relation(self):
        from backend import funding_programmes
        source = funding_programmes.describe()
        programme = next(p for p in source["library"]["programmes"] if p["id"] == "LEADER-AL20")
        programme["entry_ids"].remove("LEADER-AL20-3.4")
        with patch.object(funding_programmes, "describe", return_value=source):
            with self.assertRaisesRegex(Invalid, "Programme membership disagrees"):
                graph.validate_library(self.data)
        bundle = designer.load_bundle()
        palette = next(p for p in bundle["vegetation_combinations"] if p["id"] == "mr2_mix")
        palette["starter"] = ["wild_olive"]
        with patch.object(designer, "load_bundle", return_value=bundle):
            with self.assertRaisesRegex(Invalid, "Species is not a starter"):
                graph.validate_library(self.data)

    def test_issues_cannot_silently_choose_a_value_or_lose_their_claims(self):
        for change in [lambda i: i.update(preferred="200-300"), lambda i: i.update(status="resolved"),
                       lambda i: i.update(claim_ids=[STOCK_TABLE]), lambda i: i.update(claim_ids=["missing"])]:
            value = deepcopy(self.data); change(value["issues"]["issue:mr2-stock-source-tension"])
            with self.assertRaises(Invalid): graph.validate_library(value)
        value = deepcopy(self.data); value["issues"].pop("issue:mr2-stock-source-tension")
        with self.assertRaises(Invalid): graph.validate_library(value)
        value = deepcopy(self.data); value["claims"]["claim:mr2-establishment-water-gap"]["review_status"] = "curated"
        with self.assertRaises(Invalid): graph.validate_library(value)

    def test_missing_corrupt_duplicate_and_failed_reads_do_not_use_cached_success(self):
        with TemporaryDirectory() as folder:
            path = Path(folder) / "pilot.json"
            with patch.object(graph, "LIBRARY_PATH", path):
                for text in [None, "{broken", '{"version":1,"version":1}']:
                    if text is not None: path.write_text(text, encoding="utf-8")
                    with self.assertRaises(Invalid) as caught: graph.load_library()
                    self.assertIn(str(path), str(caught.exception))
                path.write_text(json.dumps(self.data), encoding="utf-8")
                first = graph.entity_details(CAROB)
                path.unlink()
                with self.assertRaises(Invalid): graph.entity_details(CAROB)
                path.write_text(json.dumps(self.data), encoding="utf-8")
                self.assertEqual(graph.entity_details(CAROB), first)
                with patch.object(Path, "read_text", side_effect=PermissionError("fixture denied")):
                    with self.assertRaisesRegex(Invalid, "fixture denied"): graph.load_library()
        with patch.object(citations, "REGISTRY_PATH", Path("missing-registry.json")):
            with self.assertRaisesRegex(Invalid, "missing-registry"): graph.entity_details(CAROB)

    def test_queries_are_deterministic_and_do_not_mutate_authoritative_inputs(self):
        before = deepcopy(self.data)
        self.assertIs(graph.validate_library(self.data), self.data)
        self.assertEqual(self.data, before)
        first = graph.entity_details(MR2); second = graph.entity_details(MR2)
        self.assertEqual(first, second)
        first["entity"]["label"] = "Changed caller result"
        first["claims"][0]["statement"] = "Changed caller result"
        self.assertEqual(graph.entity_details(MR2), second)
        self.assertEqual(read_json(graph.LIBRARY_PATH), before)

    def test_cli_all_queries_and_checks_emit_versioned_json(self):
        for args in [["--check"], ["--search", "MR2"], ["--entity", CAROB],
                     ["--impact-claim", DENSITY], ["--issues"], ["--issues", "--for-entity", CAROB]]:
            with self.subTest(args=args):
                status, out, err = self.cli(args)
                self.assertEqual((status, err), (0, "")); self.assert_header(json.loads(out), version=2 if args[0].startswith("--impact-") else 1)
        result = subprocess.run([sys.executable, "-m", "backend.knowledge_graph", "--search", "Johannisbrotbaum"], cwd=graph.DIRECTORY, capture_output=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(json.loads(result.stdout.decode("utf-8"))["matches"][0]["id"], CAROB)

    def test_cli_failure_statuses_missing_pdf_and_no_partial_success_output(self):
        for args in [["--entity", "missing"], ["--impact-passage", "missing"], ["--search", ""]]:
            status, out, err = self.cli(args)
            self.assertEqual((status, out), (1, "")); self.assertIn("Knowledge pilot", err)
        with patch.object(documents, "verified_file", side_effect=HTTPException(404, "fixture missing PDF")):
            status, out, err = self.cli(["--check"])
            self.assertEqual((status, out), (1, "")); self.assertIn("fixture missing PDF", err)
        for args in [[], ["--check", "--issues"], ["--search", "carob", "--type", "unknown"], ["--issues", "--type", "species"], ["--check", "--for-entity", CAROB]]:
            with redirect_stdout(io.StringIO()), redirect_stderr(io.StringIO()), self.assertRaises(SystemExit) as caught:
                graph.main(args)
            self.assertEqual(caught.exception.code, 2)
