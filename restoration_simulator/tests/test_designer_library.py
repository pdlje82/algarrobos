"""Named snapshots, migrations and library mutations never change simulation state."""
from copy import deepcopy
import json
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch
from uuid import uuid4
import unittest
from fastapi.testclient import TestClient

from backend import designer, designer_library, designer_v2, designer_v3, engine
from backend.app import create_app
from backend.storage import Store, Conflict, validate_export


def site():
    p=engine.new_project("Named designs")
    v={f["name"]:f["default"] for f in engine.land_form(p,"existing")["fields"]}
    v.update(route_id="existing",parcel_id="new",parcel_area=4500,covered_area=4500)
    return engine.transition(p,"establish_access",v)[0]


class NamedDesignTests(unittest.TestCase):
    def setUp(self):
        self.folder=TemporaryDirectory();self.addCleanup(self.folder.cleanup)
        self.path=Path(self.folder.name)/"save.json"
        self.store=Store(self.path)
        self.store.mutate("import",0,str(uuid4()),dict(save=dict(format_version=4,project=site(),undo=None),confirm_replace=False))
        self.client=TestClient(create_app(self.path));self.addCleanup(self.client.close)
        self.project=self.client.get("/api/project").json()
        self.rev=self.project["revision"]
        self.w=self.client.get("/api/designer").json()
        self.assertIn("evaluation",self.w,self.w)

    def edit(self,draft,**command):
        r=self.client.post("/api/designer/preview",json=dict(revision=self.rev,draft=draft,command=command))
        self.assertEqual(r.status_code,200,r.text)
        return r.json()["draft"]

    def save(self,draft,name=None,mode="create",design_id=None,request_id=None,status=200):
        r=self.client.post("/api/designer/save",json=dict(revision=self.rev,design_revision=self.w["design_revision"],request_id=str(uuid4()) if request_id is None else request_id,draft=draft,mode=mode,design_id=design_id,name=name))
        self.assertEqual(r.status_code,status,r.text)
        if status==200:self.w=r.json()
        return r

    def operation(self,operation,design_id=None,name=None,confirm=False,status=200):
        r=self.client.post("/api/designer/library",json=dict(revision=self.rev,design_revision=self.w["design_revision"],request_id=str(uuid4()),operation=operation,design_id=design_id,name=name,confirm=confirm))
        self.assertEqual(r.status_code,status,r.text)
        if status==200:self.w=r.json()
        return r

    def planted(self):
        d=self.w["evaluation"]["draft"]
        d=self.edit(d,kind="plant",id="carob",enabled=True)
        d=self.edit(d,kind="plant",id="lentisk",enabled=True)
        d=self.edit(d,kind="position",id="carob:0",x=5,y=5)
        d=self.edit(d,kind="dimension",id="carob",feature="crown",value=dict(diameter=7,basis="assumption",note="Trial"))
        return d

    def test_create_update_save_as_and_load_exact_snapshots_after_restart(self):
        d=self.planted()
        self.save(d,"First");first=self.w["active_design_id"]
        changed=self.edit(d,kind="density",id="carob",value=100)
        self.save(changed,"Alternative");second=self.w["active_design_id"]
        self.assertNotEqual(first,second)
        reopened=Store(self.path).snapshot()
        self.assertEqual(reopened["format_version"],6)
        records={r["id"]:r for r in reopened["designer"]["designs"]}
        self.assertEqual(records[first]["draft"],d);self.assertEqual(records[second]["draft"],changed)
        self.operation("load",first);self.assertEqual(self.w["evaluation"]["draft"],d)
        renamed=self.edit(d,kind="density",id="carob",value=200)
        self.save(renamed,mode="update",design_id=first)
        self.operation("load",second);self.assertEqual(self.w["evaluation"]["draft"],changed)
        self.assertEqual(self.client.get("/api/project").json()["project"],self.project["project"])
        self.assertEqual(self.client.get("/api/project").json()["revision"],self.rev)

    def test_names_trim_casefold_validate_and_rename_without_changing_snapshot(self):
        d=self.planted();self.save(d,"  Oaks and carobs  ");ident=self.w["active_design_id"]
        self.assertEqual(self.w["library"][0]["name"],"Oaks and carobs")
        for value in ["OAKS AND CAROBS","   ","x"*81]:
            self.save(d,value,status=422)
        self.operation("rename",ident,"Southern garden")
        self.assertEqual(self.w["evaluation"]["draft"],d)
        self.assertEqual(self.w["library"][0]["name"],"Southern garden")
        self.save(d,"Another");other=self.w["active_design_id"]
        self.operation("rename",other,"southern garden",status=422)
        self.operation("rename",other,"Another renamed")
        self.assertEqual([r["name"] for r in self.w["library"]],["Another renamed","Southern garden"])

    def test_clear_removes_all_plant_memory_and_is_undoable_without_changing_saved_copy(self):
        d=self.planted()
        d=self.edit(d,kind="patch",section="pocket",values=dict(enabled=True))
        d=self.edit(d,kind="patch",section="mulch",values=dict(enabled=True,plant_ids=["carob"]))
        d=self.edit(d,kind="existing",plants=[dict(id="existing",species="carob",x=8,y=8,radius=1)])
        d=self.edit(d,kind="exclude",id="thyme",enabled=True)
        d=self.edit(d,kind="custom",density=50,entry=dict(id="custom-trial",group="shrub",label="Trial",quantity=1,unit_cost=4,price_confirmed=True))
        self.save(d,"Populated")
        cleared=self.edit(d,kind="clear")
        for key in ["physical","zone","site","bundle"]:self.assertEqual(cleared[key],d[key])
        for key in ["positions","preferences","associations","dimensions","displaced","placement_notes","placement_preferences","radii","dismissed"]:
            self.assertEqual(cleared[key],{})
        for key in ["approaches","combinations","optional_members","manual_ids","exclusions","legacy_exclusions","existing","unplaced","placement_seen"]:
            self.assertEqual(cleared[key],[])
        self.assertEqual(cleared["overrides"],[dict(kind="clear")])
        self.assertFalse(cleared["pocket"]["enabled"]);self.assertFalse(cleared["mulch"]["enabled"])
        self.assertEqual(cleared["selection"]["entries"],[])
        self.assertEqual(self.client.get("/api/designer").json()["evaluation"]["draft"],d)
        restored=self.client.post("/api/designer/preview",json=dict(revision=self.rev,draft=d))
        self.assertEqual(restored.json()["draft"],d)
        again=self.edit(cleared,kind="plant",id="lentisk",enabled=True)
        self.assertEqual(again["preferences"]["lentisk"]["density"],350)

    def test_new_delete_and_unnamed_apply_are_separate(self):
        d=self.planted();self.save(d,"Keep");ident=self.w["active_design_id"]
        self.operation("new")
        self.assertIsNone(self.w["active_design_id"]);self.assertFalse(self.w["saved"])
        self.assertEqual(self.w["evaluation"]["draft"]["physical"]["restoration_area"],200)
        self.assertIsNone(self.w["evaluation"]["draft"]["physical"]["parcel_id"])
        self.assertEqual(self.w["evaluation"]["summary"]["plants"],0)
        self.assertEqual(len(self.w["library"]),1)
        admin={f["name"]:f["default"] for f in self.w["fields"] if f["name"] not in designer.PHYSICAL}
        r=self.client.post("/api/designer/apply-preview",json=dict(revision=self.rev,design_revision=self.w["design_revision"],administration=admin))
        self.assertEqual(r.status_code,422)
        self.operation("load",ident)
        self.operation("delete",ident,status=422)
        self.operation("delete",ident,confirm=True)
        self.assertEqual(self.w["library"],[]);self.assertIsNone(self.w["active_design_id"])
        self.assertEqual(self.client.get("/api/designer/report").status_code,422)

    def test_export_import_and_unknown_ids_do_not_replace_saved_data(self):
        d=self.planted();self.save(d,"One");self.save(d,"Two")
        before=self.client.get("/api/export").json()
        self.operation("load",str(uuid4()),status=422)
        self.assertEqual(self.client.get("/api/export").json(),before)
        target=Store(Path(self.folder.name)/"copy.json")
        target.mutate("import",0,str(uuid4()),dict(save=before,confirm_replace=False))
        self.assertEqual(target.snapshot()["designer"],before["designer"])
        bad=deepcopy(before);bad["designer"]["designs"][1]["id"]=bad["designer"]["designs"][0]["id"]
        with self.assertRaises(engine.Invalid):validate_export(bad)
        bad=deepcopy(before);bad["designer"]["active_id"]=str(uuid4())
        with self.assertRaises(engine.Invalid):validate_export(bad)
        for version in [5.0,6.0,True]:
            bad=deepcopy(before);bad["format_version"]=version
            with self.assertRaises(engine.Invalid):validate_export(bad)

    def test_applied_snapshot_survives_alternative_deletion(self):
        d=self.planted();d["physical"]["parcel_id"]=self.project["project"]["parcels"][0]["id"]
        self.save(d,"Applied")
        ident=self.w["active_design_id"]
        admin={f["name"]:f["default"] for f in self.w["fields"] if f["name"] not in designer.PHYSICAL}
        r=self.client.post("/api/designer/apply",json=dict(revision=self.rev,design_revision=self.w["design_revision"],administration=admin,request_id=str(uuid4())))
        self.assertEqual(r.status_code,200,r.text);self.rev=r.json()["revision"]
        self.w=self.client.get("/api/designer").json()
        self.operation("delete",ident,confirm=True)
        exported=self.client.get("/api/export").json()
        self.assertEqual(exported["designer"]["applied"][0]["origin"],dict(id=ident,name="Applied"))
        self.assertEqual(exported["designer"]["applied"][0]["draft"],d)
        self.assertIsNotNone(exported["project"]["demonstrator"])

    def test_parcel_delete_lists_named_alternatives_preserves_unlinked_and_undo_restores(self):
        d=self.planted();d["physical"]["parcel_id"]=self.project["project"]["parcels"][0]["id"]
        self.save(d,"Linked A");self.save(d,"Linked B")
        d["physical"]["parcel_id"]=None;self.save(d,"Unlinked")
        before=self.client.get("/api/export").json()["designer"]
        pid=self.project["project"]["parcels"][0]["id"]
        preview=self.client.post("/api/parcels/removal-preview",json=dict(revision=self.rev,parcel_id=pid))
        titles=[r["title"] for r in preview.json()["removed_actions"]]
        self.assertTrue(any("Linked A" in t for t in titles));self.assertTrue(any("Linked B" in t for t in titles))
        r=self.client.post("/api/parcels/delete",json=dict(revision=self.rev,parcel_id=pid,request_id=str(uuid4()),confirm=True))
        self.assertEqual(r.status_code,200,r.text)
        current=self.client.get("/api/export").json()
        self.assertEqual([r["name"] for r in current["designer"]["designs"]],["Unlinked"])
        self.assertIsNone(current["undo"])
        undo=self.client.post("/api/undo",json=dict(revision=r.json()["revision"],request_id=str(uuid4())))
        self.assertEqual(undo.status_code,200,undo.text)
        self.assertEqual(self.client.get("/api/export").json()["designer"],before)

    def test_ordinary_project_undo_keeps_later_named_saves(self):
        d=self.planted();d["physical"]["parcel_id"]=self.project["project"]["parcels"][0]["id"]
        self.save(d,"Applied")
        admin={f["name"]:f["default"] for f in self.w["fields"] if f["name"] not in designer.PHYSICAL}
        r=self.client.post("/api/designer/apply",json=dict(revision=self.rev,design_revision=self.w["design_revision"],administration=admin,request_id=str(uuid4())))
        self.assertEqual(r.status_code,200,r.text);self.rev=r.json()["revision"]
        self.w=self.client.get("/api/designer").json()
        later=self.edit(d,kind="density",id="carob",value=100)
        self.save(later,"Later alternative")
        before=self.client.get("/api/export").json()["designer"]
        undo=self.client.post("/api/undo",json=dict(revision=self.rev,request_id=str(uuid4())))
        self.assertEqual(undo.status_code,200,undo.text)
        after=self.client.get("/api/export").json()["designer"]
        self.assertEqual(after["designs"],before["designs"])
        self.assertEqual(after["draft"],later)
        self.assertEqual(after["active_id"],before["active_id"])
        self.assertEqual(after["applied"],[])


