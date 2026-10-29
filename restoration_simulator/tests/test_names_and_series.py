"""Presentation identity and explicitly adopted treeless-series policy."""
from copy import deepcopy
import unittest
from backend import designer, engine, plant_names


class NamesAndSeriesTests(unittest.TestCase):
    def setUp(self):
        self.project=engine.new_project("Series fixture")
        self.blank=designer.new_draft(self.project)

    def edit(self,draft,**command):
        return designer.evaluate(draft,self.project,command)

    def series(self,draft,ident):
        return self.edit(draft,kind="toggle",collection="combinations",id=ident,enabled=True)

    def test_names_cover_exact_taxa_and_reject_invalid_evidence(self):
        names=plant_names.load()
        self.assertEqual(len(names),23)
        self.assertEqual(names["holm_oak"]["scientific"],"Quercus rotundifolia")
        self.assertIsNone(names["salsola"]["german"])
        self.assertEqual(names["tamarix"]["scientific"],"Tamarix spp.")
        raw=plant_names.read_json(plant_names.PATH)
        for mutate in [lambda v:v["plants"].pop(),lambda v:v["plants"].append(v["plants"][0]),lambda v:v["plants"][0].update(german=None),lambda v:v["plants"][0].update(references=[])]:
            broken=deepcopy(raw);mutate(broken)
            with self.assertRaises(engine.Invalid):plant_names.validate(broken)

    def test_clear_then_series_places_standalone_shrubs(self):
        planted=self.edit(self.blank,kind="plant",id="carob",enabled=True)
        clear=self.edit(planted["draft"],kind="clear")["draft"]
        for ident,counts in [("lentisk_series",{"lentisk":7}),("coscoja_series",{"kermes_oak":7,"rhamnus_lycioides":7})]:
            e=self.series(clear,ident)
            self.assertEqual({p["id"]:p["quantity"] for p in e["draft"]["selection"]["entries"]},counts)
            self.assertEqual(e["summary"]["unplaced"],0)
            self.assertEqual(e["summary"]["trees"],0)
            self.assertEqual(e,self.series(clear,ident))
            self.assertEqual(e["draft"]["associations"],{})
        warm=self.series(clear,"lentisk_series")
        optional=self.edit(warm["draft"],kind="toggle",collection="optional_members",id="palmetto",enabled=True)
        self.assertEqual(optional["summary"]["plants"],14);self.assertEqual(optional["summary"]["unplaced"],0)

    def test_trees_manual_categories_overlap_and_old_positions_are_preserved(self):
        warm=self.series(self.blank,"lentisk_series")
        positions=deepcopy(warm["draft"]["positions"])
        trees=self.edit(warm["draft"],kind="plant",id="carob",enabled=True)
        self.assertTrue(all(trees["draft"]["positions"][k]==v for k,v in positions.items()))
        self.assertEqual(trees["placement"]["categories"]["lentisk"],"within_crowns")
        fresh_tree=self.edit(self.blank,kind="plant",id="carob",enabled=True)
        associated=self.series(fresh_tree["draft"],"lentisk_series")
        self.assertEqual(len(associated["draft"]["associations"]),7)
        manual=self.edit(warm["draft"],kind="placement",id="lentisk",category="within_crowns")
        more=self.edit(manual["draft"],kind="density_step",id="lentisk",step=1)
        self.assertIn("lentisk:7",more["draft"]["unplaced"])
        excluded=self.edit(self.blank,kind="exclude",id="lentisk",enabled=True)
        self.assertEqual(self.series(excluded["draft"],"lentisk_series")["summary"]["plants"],0)
        both=self.series(self.series(self.blank,"coscoja_series")["draft"],"lentisk_series")
        self.assertEqual(both["summary"]["plants"],21)

    def test_old_bundle_needs_explicit_review_and_invalid_policy_fails(self):
        old=deepcopy(self.blank)
        del old["bundle"]["defaults"]["placement"]["treeless_series"]
        old["bundle"]["rules"]=[r for r in old["bundle"]["rules"] if r["id"]!="treeless_series"]
        old["bundle"]["manifest"]["ruleset_id"]="algarroba-designer-2026-10-29-v4"
        e=self.series(old,"lentisk_series")
        self.assertEqual(e["summary"]["unplaced"],7)
        reviewed=self.edit(e["draft"],kind="upgrade_rules")
        self.assertEqual(reviewed["draft"]["positions"],e["draft"]["positions"])
        self.assertEqual(reviewed["draft"]["selection"],e["draft"]["selection"])
        cleared=self.edit(reviewed["draft"],kind="clear")
        self.assertEqual(self.series(cleared["draft"],"lentisk_series")["summary"]["unplaced"],0)
        for mutate in [lambda b:b["defaults"]["placement"]["treeless_series"].update(category="guess"),lambda b:b["defaults"]["placement"]["treeless_series"].update(combinations=["unknown"]),lambda b:b["defaults"]["placement"].pop("treeless_series")]:
            bad=deepcopy(self.blank["bundle"]);mutate(bad)
            with self.assertRaises(engine.Invalid):designer.validate_bundle(bad)


if __name__=="__main__":unittest.main()
