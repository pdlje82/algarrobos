"""Regression cases for density-led exploration and explicit historical upgrades."""
from copy import deepcopy
import json
from pathlib import Path
from tempfile import TemporaryDirectory
from uuid import uuid4
import unittest
from backend import designer, designer_v1, designer_v2, designer_v3, engine
from backend.storage import Store, validate_export


class DensityDesignerTests(unittest.TestCase):
    def setUp(self):
        self.project = engine.new_project("Density fixture")
        self.empty = designer.new_draft(self.project)

    def run_edit(self, draft, **command):
        return designer.evaluate(draft, self.project, command)

    def carobs(self):
        return self.run_edit(self.empty, kind="plant", id="carob", enabled=True)

    def test_counts_round_half_up_and_zero_is_not_fabricated(self):
        for density, count in [(100, 2), (200, 4), (350, 7), (75, 2), (25, 1), (10, 0)]:
            e = self.run_edit(self.empty, kind="density", id="carob", value=density)
            self.assertEqual(e["summary"]["plants"], count)
            self.assertEqual(e["species"][0]["requested_density"], density)
            self.assertEqual(e["species"][0]["effective_density"], count * 50)
            self.assertEqual(e["species"][0]["density_step"], 50)
            self.assertEqual(len(e["species"]), 1)
            designer.validate_draft(e["draft"], self.project)
        for value in [None, -1, float("nan"), float("inf"), True, "350"]:
            with self.assertRaises(engine.Invalid): self.run_edit(self.empty, kind="density", id="carob", value=value)
        e = self.run_edit(self.empty, kind="density", id="carob", value=0)
        self.assertEqual(e["species"], [])

    def test_arrows_change_one_plant_and_checklist_and_models_agree(self):
        manual = self.carobs()
        mr1 = self.run_edit(self.empty, kind="toggle", collection="approaches", id="mr1", enabled=True)
        self.assertEqual(manual["summary"]["plants"], 7)
        self.assertEqual(mr1["summary"]["plants"], 7)
        up = self.run_edit(mr1["draft"], kind="density_step", id="carob", step=1)
        self.assertEqual(up["species"][0]["requested_density"], 400)
        down = self.run_edit(up["draft"], kind="density_step", id="carob", step=-1)
        self.assertEqual(down["summary"]["plants"], 7)
        shrub = self.run_edit(self.empty, kind="plant", id="lentisk", enabled=True)
        self.assertEqual(shrub["summary"]["shrubs"], 7)

    def test_uncheck_then_new_or_reactivated_source_and_persistent_exclusion(self):
        e = self.carobs()
        e = self.run_edit(e["draft"], kind="plant", id="carob", enabled=False)
        self.assertEqual(e["draft"]["exclusions"], [])
        e = self.run_edit(e["draft"], kind="toggle", collection="approaches", id="mr1", enabled=True)
        self.assertEqual(e["summary"]["plants"], 7)
        e = self.run_edit(e["draft"], kind="plant", id="carob", enabled=False)
        self.assertEqual(designer.evaluate(e["draft"], self.project)["summary"]["plants"], 0)
        e = self.run_edit(e["draft"], kind="toggle", collection="approaches", id="mr1", enabled=False)
        e = self.run_edit(e["draft"], kind="toggle", collection="approaches", id="mr1", enabled=True)
        self.assertEqual(e["summary"]["plants"], 7)
        e = self.run_edit(e["draft"], kind="exclude", id="carob", enabled=True)
        e = self.run_edit(e["draft"], kind="toggle", collection="approaches", id="mr2", enabled=True)
        self.assertEqual(e["summary"]["plants"], 0)
        e = self.run_edit(e["draft"], kind="plant", id="carob", enabled=True)
        self.assertEqual(e["summary"]["plants"], 7)
        self.assertEqual(e["draft"]["exclusions"], [])

    def test_overlaps_and_readdition_preserve_density_price_and_position(self):
        e = self.run_edit(self.empty, kind="toggle", collection="approaches", id="mr1", enabled=True)
        e = self.run_edit(e["draft"], kind="density", id="carob", value=200)
        row = deepcopy(e["species"][0]["entry"]); row.update(unit_cost=3.25, price_confirmed=True)
        e = self.run_edit(e["draft"], kind="selection", selection={"version": 2, "entries": [row]})
        e = self.run_edit(e["draft"], kind="position", id="carob:0", x=2, y=3)
        e = self.run_edit(e["draft"], kind="toggle", collection="approaches", id="mr2", enabled=True)
        self.assertEqual(e["summary"]["plants"], 4)
        self.assertEqual(e["draft"]["positions"]["carob:0"], dict(x=2, y=3, manual=True))
        e = self.run_edit(e["draft"], kind="plant", id="carob", enabled=False)
        e = self.run_edit(e["draft"], kind="plant", id="carob", enabled=True)
        self.assertEqual(e["summary"]["plants"], 4)
        self.assertEqual(e["summary"]["plant_cost"], 13)
        self.assertTrue(e["species"][0]["entry"]["price_confirmed"])

    def test_area_change_preserves_count_until_explicit_density_update(self):
        e = self.carobs()
        e = self.run_edit(e["draft"], kind="patch", section="physical", values={"restoration_area": 400})
        self.assertEqual(e["summary"]["plants"], 7)
        self.assertEqual(e["summary"]["carob_density"], 175)
        self.assertEqual(e["density_update"], [dict(id="carob", density=350, quantity=14)])
        restored = self.run_edit(e["draft"], kind="restore_densities")
        self.assertEqual(restored["summary"]["plants"], 14)
        self.assertIsNone(restored["density_update"])

    def test_resize_keeps_area_and_centre_offsets_and_retains_unplaced_coordinates(self):
        e = self.carobs(); w, h = e["width"], e["height"]
        e = self.run_edit(e["draft"], kind="position", id="carob:0", x=w-0.1, y=h/2)
        shrunk = self.run_edit(e["draft"], kind="resize", axis="width", length=4)
        self.assertAlmostEqual(shrunk["width"] * shrunk["height"], 200)
        self.assertEqual(shrunk["summary"]["plants"], 7)
        self.assertIn("carob:0", shrunk["draft"]["unplaced"])
        position = shrunk["draft"]["displaced"]["carob:0"]
        self.assertAlmostEqual(position["x"]-shrunk["width"]/2, w/2-0.1)
        self.assertTrue(position["manual"])
        self.assertEqual(designer.evaluate(shrunk["draft"], self.project)["draft"], shrunk["draft"])
        with self.assertRaises(engine.Invalid): self.run_edit(e["draft"], kind="resize", axis="width", length=0.01)

    def test_pocket_moves_only_its_automatic_plant_and_removal_retains_manual_species(self):
        e = self.run_edit(self.empty, kind="patch", section="pocket", values={"enabled": True})
        e = self.run_edit(e["draft"], kind="patch", section="pocket", values={"x": 3, "y": 4})
        self.assertEqual(e["draft"]["positions"]["holm_oak:0"], dict(x=3, y=4, manual=False))
        e = self.run_edit(e["draft"], kind="position", id="holm_oak:0", x=5, y=6)
        e = self.run_edit(e["draft"], kind="patch", section="pocket", values={"x": 7})
        self.assertEqual(e["draft"]["positions"]["holm_oak:0"], dict(x=5, y=6, manual=True))
        with self.assertRaises(engine.Invalid): self.run_edit(e["draft"], kind="patch", section="pocket", values={"x": -1})

    def test_dimension_gaps_and_explicit_measurements_do_not_affect_cost_or_layout(self):
        e = self.carobs()
        self.assertEqual(len(e["draft"]["bundle"]["plant_dimensions"]["plants"]), 23)
        self.assertEqual(e["overlays"]["carob"]["root_ball"]["diameter_m"], [0.12, 0.12])
        changed = self.run_edit(e["draft"], kind="dimension", id="carob", feature="root_ball", value={"diameter": 0.12, "basis": "measured", "note": "Actual supplied stock"})
        self.assertEqual(changed["overlays"]["carob"]["root_ball"]["diameter_m"], [0.12, 0.12])
        self.assertEqual(changed["summary"], e["summary"])
        self.assertEqual(changed["draft"]["positions"], e["draft"]["positions"])
        with self.assertRaises(engine.Invalid): self.run_edit(e["draft"], kind="dimension", id="carob", feature="crown", value={"diameter": 8, "basis": "", "note": ""})

    def test_legacy_read_and_explicit_upgrade_preserve_counts_and_exclusions(self):
        bundle = designer_v3.v1_bundle(designer.load_bundle())
        # Construct a historical attachment without loading current files in v1.
        draft = {k: deepcopy(v) for k,v in self.empty.items() if k not in designer_v2.V2_FIELDS | designer_v3.V3_FIELDS}
        draft.update(version=1, bundle=bundle)
        old = designer_v1.evaluate(draft, self.project, dict(kind="toggle", collection="approaches", id="mr1", enabled=True))
        self.assertEqual(old["summary"]["plants"], 1)
        self.assertEqual(designer.evaluate(old["draft"], self.project), old)
        with self.assertRaises(engine.Invalid): self.run_edit(old["draft"], kind="plant", id="lentisk", enabled=True)
        upgraded = self.run_edit(old["draft"], kind="upgrade_rules")
        self.assertEqual(upgraded["summary"]["plants"], 1)
        self.assertEqual(upgraded["draft"]["positions"], old["draft"]["positions"])
        old["draft"]["exclusions"] = ["lentisk"]
        upgraded = self.run_edit(old["draft"], kind="upgrade_rules")
        self.assertEqual(upgraded["draft"]["legacy_exclusions"], ["lentisk"])

    def test_v2_attachment_roundtrip_preserves_zero_target_dimensions_and_pending_area_update(self):
        p = engine.new_project("Persistence fixture")
        values = {f["name"]: f["default"] for f in engine.land_form(p,"existing")["fields"]}
        values.update(route_id="existing", parcel_id="new", parcel_area=4500, covered_area=4500)
        p = engine.transition(p,"establish_access",values)[0]
        d = designer.new_draft(p)
        d["physical"]["parcel_id"] = p["parcels"][0]["id"]
        for cmd in [dict(kind="density",id="carob",value=10), dict(kind="dimension",id="carob",feature="root_ball",value=dict(diameter=.12,basis="measured",note="Supplier plug")), dict(kind="patch",section="pocket",values=dict(enabled=True)), dict(kind="resize",axis="width",length=4), dict(kind="patch",section="physical",values=dict(restoration_area=400))]:
            d = designer.evaluate(d,p,cmd)["draft"]
        with TemporaryDirectory() as folder:
            path = Path(folder)/"save.json"; store = Store(path)
            store.mutate("import",0,str(uuid4()),dict(save=dict(format_version=4,project=p,undo=None),confirm_replace=False))
            before = store.snapshot()
            store.save_designer(d,before["revision"],0,str(uuid4()))
            after = Store(path).snapshot()
            self.assertEqual(after["project"],before["project"])
            self.assertEqual(after["revision"],before["revision"])
            self.assertEqual(after["undo"],before["undo"])
            self.assertEqual(after["designer"]["draft"],d)
            exported = validate_export(store.export())
            self.assertEqual(exported["designer"],after["designer"])
            target = Store(Path(folder)/"imported.json")
            target.mutate("import",0,str(uuid4()),dict(save=exported,confirm_replace=False))
            self.assertEqual(target.snapshot()["designer"],after["designer"])

    def test_dimension_and_snapshot_corruption_is_rejected(self):
        for change in [lambda b:b["plant_dimensions"]["plants"].pop(), lambda b:b["plant_dimensions"]["plants"][0]["crown"].update(diameter_m=[8,4]), lambda b:b["plant_dimensions"]["plants"][0].update(references=[]),lambda b:b["defaults"].update(density_rounding="bankers")]:
            b = designer.load_bundle(); change(b)
            with self.assertRaises(engine.Invalid): designer.validate_bundle(b)
        e = self.carobs(); d = deepcopy(e["draft"])
        d["selection"]["entries"][0]["unit_cost"] = 0
        with self.assertRaises(engine.Invalid): designer.evaluate(d,self.project)

    def test_shared_root_ball_default_covers_catalogue_and_custom_plants(self):
        draft = deepcopy(self.empty)
        for plant in self.empty["bundle"]["plant_dimensions"]["plants"]:
            e = self.run_edit(draft,kind="plant",id=plant["id"],enabled=True)
            draft = e["draft"]
        self.assertEqual(len(e["overlays"]),23)
        for overlays in e["overlays"].values():
            self.assertEqual(overlays["root_ball"]["diameter_m"],[.12,.12])
            self.assertEqual(overlays["root_ball"]["evidence"],"assumption")
            self.assertIsNone(overlays["root_ball"]["source"])
        custom = self.run_edit(self.empty,kind="custom",density=50,entry=dict(id="custom-root",label="Trial plant",group="shrub",quantity=1,unit_cost=2,price_confirmed=False))
        self.assertEqual(custom["overlays"]["custom-root"]["root_ball"]["diameter_m"],[.12,.12])

    def test_shared_root_ball_update_is_explicit_and_preserves_entered_dimensions(self):
        old = designer_v3.v2_draft(self.empty)
        old["bundle"] = json.loads((Path(__file__).parent/"fixtures"/"designer-v2-bundle.json").read_text(encoding="utf8"))
        del old["bundle"]["defaults"]["root_ball_default"]
        old["bundle"]["rules"] = [r for r in old["bundle"]["rules"] if r["id"] != "root_ball_default"]
        old["bundle"]["manifest"]["ruleset_id"] = "algarroba-designer-2026-10-29-v2"
        e = designer_v2.evaluate(old,self.project,dict(kind="plant",id="carob",enabled=True))
        self.assertIsNone(e["overlays"]["carob"]["root_ball"])
        updated = self.run_edit(e["draft"],kind="upgrade_rules")
        self.assertEqual(updated["overlays"]["carob"]["root_ball"]["diameter_m"],[.12,.12])
        self.assertEqual(updated["summary"],e["summary"])
        self.assertEqual(updated["draft"]["positions"],e["draft"]["positions"])
        measured = designer_v2.evaluate(e["draft"],self.project,dict(kind="dimension",id="carob",feature="root_ball",value=dict(diameter=.08,basis="measured",note="Supplier width")))
        retained = self.run_edit(measured["draft"],kind="upgrade_rules")
        self.assertEqual(retained["overlays"]["carob"]["root_ball"]["diameter_m"],[.08,.08])
        self.assertEqual(retained["overlays"]["carob"]["root_ball"]["evidence"],"measured")
        cleared = self.run_edit(retained["draft"],kind="dimension",id="carob",feature="root_ball",value=None)
        self.assertEqual(cleared["overlays"]["carob"]["root_ball"]["diameter_m"],[.12,.12])

    def test_shared_root_ball_default_rejects_missing_or_invalid_configuration(self):
        for change in [lambda b:b["defaults"].pop("root_ball_default"),lambda b:b["defaults"]["root_ball_default"].update(diameter_m=[0,0]),lambda b:b["defaults"]["root_ball_default"].update(evidence="guidance"),lambda b:b["rules"].pop()]:
            bundle = designer.load_bundle(); change(bundle)
            with self.assertRaises(engine.Invalid): designer.validate_bundle(bundle)


if __name__ == "__main__": unittest.main()
