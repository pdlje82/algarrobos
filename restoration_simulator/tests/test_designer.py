"""Designer edits are reproducible, traceable and separate from simulation."""
from copy import deepcopy
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from uuid import uuid4
from fastapi.testclient import TestClient
from backend import designer, designer_library, engine
from backend.storage import Store, Conflict, validate_export
from backend.app import create_app


def site():
    p = engine.new_project("Designer pilot")
    values = {f["name"]:f["default"] for f in engine.land_form(p,"existing")["fields"]}
    values.update(route_id="existing",parcel_id="new",parcel_area=4500,covered_area=200)
    return engine.transition(p,"establish_access",values)[0]


def toggle(draft, p, collection, ident, enabled=True):
    return designer.evaluate(draft,p,dict(kind="toggle",collection=collection,id=ident,enabled=enabled))["draft"]


class DesignerRulesTests(unittest.TestCase):
    def setUp(self): self.project=site();self.draft=designer.new_draft(self.project)

    def test_empty_and_union_preserve_manual_edits_and_explicit_exclusions(self):
        original=deepcopy(self.project)
        e=designer.evaluate(self.draft,self.project); self.assertEqual(e["summary"]["plants"],0)
        d=toggle(self.draft,self.project,"approaches","mr1")
        d=designer.evaluate(d,self.project,dict(kind="density",id="carob",value=150))["draft"]
        selection=deepcopy(d["selection"]);selection["entries"][0].update(unit_cost=9.5,price_confirmed=True)
        d=designer.evaluate(d,self.project,dict(kind="selection",selection=selection))["draft"]
        d=toggle(d,self.project,"approaches","mr2")
        self.assertEqual(len(d["selection"]["entries"]),1)
        self.assertEqual(d["selection"]["entries"][0]["quantity"],3)
        self.assertEqual(d["selection"]["entries"][0]["unit_cost"],9.5)
        self.assertTrue(d["selection"]["entries"][0]["price_confirmed"])
        d=designer.evaluate(d,self.project,dict(kind="selection",selection=dict(version=2,entries=[])))["draft"]
        d=toggle(d,self.project,"combinations","system_woodland")
        self.assertIn("carob",[p["id"] for p in d["selection"]["entries"]])
        d=designer.evaluate(d,self.project,dict(kind="exclude",id="carob",enabled=True))["draft"]
        d=toggle(d,self.project,"combinations","system_arid")
        self.assertNotIn("carob",[p["id"] for p in d["selection"]["entries"]])
        self.assertEqual(self.project,original)

    def test_feature_removal_distinguishes_automatic_and_manual_members(self):
        e=designer.evaluate(self.draft,self.project,dict(kind="patch",section="pocket",values=dict(enabled=True)))
        self.assertEqual(e["draft"]["selection"]["entries"][0]["id"],"holm_oak")
        removed=designer.evaluate(e["draft"],self.project,dict(kind="patch",section="pocket",values=dict(enabled=False)))
        self.assertEqual(removed["removed"][0]["id"],"holm_oak")
        manual=toggle(e["draft"],self.project,"manual_ids","holm_oak")
        kept=designer.evaluate(manual,self.project,dict(kind="patch",section="pocket",values=dict(enabled=False)))
        self.assertEqual(kept["summary"]["trees"],1)
        self.assertEqual(kept["summary"]["unplaced"],1)

    def test_layout_and_reports_are_deterministic_with_source_trace(self):
        d=toggle(self.draft,self.project,"combinations","coscoja_series")
        a=designer.evaluate(d,self.project);b=designer.evaluate(d,self.project)
        self.assertEqual(a,b)
        self.assertEqual(a["summary"]["placed"]+a["summary"]["unplaced"],a["summary"]["plants"])
        self.assertTrue(a["reasons"])
        self.assertEqual(a["draft"]["bundle"]["vegetation_combinations"][3]["sources"][0]["id"],"FOREST-003")
        key=a["instances"][0]["id"]
        c=designer.evaluate(d,self.project,dict(kind="position",id=key,x=2,y=2))
        with self.assertRaisesRegex(engine.Invalid,"Unsupported designer command"):
            designer.evaluate(c["draft"],self.project,dict(kind="rearrange"))
        c=designer.evaluate(c["draft"],self.project)
        self.assertEqual(c["draft"]["positions"][key],dict(x=2,y=2,manual=True))

    def test_unknown_configuration_and_versions_fail_explicitly(self):
        for edit in [lambda b:b["rules"][0].update(effect="predict_survival"),lambda b:b["rules"][0]["sources"][0].update(id="missing"),lambda b:b["manifest"].update(version=4),lambda b:b["vegetation_combinations"][0]["starter"].append("imaginary")]:
            b=designer.load_bundle();edit(b)
            with self.assertRaises(engine.Invalid):designer.validate_bundle(b)
        d=deepcopy(self.draft);d["hidden_default"]=False
        with self.assertRaises(engine.Invalid):designer.validate_draft(d)

    def test_saved_rules_are_not_replaced_by_current_bundle(self):
        d=toggle(self.draft,self.project,"approaches","mr1")
        current=designer.load_bundle();current["manifest"]["ruleset_id"]="reviewed-v2";current["defaults"]["density_defaults"]["carob"]=900
        with patch.object(designer,"load_bundle",return_value=current), patch.object(designer.current,"load_bundle",return_value=current):
            w=designer.workspace(self.project,designer_library.migrate_v5(dict(draft=d,applied=[]),self.project),1)
            self.assertTrue(w["rules_update_available"])
            self.assertEqual(w["evaluation"]["draft"]["bundle"],d["bundle"])
            updated=designer.evaluate(d,self.project,dict(kind="upgrade_rules"))
            self.assertEqual(updated["draft"]["bundle"]["manifest"]["ruleset_id"],"reviewed-v2")
            self.assertEqual(updated["summary"]["plants"],7)

    def test_large_quantities_remain_counted_and_invalid_positions_fail(self):
        d=toggle(self.draft,self.project,"approaches","mr1")
        e=designer.evaluate(d,self.project,dict(kind="density",id="carob",value=50000))
        self.assertEqual(e["summary"]["plants"],1000)
        self.assertGreater(e["summary"]["unplaced"],0)
        self.assertEqual(e["summary"]["plant_cost"],6000)
        bad=deepcopy(e["draft"]);bad["positions"]["imaginary:0"]={"x":1,"y":1,"manual":True}
        with self.assertRaisesRegex(engine.Invalid,"Unknown plant position"):designer.validate_draft(bad)
        with self.assertRaises(engine.Invalid):designer.evaluate(e["draft"],self.project,dict(kind="position",id="carob:0",x=-1,y=2))

    def test_mulch_materials_have_independent_rule_identity(self):
        b=deepcopy(self.draft["bundle"])
        r=deepcopy(next(r for r in b["rules"] if r["id"]=="stone_mulch"))
        r.update(id="experimental_organic_mulch",description="Test-only rule, not real guidance.",evidence="assumption")
        b["rules"].append(r)
        b["treatments"].append(dict(id="test_organic",label="Test material",rule=r["id"],pattern="organic",description="Test-only material"))
        designer.validate_bundle(b)
        self.assertEqual(next(t for t in b["treatments"] if t["id"]=="stone")["rule"],"stone_mulch")
        b["treatments"][-1]["rule"]="absent"
        with self.assertRaises(engine.Invalid):designer.validate_bundle(b)

    def test_bad_data_is_actionable_and_custom_removal_is_explicit(self):
        d=deepcopy(self.draft);del d["selection"]
        with self.assertRaisesRegex(engine.Invalid,"designer"):designer.evaluate(d,self.project)
        row=dict(id="custom-local",label="Local trial plant",group="shrub",quantity=2,unit_cost=0.1,price_confirmed=False)
        e=designer.evaluate(self.draft,self.project,dict(kind="custom",entry=row,density=100))
        self.assertEqual(e["summary"]["plant_cost"],0.2)
        removed=designer.evaluate(e["draft"],self.project,dict(kind="selection",selection=dict(version=2,entries=[])))
        self.assertEqual(removed["removed"][0]["id"],row["id"])


