"""Reviewed profiles retain evidence, unknown values and prepared-only adoption."""
from copy import deepcopy
import hashlib
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from backend import irrigation_research as research, knowledge_graph as graph, knowledge_citations
from backend.app import create_app
from backend.engine_v3 import Invalid


class IrrigationResearchTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data, cls.rules = research.load()
        cls.registry = knowledge_citations.load_registry()

    def validate(self, data=None, rules=None):
        data = deepcopy(self.data) if data is None else data
        rules = deepcopy(self.rules) if rules is None else rules
        def read(path):
            if path == research.LIBRARY_PATH: return deepcopy(data)
            if path == research.RULES_PATH: return deepcopy(rules)
            raise AssertionError(f"Unexpected research read: {path}")
        with patch.object(research, "read_json", side_effect=read):
            return research.load(self.registry)

    def test_complete_catalogue_profiles_preserve_unknowns_and_conditional_context(self):
        self.assertEqual(len(self.data["plant_profiles"]), 23)
        self.assertEqual(set(self.data["work_packages"]), {f"R{i}" for i in range(1,12)})
        for ident, row in self.data["plant_profiles"].items():
            self.assertEqual(row["species_id"], ident)
            self.assertEqual(set(row["reservoir_assessments"]), set(self.data["reservoirs"]))
            self.assertEqual(row["water_demand"]["status"], "not_established")
            self.assertEqual([row["water_demand"][k] for k in ["low_l_day","central_l_day","high_l_day"]], [None]*3)
        self.assertEqual(self.data["plant_profiles"]["carob"]["reservoir_assessments"]["cocoon"]["status"], "conditional")
        self.assertEqual(self.data["plant_profiles"]["cork_oak"]["reservoir_assessments"]["cocoon"]["status"], "conditional")
        self.assertEqual(self.data["reservoirs"]["waterboxx"]["material"], "reusable_polypropylene")

    def test_missing_unknown_malformed_versions_and_nonfinite_values_reject(self):
        mutations = [lambda d:d.pop("reservoirs"), lambda d:d.update(extra=1),
                     lambda d:d.update(version=True), lambda d:d.update(version=99),
                     lambda d:d.update(reviewed_on="2099-01-01"),lambda d:d.update(reviewed_on=None),
                     lambda d:d.update(plant_profiles=[]),lambda d:d["plant_profiles"].pop("carob"),
                     lambda d:d["plant_profiles"]["carob"]["water_demand"].update(central_l_day=0),
                     lambda d:d["plant_profiles"]["carob"]["water_demand"].update(status="default"),
                     lambda d:d["plant_profiles"]["carob"]["water_demand"].update(extra=0),
                     lambda d:d["reservoirs"]["waterboxx"]["facts"]["nominal_capacity"].update(value=float("nan")),
                     lambda d:d["reservoirs"]["waterboxx"]["facts"]["nominal_capacity"].update(value=True),
                     lambda d:d["reservoirs"]["waterboxx"]["facts"]["nominal_capacity"].update(value=-1)]
        for mutate in mutations:
            data=deepcopy(self.data);mutate(data)
            with self.subTest(mutation=mutate),self.assertRaises(Invalid):self.validate(data)

    def test_wrong_species_product_evidence_and_assumption_semantics_reject(self):
        mutations=[lambda d:d["plant_profiles"]["carob"].update(species_id="missing"),
                   lambda d:d["plant_profiles"]["carob"]["reservoir_assessments"].pop("waterboxx"),
                   lambda d:d["plant_profiles"]["carob"]["reservoir_assessments"]["cocoon"].update(citation_ids=[]),
                   lambda d:d["plant_profiles"]["carob"].update(citation_ids=["unknown"]),
                   lambda d:d["scenarios"]["dry-weather-study"].update(adoption="active"),
                   lambda d:d["scenarios"]["dry-weather-study"]["inputs"].update(drone_count=2),
                   lambda d:d["scenarios"]["dry-weather-study"].update(aircraft_id="missing"),
                   lambda d:d["scenarios"]["dry-weather-study"].update(cluster_ids=["missing"]),
                   lambda d:d["reservoirs"]["growboxx"]["web_sources"][0].update(url="javascript:alert(1)")]
        for mutate in mutations:
            data=deepcopy(self.data);mutate(data)
            with self.subTest(mutation=mutate),self.assertRaises(Invalid):self.validate(data)
        rules=deepcopy(self.rules);rules["templates"]["carob-island"]["species_ids"].append("cork_oak")
        with self.assertRaisesRegex(Invalid,"disagree with the referenced palette"):self.validate(rules=rules)

    def test_reviewed_range_requires_evidence_and_order_but_explicit_zero_is_valid(self):
        data=deepcopy(self.data);w=data["plant_profiles"]["carob"]["water_demand"]
        w.update(status="reviewed_range",low_l_day=0,central_l_day=0,high_l_day=0)
        # Validator contract only; this synthetic range is never installed.
        self.validate(data)
        w["high_l_day"]=-1
        with self.assertRaises(Invalid):self.validate(data)
        w.update(high_l_day=0,citation_ids=[])
        with self.assertRaises(Invalid):self.validate(data)

    def test_api_is_read_only_and_failed_reads_do_not_return_stale_profiles(self):
        with TemporaryDirectory() as folder:
            path=Path(folder)/"must-not-exist.json"
            client=TestClient(create_app(path))
            self.assertEqual(client.get("/api/plants/irrigation-profiles").status_code,200)
            self.assertFalse(path.exists())
            self.assertEqual(client.get("/api/plants/irrigation-profiles?unexpected=1").status_code,422)
            with patch.object(research,"read_json",side_effect=Invalid("Cannot read intended profile file")):
                response=client.get("/api/plants/irrigation-profiles")
            self.assertEqual(response.status_code,500)
            self.assertIn("Cannot read intended profile file",response.json()["detail"])
            self.assertNotIn("plant_profiles",response.json());self.assertFalse(path.exists())

    def test_original_records_feature_contexts_and_operational_authorities_unchanged(self):
        fixture=json.loads((Path(__file__).parent/"fixtures/knowledge-drone-research-baseline.json").read_text(encoding="utf8"))
        ctx=graph.load_library()
        for col, records in fixture["records"].items():
            for ident, digest in records.items():self.assertEqual(graph._digest(ctx["data"][col][ident]),digest,(col,ident))
        for consumer,digest in fixture["feature_contexts"].items():
            self.assertEqual(graph._digest(graph.feature_evidence(consumer)["contexts"]),digest)
        for relative,digest in fixture["authority_files"].items():
            self.assertEqual(hashlib.sha256((graph.DIRECTORY/relative).read_bytes()).hexdigest(),digest,relative)

    def test_native_profiles_and_prepared_rules_are_visible_and_edition_traced(self):
        for kind,ident in [("irrigation_profile","carob"),("reservoir_system","cocoon"),("research_topic","R8"),("research_scenario","dry-weather-study"),("cluster_template","carob-island")]:
            value=graph.entity_details(kind+":"+ident)
            self.assertEqual(value["authority"]["adapter"],kind)
            self.assertTrue(value["authority"]["value"]["limitations"])
        ctx=graph.load_library()
        self.assertEqual(ctx["data"]["relations"]["relation:irrigator-profile-carob"]["target"],"species:carob")
        for key in ["capacities","refill-regimes","planting-depth"]:
            issue=ctx["data"]["issues"]["issue:drone-irrigator-"+key]
            self.assertEqual(len(issue["claim_ids"]),2)
            self.assertTrue(all(ctx["data"]["claims"][c]["review_status"]=="unresolved" for c in issue["claim_ids"]))
        broken=deepcopy(ctx["data"])
        broken["entities"]["reservoir_system:cocoon"]["citation_ids"] = []
        with self.assertRaisesRegex(Invalid,"evidence disagrees"):
            graph._build(broken,ctx["registry"])
        broken=deepcopy(ctx["data"])
        broken["relations"]["relation:irrigator-profile-carob"].update(target="species:wild_olive",claim_ids=[])
        with self.assertRaisesRegex(Invalid,"native species identity"):
            graph._build(broken,ctx["registry"])


if __name__ == "__main__": unittest.main()
