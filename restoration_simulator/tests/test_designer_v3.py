"""Placement, explicit evidence and historical-save regression tests for engine v3."""
from collections import Counter
from copy import deepcopy
import json
import math
from pathlib import Path
from tempfile import TemporaryDirectory
from uuid import uuid4
import unittest

from backend import designer, designer_v2, designer_v3, engine
from backend.storage import Store, validate_export


class PlacementTests(unittest.TestCase):
    def setUp(self):
        self.project = engine.new_project("Placement fixture")
        self.empty = designer.new_draft(self.project)

    def edit(self, draft, **command):
        return designer.evaluate(draft, self.project, command)

    def planted(self):
        d = self.edit(self.empty, kind="plant", id="carob", enabled=True)["draft"]
        return self.edit(d, kind="plant", id="lentisk", enabled=True)

    def test_all_23_diameters_are_explicit_positive_and_overrides_win(self):
        b = designer.load_bundle()
        self.assertEqual(len(b["defaults"]["mature_diameters"]), 23)
        self.assertEqual(len(b["plant_dimensions"]["plants"]), 23)
        for row in b["plant_dimensions"]["plants"]:
            self.assertGreater(b["defaults"]["mature_diameters"][row["id"]], 0)
            self.assertTrue(row["planning"]["basis"])
            self.assertTrue(row["references"])
        e = self.planted()
        self.assertEqual(e["overlays"]["carob"]["crown"]["diameter_m"], [6, 6])
        self.assertEqual(e["overlays"]["lentisk"]["root_ball"]["diameter_m"], [.12, .12])
        e = self.edit(e["draft"], kind="dimension", id="carob", feature="crown", value=dict(diameter=9, basis="measured", note="Measured crown"))
        self.assertEqual(e["overlays"]["carob"]["crown"]["diameter_m"], [9, 9])
        for group, diameter in [("tree", 6), ("shrub", 2), ("grass", .6)]:
            c = self.edit(self.empty, kind="custom", density=50, entry=dict(id="custom-"+group, label=group, group=group, quantity=1, unit_cost=2, price_confirmed=False))
            self.assertEqual(c["overlays"]["custom-"+group]["crown"]["diameter_m"], [diameter, diameter])
            self.assertEqual(c["placement"]["categories"]["custom-"+group], "independent")

    def test_invalid_rules_and_corrupt_associations_fail_atomically(self):
        for mutation in [
            lambda b:b["defaults"]["mature_diameters"].pop("thyme"),
            lambda b:b["defaults"]["mature_diameters"].update(carob=0),
            lambda b:b["defaults"]["placement"].update(attempts_per_parent=0),
            lambda b:b["plant_dimensions"]["plants"][0].pop("planning"),
            lambda b:b["defaults"]["placement"]["by_species"].update(lentisk="magic"),
            lambda b:next(r for r in b["rules"] if r["id"]=="shrub_placement").update(effect="geometry"),
        ]:
            b = designer.load_bundle(); mutation(b)
            with self.assertRaises(engine.Invalid): designer.validate_bundle(b)
        e = self.planted()
        for mutate in [
            lambda d:d["associations"]["lentisk:0"].update(parent_id="absent:0"),
            lambda d:d["associations"]["lentisk:0"].update(dx=999),
            lambda d:d.update(placement_seed=None),
            lambda d:d["placement_notes"].pop("lentisk:0"),
        ]:
            d = deepcopy(e["draft"]); mutate(d)
            with self.assertRaises(engine.Invalid): designer.evaluate(d, self.project)
        before = deepcopy(e["draft"])
        with self.assertRaises(engine.Invalid):
            self.edit(e["draft"],kind="position",id="lentisk:0",x=-1,y=2)
        self.assertEqual(e["draft"], before)

    def test_density_by_growth_form_and_no_automatic_retries(self):
        for species, count in [("lentisk", 7), ("thyme", 7), ("wild_olive", 1), ("esparto", 1), ("carob", 7)]:
            e = self.edit(self.empty, kind="plant", id=species, enabled=True)
            self.assertEqual(e["summary"]["plants"], count)
        e = self.edit(self.empty, kind="plant", id="lentisk", enabled=True)
        self.assertEqual(e["summary"]["unplaced"], 7)
        self.assertEqual(e["summary"]["plant_cost"], 17.5)
        added = self.edit(e["draft"], kind="plant", id="carob", enabled=True)
        self.assertEqual(len([p for p in added["instances"] if p["species"]=="lentisk"]), 0)
        self.assertEqual(added["draft"]["associations"], {})
        more = self.edit(added["draft"],kind="density_step",id="lentisk",step=1)
        self.assertIn("lentisk:7",more["draft"]["associations"])
        self.assertTrue(set(e["draft"]["unplaced"]) <= set(more["draft"]["unplaced"]))

    def test_generation_is_balanced_deterministic_inside_crowns_and_clear(self):
        a, b = self.planted(), self.planted()
        self.assertEqual(a, b)
        self.assertEqual(a["summary"]["unplaced"], 0)
        self.assertEqual(Counter(link["parent_id"] for link in a["draft"]["associations"].values()), Counter({f"carob:{i}":1 for i in range(7)}))
        positions = a["draft"]["positions"]
        for child, link in a["draft"]["associations"].items():
            self.assertGreaterEqual(math.hypot(link["dx"], link["dy"]), 1)
            self.assertLessEqual(math.hypot(link["dx"], link["dy"]), 3)
        for key, p in positions.items():
            self.assertTrue(0 <= p["x"] <= a["width"] and 0 <= p["y"] <= a["height"])
            for other, q in positions.items():
                if key != other: self.assertGreaterEqual(math.hypot(p["x"]-q["x"],p["y"]-q["y"]),1-1e-9)
        changed = self.edit(a["draft"], kind="plant", id="wild_olive", enabled=True)
        self.assertEqual({k:changed["draft"]["positions"][k] for k in positions}, positions)

    def test_tree_move_child_detachment_parent_removal_and_undo_snapshot(self):
        e = self.planted(); start = deepcopy(e["draft"])
        child = "lentisk:0"; link = start["associations"][child]
        parent = link["parent_id"]
        moved = self.edit(start, kind="position", id=parent, x=5, y=5)
        pos = moved["draft"]["positions"][child]
        self.assertAlmostEqual(pos["x"], 5+link["dx"])
        self.assertAlmostEqual(pos["y"], 5+link["dy"])
        detached = self.edit(moved["draft"],kind="position",id=child,x=5,y=5)
        self.assertNotIn(child,detached["draft"]["associations"])
        self.assertTrue(any("closer than 1 m" in warning for warning in detached["placement"]["warnings"]))
        again = self.edit(detached["draft"],kind="position",id=parent,x=7,y=7)
        self.assertEqual(again["draft"]["positions"][child],dict(x=5,y=5,manual=True))
        removed = self.edit(moved["draft"],kind="plant",id="carob",enabled=False)
        self.assertEqual(removed["draft"]["associations"],{})
        self.assertEqual(removed["draft"]["positions"][child],pos)
        # UI undo restores the exact accepted draft, evaluated without a command.
        self.assertEqual(designer.evaluate(start,self.project)["draft"],start)
        self.assertEqual(designer.evaluate(moved["draft"],self.project)["draft"]["associations"],moved["draft"]["associations"])

    def test_outside_children_keep_offsets_and_crown_edit_never_redistributes(self):
        e = self.planted()
        link = e["draft"]["associations"]["lentisk:0"]
        moved = self.edit(e["draft"],kind="position",id=link["parent_id"],x=0,y=0)
        self.assertIn("lentisk:0",moved["draft"]["unplaced"])
        self.assertIn("lentisk:0",moved["draft"]["displaced"])
        self.assertEqual(moved["draft"]["associations"]["lentisk:0"],link)
        returned = self.edit(moved["draft"],kind="position",id=link["parent_id"],x=5,y=5)
        self.assertIn("lentisk:0",returned["draft"]["positions"])
        changed = self.edit(e["draft"],kind="dimension",id="carob",feature="crown",value=dict(diameter=1,basis="assumption",note="Small drawing"))
        self.assertEqual(changed["draft"]["positions"],e["draft"]["positions"])
        self.assertTrue(any("edited crown" in w for w in changed["placement"]["warnings"]))
        shrunk = self.edit(e["draft"],kind="resize",axis="width",length=4)
        designer.validate_draft(shrunk["draft"],self.project)

    def test_pocket_parent_carries_shrubs_and_manual_tree_stays(self):
        e = self.edit(self.empty,kind="patch",section="pocket",values=dict(enabled=True))
        e = self.edit(e["draft"],kind="plant",id="lentisk",enabled=True)
        links = deepcopy(e["draft"]["associations"])
        self.assertTrue(links)
        moved = self.edit(e["draft"],kind="patch",section="pocket",values=dict(x=4,y=4))
        for child, link in links.items():
            pos = designer_v3.retained_position(moved["draft"],child)
            self.assertAlmostEqual(pos["x"],4+link["dx"])
            self.assertAlmostEqual(pos["y"],4+link["dy"])
        e = self.edit(moved["draft"],kind="position",id="holm_oak:0",x=6,y=6)
        moved = self.edit(e["draft"],kind="patch",section="pocket",values=dict(x=8))
        self.assertEqual(moved["draft"]["positions"]["holm_oak:0"],dict(x=6,y=6,manual=True))

    def test_open_ground_obstacles_categories_tiny_crowns_and_crowding(self):
        e = self.edit(self.empty,kind="plant",id="carob",enabled=True)
        e = self.edit(e["draft"],kind="existing",plants=[dict(id="existing-1",species="carob",x=7,y=7,radius=1)])
        e = self.edit(e["draft"],kind="plant",id="thyme",enabled=True)
        for p in e["instances"]:
            if p["species"] != "thyme": continue
            self.assertGreaterEqual(math.hypot(p["x"]-7,p["y"]-7),1)
            for q in e["instances"]:
                if q["species"]=="carob": self.assertGreater(math.hypot(p["x"]-q["x"],p["y"]-q["y"]),3)
        positions = deepcopy(e["draft"]["positions"])
        e = self.edit(e["draft"],kind="placement",id="thyme",category="independent")
        self.assertEqual(e["draft"]["positions"],positions)
        tiny = self.edit(e["draft"],kind="dimension",id="carob",feature="crown",value=dict(diameter=1,basis="assumption",note="Tiny"))
        tiny = self.edit(tiny["draft"],kind="plant",id="lentisk",enabled=True)
        self.assertTrue(all(f"lentisk:{i}" in tiny["draft"]["unplaced"] for i in range(7)))
        d = self.edit(self.empty,kind="patch",section="physical",values=dict(restoration_area=1))["draft"]
        d = self.edit(d,kind="density",id="carob",value=10000)["draft"]
        crowded = self.edit(d,kind="density",id="lentisk",value=70000)
        self.assertGreater(crowded["summary"]["unplaced"],0)
        designer.validate_draft(crowded["draft"])

    def test_v2_snapshot_requires_explicit_adoption_without_invented_links(self):
        old = designer_v3.v2_draft(self.empty)
        old["bundle"] = json.loads((Path(__file__).parent/"fixtures"/"designer-v2-bundle.json").read_text(encoding="utf8"))
        old = designer_v2.evaluate(old,self.project,dict(kind="plant",id="carob",enabled=True))["draft"]
        old = designer_v2.evaluate(old,self.project,dict(kind="plant",id="lentisk",enabled=True))["draft"]
        self.assertEqual(designer.evaluate(old,self.project),designer_v2.evaluate(old,self.project))
        with self.assertRaises(engine.Invalid): self.edit(old,kind="plant",id="thyme",enabled=True)
        updated = self.edit(old,kind="upgrade_rules")
        for field in ["selection","preferences","positions","dimensions","exclusions"]:
            self.assertEqual(updated["draft"][field],old[field])
        self.assertEqual(updated["draft"]["associations"],{})
        self.assertEqual(updated["summary"]["shrubs"],1)
        self.assertEqual(updated["overlays"]["carob"]["crown"]["diameter_m"],[6,6])

    def test_save_export_import_retain_associations_without_changing_project(self):
        p = self.project
        v = {f["name"]:f["default"] for f in engine.land_form(p,"existing")["fields"]}
        v.update(route_id="existing",parcel_id="new",parcel_area=4500,covered_area=4500)
        self.project = engine.transition(p,"establish_access",v)[0]
        e = self.planted(); d = e["draft"]; d["physical"]["parcel_id"]=self.project["parcels"][0]["id"]
        with TemporaryDirectory() as folder:
            s=Store(Path(folder)/"save.json")
            s.mutate("import",0,str(uuid4()),dict(save=dict(format_version=4,project=self.project,undo=None),confirm_replace=False))
            before=s.snapshot()
            s.save_designer(d,before["revision"],0,str(uuid4()))
            self.assertEqual(Store(s.path).snapshot()["designer"]["draft"],d)
            exported=validate_export(s.export())
            target=Store(Path(folder)/"copy.json")
            target.mutate("import",0,str(uuid4()),dict(save=exported,confirm_replace=False))
            self.assertEqual(target.snapshot()["designer"],s.snapshot()["designer"])
            self.assertEqual(s.snapshot()["project"],before["project"])
            self.assertEqual(s.snapshot()["undo"],before["undo"])

    def test_new_tree_is_rendered_when_earlier_unplaced_species_exceeds_capacity(self):
        e = self.edit(self.empty,kind="density",id="lentisk",value=25000)
        self.assertEqual(e["summary"]["unplaced"],500)
        e = self.edit(e["draft"],kind="plant",id="wild_olive",enabled=True)
        self.assertEqual(len(e["instances"]),1)
        self.assertEqual(e["instances"][0]["id"],"wild_olive:0")
        self.assertEqual(set(p["id"] for p in e["instances"]),set(e["draft"]["positions"]))


if __name__ == "__main__":
    unittest.main()