class LibraryStoreTests(unittest.TestCase):
    def test_invalid_v5_migration_preserves_original_and_new_project_replaces_library(self):
        p=site();d=designer.new_draft(p)
        with TemporaryDirectory() as folder:
            path=Path(folder)/"bad.json"
            raw=dict(format_version=5,project=p,undo=None,undo_edit=None,designer=dict(draft=d,applied=[]),designer_revision=1,designer_undo=None,receipts={},revision=p["revision"])
            del raw["designer"]["draft"]["positions"]
            original=json.dumps(raw).encode();path.write_bytes(original)
            bad=Store(path);self.assertIsNotNone(bad.error)
            self.assertEqual(path.read_bytes(),original)
            self.assertEqual(list(Path(folder).glob("*.schema-v5-*.json")),[])
            s=Store(Path(folder)/"good.json")
            s.mutate("import",0,str(uuid4()),dict(save=dict(format_version=4,project=p,undo=None),confirm_replace=False))
            before=s.snapshot();d=designer.new_draft(before["project"])
            s.save_designer(d,before["revision"],0,str(uuid4()),mode="create",design_id=None,name="Old project design")
            saved=s.snapshot()
            s.mutate("new",saved["revision"],str(uuid4()),dict(name="Replacement project",confirm_replace=True))
            self.assertIsNone(s.snapshot()["designer"])

    def test_v5_migration_preserves_historical_bundle_and_makes_byte_backup(self):
        p=site();d=designer_v3.v2_draft(designer.new_draft(p))
        d["bundle"]=json.loads((Path(__file__).parent/"fixtures"/"designer-v2-bundle.json").read_text(encoding="utf8"))
        d=designer_v2.evaluate(d,p,dict(kind="plant",id="carob",enabled=True))["draft"]
        raw=dict(format_version=5,project=p,undo=None,undo_edit=None,designer=dict(draft=d,applied=[]),designer_revision=3,designer_undo=None,receipts={},revision=p["revision"])
        with TemporaryDirectory() as folder:
            path=Path(folder)/"old.json";original=json.dumps(raw).encode();path.write_bytes(original)
            s=Store(path);self.assertIsNone(s.error)
            self.assertEqual(next(Path(folder).glob("*.schema-v5-*.json")).read_bytes(),original)
            value=s.snapshot();self.assertEqual(value["format_version"],6)
            self.assertEqual(value["designer"]["designs"][0]["name"],"Current design")
            self.assertEqual(value["designer"]["draft"],d)
            self.assertEqual(Store(path).snapshot(),value)

    def test_library_failures_conflicts_and_retries_are_atomic_and_idempotent(self):
        with TemporaryDirectory() as folder:
            s=Store(Path(folder)/"save.json")
            s.mutate("import",0,str(uuid4()),dict(save=dict(format_version=4,project=site(),undo=None),confirm_replace=False))
            before=s.snapshot();d=designer.new_draft(before["project"]);rid=str(uuid4())
            args=(d,before["revision"],0,rid)
            s.save_designer(*args,mode="create",design_id=None,name="One");saved=s.snapshot()
            s.save_designer(*args,mode="create",design_id=None,name="One");self.assertEqual(s.snapshot(),saved)
            with self.assertRaises(Conflict):s.designer_library("new",before["revision"],0,str(uuid4()),design_id=None,name=None,confirm=False)
            with patch.object(s,"write",side_effect=OSError("disk full")):
                with self.assertRaises(OSError):s.designer_library("new",before["revision"],1,str(uuid4()),design_id=None,name=None,confirm=False)
            self.assertEqual(s.snapshot(),saved)
            self.assertEqual(Store(s.path).snapshot(),saved)
            for key in ["project","revision","undo","undo_edit","designer_undo"]:self.assertEqual(saved[key],before[key])


if __name__=="__main__":unittest.main()

