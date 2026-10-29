"""Ephemeral presentation facts must follow pinned designs without changing them."""
from copy import deepcopy
import json
from pathlib import Path
import unittest

from backend import designer, designer_v2, designer_v3, engine


class DesignerDisplayTests(unittest.TestCase):
    def setUp(self):
        self.project = engine.new_project("Display fixture")
        self.empty = designer.new_draft(self.project)

    def edit(self, draft, **command):
        return designer.evaluate(draft, self.project, command)

    def pocket(self):
        return self.edit(self.empty, kind="patch", section="pocket", values={"enabled": True})

    def test_pocket_uses_actual_dimensions_and_tree_state(self):
        e = self.pocket()
        self.assertEqual(e["display"]["pocket"]["state"], "linked")
        self.assertTrue(e["display"]["pocket"]["moves_with_pocket"])
        self.assertEqual(e["display"]["pocket"]["crown_diameter"], 10)
        self.assertEqual(e["display"]["pocket"]["radius"], 2)
        self.assertEqual(e["display"]["pocket"]["extra_quantity"], 0)
        e = self.edit(e["draft"],kind="plant",id="carob",enabled=True)
        e = self.edit(e["draft"],kind="plant",id="lentisk",enabled=True)
        self.assertEqual(e["display"]["pocket"]["example_id"],"holm_oak:0")
        e = self.edit(e["draft"], kind="dimension", id="holm_oak", feature="crown", value=dict(diameter=8,basis="measured",note="Supplied dimension"))
        e = self.edit(e["draft"], kind="patch", section="pocket", values={"radius": 3})
        self.assertEqual(e["display"]["pocket"]["crown_diameter"], 8)
        self.assertEqual(e["display"]["pocket"]["radius"], 3)
        e = self.edit(e["draft"],kind="density",id="holm_oak",value=150)
        self.assertEqual(e["display"]["pocket"]["extra_quantity"], 2)
        e = self.edit(e["draft"],kind="position",id="holm_oak:0",x=3,y=3)
        self.assertEqual(e["display"]["pocket"]["state"], "independent")
        self.assertFalse(e["display"]["pocket"]["moves_with_pocket"])
        e = self.edit(e["draft"],kind="plant",id="holm_oak",enabled=False)
        self.assertEqual(e["display"]["pocket"]["state"], "absent")

    def test_unplaced_and_off_are_explicit(self):
        e = self.edit(self.pocket()["draft"],kind="position",id="holm_oak:0",x=13,y=13)
        e = self.edit(e["draft"],kind="resize",axis="width",length=4)
        self.assertEqual(e["display"]["pocket"]["state"], "unplaced")
        self.assertFalse(e["display"]["pocket"]["plotted"])
        self.assertEqual(e["display"]["pocket"]["example_id"],"holm_oak:0")
        self.assertTrue(e["display"]["unplaced"])
        e = self.edit(e["draft"],kind="patch",section="pocket",values={"enabled":False})
        self.assertEqual(e["display"]["pocket"]["state"], "off")

    def test_every_species_and_custom_zero_count_has_editor_without_mutation(self):
        for plant in designer.planting.catalogue()["plants"]:
            e = self.edit(self.empty,kind="plant",id=plant["id"],enabled=True)
            before = deepcopy(e["draft"])
            again = designer.evaluate(before,self.project)
            facts = again["display"]["crown_editors"][plant["id"]]
            self.assertEqual(facts["value"],before["bundle"]["defaults"]["mature_diameters"][plant["id"]])
            self.assertEqual(facts["basis"],"assumption")
            self.assertEqual(facts["note"],"")
            self.assertFalse(facts["has_override"])
            self.assertEqual(again["draft"],before)
        for group,expected in [("tree",6),("shrub",2),("grass",.6)]:
            e = self.edit(self.empty,kind="custom",density=1,entry=dict(id="custom-"+group,label=group,group=group,quantity=1,unit_cost=3,price_confirmed=False))
            self.assertEqual(e["summary"]["plants"],0)
            self.assertEqual(e["display"]["crown_editors"]["custom-"+group]["value"],expected)

    def test_saved_basis_note_and_configured_default_remain_distinct(self):
        e = self.edit(self.empty,kind="plant",id="carob",enabled=True)
        e = self.edit(e["draft"],kind="dimension",id="carob",feature="crown",value=dict(diameter=9,basis="measured",note="Measured on site"))
        facts = e["display"]["crown_editors"]["carob"]
        self.assertEqual((facts["value"],facts["default_value"],facts["basis"],facts["note"]),(9,6,"measured","Measured on site"))
        e = self.edit(e["draft"],kind="dimension",id="carob",feature="crown",value=None)
        self.assertEqual(e["display"]["crown_editors"]["carob"]["value"],6)

    def test_historical_defaults_ranges_and_rules_are_not_rewritten(self):
        bundle = json.loads(Path("tests/fixtures/designer-v2-bundle.json").read_text(encoding="utf-8"))
        old = designer_v3.v2_draft(self.empty)
        old["bundle"] = bundle
        old = designer_v2.evaluate(old,self.project,dict(kind="plant",id="carob",enabled=True))["draft"]
        before = deepcopy(old)
        e = designer.evaluate(old,self.project)
        self.assertEqual(e["draft"],before)
        self.assertEqual(e["display"]["density_defaults"],dict(carob=350,tree=50,shrub=50,grass=50))
        facts = e["display"]["crown_editors"]["carob"]
        self.assertFalse(facts["editable"])
        if facts["range"][0] != facts["range"][1]:
            self.assertIsNone(facts["value"])
            self.assertIsNone(facts["default_value"])
