"""Shared evidence is current reference information, independent of saved state."""
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

from fastapi.testclient import TestClient

from backend import knowledge_graph as graph, designer, funding_selection_guidance, project_concepts, delivery_plans
from backend.app import create_app
from backend.configuration import read_json
from backend.engine import Invalid


class KnowledgeFeatureTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.ctx = graph.load_library()
        cls.registration = read_json(graph.FEATURE_CONSUMERS_PATH)

    def cli(self, args):
        out, err = io.StringIO(), io.StringIO()
        with redirect_stdout(out), redirect_stderr(err): result = graph.main(args)
        return result, out.getvalue(), err.getvalue()

    def test_all_six_contexts_have_exact_membership_order_and_complete_pilot_coverage(self):
        seen, contexts = set(), 0
        for consumer, spec in self.registration["consumers"].items():
            response = graph.feature_evidence(consumer)
            self.assertEqual(response["version"], 1)
            self.assertEqual(response["dataset_hash"], self.ctx["hash"])
            self.assertEqual(response["coverage"]["mode"], "registered-pilot-only")
            self.assertEqual(response["consumer_registry_hash"], graph._digest(self.registration))
            self.assertEqual(response["context_order"], spec["context_order"])
            for ident, row in spec["contexts"].items():
                context = response["contexts"][ident]; contexts += 1
                self.assertEqual([c["id"] for c in context["claims"]], row["claim_ids"])
                self.assertEqual([e["id"] for e in context["entities"]], row["entity_ids"])
                self.assertEqual([r["id"] for r in context["relations"]], row["relation_ids"])
                self.assertEqual(context["binding"]["id"], row["binding_id"])
                seen.update(row["claim_ids"])
        self.assertEqual(contexts, 6)
        self.assertEqual(len(seen),12)
        self.assertEqual(set(self.ctx["data"]["claims"]) - seen, {cid for cid in self.ctx["data"]["claims"] if cid.startswith(("claim:life-","claim:kermes-","claim:drone-irrigator-"))})
        self.assertEqual(len(self.registration["consumers"]["designer"]["contexts"]["mr2"]["claim_ids"]), 8)
        self.assertEqual(len(self.registration["consumers"]["designer"]["contexts"]["carob"]["claim_ids"]), 7)

    def test_stock_contexts_gaps_call_and_illustration_remain_explicit(self):
        context = graph.feature_evidence("designer")["contexts"]["mr2"]
        stocks = [c for c in context["claims"] if c["id"].startswith("claim:mr2-stock-")]
        self.assertEqual([c["evidence"][0]["page"] for c in stocks], [133, 134])
        self.assertTrue(all(c["review_status"] == "unresolved" for c in stocks))
        self.assertEqual({i["type"] for i in context["issues"]}, {"source_tension", "evidence_gap"})
        route = graph.feature_evidence("selection_guidance")["contexts"]["route-34"]
        call = next(e for e in route["entities"] if e["type"] == "funding_call")
        self.assertEqual(call["availability"], "not_assessed")
        example = graph.feature_evidence("project_concept")["contexts"]["restoration-34"]
        self.assertEqual(len(example["relations"]), 4)
        self.assertTrue(all(r["basis"] == "project_assumption" for r in example["relations"]))

    def test_assumption_projections_change_only_when_their_owners_change(self):
        first = graph.feature_evidence("designer")
        owner = designer.load_bundle(); owner["defaults"]["density_defaults"]["carob"] = 400
        with patch.object(designer, "load_bundle", return_value=owner):
            result = graph.feature_evidence("designer")
        self.assertNotEqual(first["dataset_hash"], result["dataset_hash"])
        self.assertEqual(first["consumer_registry_hash"], result["consumer_registry_hash"])
        claim = next(c for c in result["contexts"]["carob"]["claims"] if c["id"] == "claim:designer-carob-density-assumption")
        self.assertEqual(claim["configuration_values"][0]["value"]["value"], 400)
        self.assertEqual(claim["evidence_kind"], "project_assumption")
        self.assertNotIn("400", claim["statement"])

    def test_registration_is_closed_and_references_order_and_native_bindings_are_required(self):
        mutations = [lambda r:r.update(version=True), lambda r:r.update(version=2), lambda r:r.update(dataset_id="other"), lambda r:r.update(extra=1),
                     lambda r:r["consumers"].pop("designer"), lambda r:r["consumers"].update(unknown={}),
                     lambda r:r["consumers"]["designer"]["contexts"].pop("mr2"),
                     lambda r:r["consumers"]["designer"].update(context_order=["mr2","mr2"]),
                     lambda r:r["consumers"]["designer"]["contexts"]["carob"].update(binding_id="approach-mr2"),
                     lambda r:r["consumers"]["designer"]["contexts"]["carob"].update(claim_ids=["missing"]),
                     lambda r:r["consumers"]["designer"]["contexts"]["carob"].update(entity_ids=["missing"]),
                     lambda r:r["consumers"]["designer"]["contexts"]["mr2"].update(relation_ids=["missing"])]
        for i, mutate in enumerate(mutations):
            with self.subTest(i=i):
                value=deepcopy(self.registration); mutate(value)
                with self.assertRaises(Invalid): graph.validate_feature_consumers(value,self.ctx)
        ctx=deepcopy(self.ctx); ctx["bindings"]["guide-34"]["native_id"]="LEADER-AL20-3.5"
        with self.assertRaisesRegex(Invalid,"adapter/native"): graph.validate_feature_consumers(self.registration,ctx)

    def test_issue_groups_and_relationship_subjects_cannot_be_dropped(self):
        for field, removed in [("claim_ids","claim:mr2-stock-table"),("entity_ids","palette:mr2_mix"),("claim_ids","claim:mr2-stone-mulch")]:
            value=deepcopy(self.registration)
            value["consumers"]["designer"]["contexts"]["mr2"][field].remove(removed)
            with self.assertRaises(Invalid): graph.validate_feature_consumers(value,self.ctx)

    def test_missing_corrupt_duplicate_and_failed_reads_reject_then_retry_without_cache(self):
        with TemporaryDirectory() as folder:
            path=Path(folder)/"consumers.json"
            with patch.object(graph,"FEATURE_CONSUMERS_PATH",path):
                for text in [None,'{bad','{"version":1,"version":1}']:
                    if text is not None:path.write_text(text,encoding="utf-8")
                    with self.assertRaises(Invalid):graph.feature_evidence("designer")
                path.write_text(json.dumps(self.registration),encoding="utf-8")
                first=graph.feature_evidence("designer");path.unlink()
                with self.assertRaises(Invalid):graph.feature_evidence("designer")
                path.write_text(json.dumps(self.registration),encoding="utf-8")
                self.assertEqual(graph.feature_evidence("designer"),first)
                original_read=Path.read_text
                def denied(target,*args,**kwargs):
                    if target==path:raise PermissionError("fixture access denied")
                    return original_read(target,*args,**kwargs)
                with patch.object(Path,"read_text",denied):
                    with self.assertRaisesRegex(Invalid,"fixture access denied"):graph.feature_evidence("designer")
        for consumer in ("unknown",None,[]):
            with self.assertRaises(Invalid):graph.feature_evidence(consumer)

    def test_impacts_include_real_screens_and_call_only_metadata_paths(self):
        result=graph.impact("claim","claim:al20-34-novel-demonstration")
        self.assertEqual(result["version"],2)
        self.assertEqual({r["consumer_id"] for r in result["feature_dependencies"]},{"selection_guidance","project_concept","delivery_plan"})
        self.assertEqual(result["validation_dependencies"],[])
        self.assertTrue(result["review_targets"])
        pid=self.ctx["registry"]["citations"]["pilot:FUND-009:p1:call-context"]["passage_id"]
        call=graph.impact("passage",pid)
        self.assertEqual(call["claim_ids"],[])
        self.assertEqual({p["path"][1]["kind"] for p in call["feature_dependencies"]},{"entity","relation"})
        self.assertEqual({p["context_id"] for p in call["feature_dependencies"]},{"route-34"})

    def test_new_endpoint_does_not_open_or_create_project_state_and_failures_are_separate(self):
        with TemporaryDirectory() as folder:
            path=Path(folder)/"must-not-exist.json"; app=create_app(path)
            with patch("backend.app.Store",side_effect=AssertionError("Evidence must not open project state")), TestClient(app) as client:
                for consumer in graph.FEATURE_CONTEXTS:
                    response=client.get("/api/knowledge/feature-evidence/"+consumer)
                    self.assertEqual(response.status_code,200,response.text)
                self.assertEqual(client.get("/api/knowledge/feature-evidence/unknown").status_code,422)
                with patch.object(graph,"FEATURE_CONSUMERS_PATH",Path(folder)/"missing.json"):
                    failed=client.get("/api/knowledge/feature-evidence/designer")
                    self.assertEqual(failed.status_code,422);self.assertIn("missing.json",failed.text)
                    # Existing owners never call back into the new evidence projection.
                    funding_selection_guidance.describe();project_concepts.describe();delivery_plans.describe();designer.load_bundle()
                self.assertEqual(client.get("/api/knowledge/feature-evidence/designer").status_code,200)
            self.assertFalse(path.exists())

    def test_commands_determinism_failures_and_nonmutation(self):
        before=deepcopy(self.registration);ctx=deepcopy(self.ctx)
        graph.validate_feature_consumers(self.registration,self.ctx)
        self.assertEqual((self.registration,self.ctx),(before,ctx))
        for consumer in graph.FEATURE_CONTEXTS:
            first=self.cli(["--feature-evidence",consumer]);second=self.cli(["--feature-evidence",consumer])
            self.assertEqual(first,second);self.assertEqual((first[0],first[2]),(0,""))
            self.assertEqual(json.loads(first[1])["consumer_id"],consumer)
        first=graph.feature_evidence("designer");first["contexts"]["mr2"]["claims"][0]["statement"]="caller edit"
        self.assertNotEqual(first,graph.feature_evidence("designer"))
        with patch.object(graph,"FEATURE_CONSUMERS_PATH",Path("missing-feature-consumers.json")):
            status,out,err=self.cli(["--feature-evidence","designer"])
            self.assertEqual((status,out),(1,""));self.assertIn("missing-feature-consumers",err)
            self.assertEqual(self.cli(["--check"])[0],1)
            self.assertEqual(graph.find_entities("carob")["version"],1)
        for args in [["--feature-evidence","unknown"],["--feature-evidence","designer","--issues"]]:
            with redirect_stderr(io.StringIO()),self.assertRaises(SystemExit) as caught:graph.main(args)
            self.assertEqual(caught.exception.code,2)
        proc=subprocess.run([sys.executable,"-m","backend.knowledge_graph","--feature-evidence","designer"],cwd=graph.DIRECTORY,capture_output=True)
        self.assertEqual(proc.returncode,0,proc.stderr);self.assertEqual(json.loads(proc.stdout.decode("utf-8"))["version"],1)
