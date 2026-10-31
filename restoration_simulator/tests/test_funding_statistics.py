from copy import deepcopy
import statistics
import unittest
from unittest.mock import patch

from backend import funding, funding_statistics as stats, funding_selection, documents
from backend.engine import Invalid
from backend.storage import Store, validate_export
from test_designer_library import site
import test_funding as persistence_fixtures


class StatisticsTests(unittest.TestCase):
    def setUp(self):
        self.project = site()
        self.draft = funding.new_draft(self.project, None, [], "business")
        self.data = stats.dataset()
        self.hash = funding.digest(self.data)
        self.route = "LEADER-AL20-3.4"

    def settings(self, name="Alhama de Almería", population=None):
        return {"municipality": name, "population_mode": "municipality_proxy" if population is None else "settlement",
                "settlement_name": None if population is None else "Test núcleo", "population": population,
                "population_year": None if population is None else 2025}

    def apply(self, settings):
        return stats.apply(self.draft, self.project, self.route, settings, ["AT.3", "RD.5"], self.hash)

    def test_complete_source_editions_and_distinct_measures(self):
        self.assertEqual({r["name"] for r in self.data["municipalities"]}, set(funding.catalogue()["municipalities"]))
        self.assertEqual(statistics.median(r["population"] for r in self.data["municipalities"]), 539)
        self.assertEqual(statistics.median(r["businesses"] for r in self.data["municipalities"]), 21.5)
        self.assertEqual(self.data["benchmarks"]["businesses_zrl_mean"], "60")
        for source in self.data["sources"]:
            self.assertEqual(source["sha256"], documents.record(source["document_id"])["sha256"])
        row = next(r for r in self.data["municipalities"] if r["name"] == "Alhama de Almería")
        self.assertEqual((row["population"], row["businesses"]), (4016, 284))
        self.assertEqual(next(r for r in self.data["municipalities"] if r["name"] == "Las Tres Villas")["businesses_page"], 182)

    def test_exclusive_population_bands_strict_boundaries_and_zero(self):
        for population, selected in [(0,"AT.3.1"),(538,"AT.3.1"),(539,"AT.3.2"),(2255,"AT.3.2"),(2256,None),(4000,None)]:
            result = stats.lookup(self.data, self.settings(population=population))
            self.assertEqual([k for k,v in result["answers"]["AT.3"].items() if v], [] if selected is None else [selected])
        d = self.apply(self.settings("Almócita"))
        self.assertEqual(funding_selection.calculate(d["bundle"],d["selection_assessments"],self.route)["subtotal"],25)
        for route in self.draft["selection_assessments"]:
            if route != self.route:self.assertEqual(d["selection_assessments"][route],self.draft["selection_assessments"][route])
            result=stats.apply(self.draft,self.project,route,self.settings("Almócita"),["AT.3","RD.5"],self.hash)
            expected=20 if route.endswith("1.11") else 22 if route.endswith(("2.6","2.7")) else 25
            self.assertEqual(funding_selection.calculate(result["bundle"],result["selection_assessments"],route)["subtotal"],expected)

    def test_business_uses_published_mean_not_median_and_strict_less_than(self):
        self.assertTrue(stats.lookup(self.data,self.settings("Alhabia"))["answers"]["RD.5"]["RD.5.1"])
        self.assertFalse(stats.lookup(self.data,self.settings("Fondón"))["answers"]["RD.5"]["RD.5.1"])
        settings = {**self.data["defaults"],"municipality":"Alhabia"}
        result = stats.lookup(self.data,settings)
        self.assertEqual(set(result["answers"]["AT.3"].values()),{None})
        self.assertTrue(result["answers"]["RD.5"]["RD.5.1"])

    def test_unknown_locations_inputs_editions_and_forged_auto_answers_fail_atomically(self):
        before = deepcopy(self.draft)
        for mutation in [{"municipality":"Unknown"},{"population_mode":"invalid"},{"population_mode":[]}, {"population_mode":"settlement","settlement_name":""}, {"population_mode":"settlement","settlement_name":"Village","population":4,"population_year":2023}]:
            with self.assertRaises(Invalid):self.apply({**self.settings(),**mutation})
        with self.assertRaisesRegex(Invalid,"dataset changed"):
            stats.apply(self.draft,self.project,self.route,self.settings(),["AT.3"],"0"*64)
        d = self.apply(self.settings())
        d["selection_assessments"][self.route]["criteria"]["RD.5"]["answers"]["RD.5.1"] = True
        with self.assertRaisesRegex(Invalid,"Switch this criterion to manual"):
            funding.validate_draft(d,self.project)
        d["selection_assessments"][self.route]["location_lookup"]["automated"].remove("RD.5")
        funding.validate_draft(d,self.project)
        self.assertEqual(before,self.draft)
        bad=deepcopy(self.data);bad["municipalities"].pop()
        with self.assertRaisesRegex(Invalid,"32"):
            stats.validate(bad)
        with patch.object(stats,"DATASET_PATH",stats.DATASET_PATH.with_name("missing-statistics.json")):
            with self.assertRaisesRegex(Invalid,"Cannot load required"):
                stats.dataset()


class StatisticsPersistenceTests(unittest.TestCase):
    setUp = persistence_fixtures.FundingPersistenceTests.setUp
    body = persistence_fixtures.FundingPersistenceTests.body
    seed = persistence_fixtures.FundingPersistenceTests.seed

    def test_lookup_api_save_restart_and_source_version_validation(self):
        d=self.seed(); route="LEADER-AL20-3.4"
        data=self.client.get("/api/funding/statistics").json()
        settings={**data["dataset"]["defaults"],"municipality":"Almócita","population_mode":"municipality_proxy"}
        request={"revision":self.view["revision"],"draft":d,"route":route,"settings":settings,"automated":["AT.3","RD.5"],"dataset_hash":data["dataset_hash"]}
        preview=self.client.post("/api/funding/location-preview",json=request)
        self.assertEqual(preview.status_code,200,preview.text)
        updated=preview.json()
        saved=self.client.post("/api/funding/save",json=self.body("save",updated))
        self.assertEqual(saved.status_code,200,saved.text)
        snapshot=self.path.read_bytes()
        bad=deepcopy(updated);bad["selection_assessments"][route]["location_lookup"]["dataset_hash"]="0"*64
        rejected=self.client.post("/api/funding/save",json=self.body("draft",bad))
        self.assertEqual(rejected.status_code,422,rejected.text)
        self.assertEqual(self.path.read_bytes(),snapshot)
        self.assertEqual(self.client.get("/api/funding").json()["attachment"]["draft"],updated)
        exported=Store(self.path).export()
        self.assertEqual(validate_export(exported)["funding"]["draft"],updated)
        prepared=funding.prepare(updated,exported["project"],adopt_current_catalogue=True)
        self.assertEqual(prepared["draft"]["selection_assessments"],updated["selection_assessments"])
        clone=Store(self.path.with_name("imported.json"))
        from uuid import uuid4
        clone.mutate("import",0,str(uuid4()),dict(save=exported,confirm_replace=False))
        self.assertEqual(clone.export()["funding"]["draft"],updated)


if __name__ == "__main__":unittest.main()