class DesignerPersistenceTests(unittest.TestCase):
    def setup_store(self,path):
        s=Store(path)
        s.mutate("import",0,str(uuid4()),dict(save=dict(format_version=4,project=site(),undo=None),confirm_replace=False))
        return s

    def test_atomic_save_revision_retries_and_restart_do_not_touch_project(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/"save.json";s=self.setup_store(path);before=s.snapshot()
            draft=toggle(designer.new_draft(before["project"]),before["project"],"approaches","mr1")
            ident=str(uuid4());s.save_designer(draft,before["revision"],0,ident,mode="create",design_id=None,name="Test design")
            after=s.snapshot();self.assertEqual(before["project"],after["project"]);self.assertEqual(before["undo"],after["undo"])
            self.assertEqual(after["designer_revision"],1)
            s.save_designer(draft,before["revision"],0,ident,mode="create",design_id=None,name="Test design");self.assertEqual(s.snapshot(),after)
            with self.assertRaises(Conflict):s.save_designer(draft,before["revision"],0,str(uuid4()),mode="create",design_id=None,name="Another")
            with patch.object(s,"write",side_effect=OSError("disk full")):
                with self.assertRaises(OSError):s.save_designer(draft,before["revision"],1,str(uuid4()),mode="update",design_id=after["designer"]["active_id"],name=None)
            self.assertEqual(s.snapshot(),after)
            self.assertEqual(Store(path).snapshot(),after)
            self.assertEqual(validate_export(s.export())["designer"],after["designer"])

    def test_apply_preview_commit_undo_and_parcel_delete(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/"save.json";s=self.setup_store(path)
            with TestClient(create_app(path)) as c:
                w=c.get("/api/designer").json();self.assertIn("evaluation",w)
                draft=w["evaluation"]["draft"]
                draft["physical"]["parcel_id"]=s.snapshot()["project"]["parcels"][0]["id"]
                e=c.post("/api/designer/preview",json=dict(revision=w["project_revision"],draft=draft,command=dict(kind="toggle",collection="approaches",id="mr1",enabled=True)))
                self.assertEqual(e.status_code,200,e.text)
                e=c.post("/api/designer/preview",json=dict(revision=w["project_revision"],draft=e.json()["draft"],command=dict(kind="plant",id="lentisk",enabled=True)))
                self.assertEqual(e.status_code,200,e.text)
                links=e.json()["draft"]["associations"]
                self.assertEqual(len(links),7)
                saved=c.post("/api/designer/save",json=dict(revision=w["project_revision"],design_revision=0,request_id=str(uuid4()),draft=e.json()["draft"],mode="create",design_id=None,name="Test design"))
                self.assertEqual(saved.status_code,200,saved.text)
                admin={f["name"]:f["default"] for f in w["fields"] if f["name"] not in designer.PHYSICAL}
                planning=c.get("/api/demonstrator/draft").json()
                body=dict(revision=w["project_revision"],design_revision=1,planning_revision=planning["planning_revision"])
                preview=c.post("/api/designer/handoff-preview",json=body);self.assertEqual(preview.status_code,200,preview.text)
                handed=c.post("/api/designer/handoff",json={**body,"request_id":str(uuid4())});self.assertEqual(handed.status_code,200,handed.text)
                planning=handed.json()
                applied=c.post("/api/commit",json=dict(revision=w["project_revision"],planning_revision=planning["planning_revision"],action_id="demonstrator",inputs=planning["draft"]["inputs"],request_id=str(uuid4())));self.assertEqual(applied.status_code,200,applied.text)
                data=applied.json();self.assertEqual(data["project"]["demonstrator"]["plan"]["trees"],7)
                self.assertEqual(data["project"]["demonstrator"]["plan"]["shrubs"],7)
                self.assertEqual(len(c.get("/api/designer/report").json()["design"]["applied"]),1)
                self.assertEqual(c.get("/api/designer/report").json()["design"]["applied"][0]["draft"]["associations"],links)
                self.assertEqual(c.get("/api/designer/sources/FOREST-003").status_code,200)
                # A subsequent saved draft must survive undo of the plan application.
                edited=c.get("/api/designer").json()["evaluation"]["draft"]
                edited=designer.evaluate(edited,s.snapshot()["project"],dict(kind="density",id="carob",value=100))["draft"]
                res=c.post("/api/designer/save",json=dict(revision=data["revision"],design_revision=1,request_id=str(uuid4()),draft=edited,mode="update",design_id=saved.json()["active_design_id"],name=None))
                self.assertEqual(res.status_code,200,res.text)
                undo=c.post("/api/undo",json=dict(revision=data["revision"],request_id=str(uuid4())));self.assertEqual(undo.status_code,200,undo.text)
                data=undo.json();self.assertIsNone(data["project"]["demonstrator"])
                self.assertEqual(c.get("/api/designer").json()["evaluation"]["summary"]["plants"],9)
                pid=data["project"]["parcels"][0]["id"]
                removal=c.post("/api/parcels/removal-preview",json=dict(revision=data["revision"],parcel_id=pid));self.assertEqual(removal.status_code,200,removal.text)
                self.assertTrue(any("Designer" in a["title"] for a in removal.json()["removed_actions"]))
                deleted=c.post("/api/parcels/delete",json=dict(revision=data["revision"],request_id=str(uuid4()),parcel_id=pid,confirm=True));self.assertEqual(deleted.status_code,200,deleted.text)
                self.assertIsNone(c.get("/api/export").json()["designer"])
                restored=c.post("/api/undo",json=dict(revision=deleted.json()["revision"],request_id=str(uuid4())));self.assertEqual(restored.status_code,200,restored.text)
                self.assertTrue(c.get("/api/designer").json()["saved"])
                self.assertEqual(c.get("/api/designer").json()["evaluation"]["draft"],edited)

    def test_envelope4_migrates_with_backup(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/"save.json";p=site()
            old=dict(format_version=4,project=p,undo=None,undo_edit=None,receipts={},revision=p["revision"])
            original=json.dumps(old).encode();path.write_bytes(original)
            s=Store(path);self.assertEqual(s.snapshot()["project"],p)
            self.assertEqual(next(Path(folder).glob("*.schema-v4-*.json")).read_bytes(),original)
            self.assertEqual(json.loads(path.read_text(encoding="utf-8"))["format_version"], 7)
