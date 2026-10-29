"""Preparation and transfer never commit a demonstrator; lifecycle remains atomic."""
from copy import deepcopy
import json
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch
from uuid import uuid4
import unittest
from fastapi.testclient import TestClient
from backend import designer, engine, planning_draft
from backend.app import create_app
from backend.storage import Store, validate_export, Conflict
from test_designer_library import site


class PlanningDraftTests(unittest.TestCase):
    def setUp(self):
        self.folder=TemporaryDirectory();self.addCleanup(self.folder.cleanup)
        self.path=Path(self.folder.name)/"save.json"
        store=Store(self.path)
        store.mutate("import",0,str(uuid4()),dict(save=dict(format_version=4,project=site(),undo=None),confirm_replace=False))
        self.client=TestClient(create_app(self.path));self.addCleanup(self.client.close)
        self.project=self.client.get("/api/project").json();self.rev=self.project["revision"]

    def save_design(self,name="First",density=350):
        w=self.client.get("/api/designer").json();d=w["evaluation"]["draft"]
        d["physical"]["parcel_id"]=self.project["project"]["parcels"][0]["id"]
        d=designer.evaluate(d,self.project["project"],dict(kind="plant",id="carob",enabled=True))["draft"]
        d=designer.evaluate(d,self.project["project"],dict(kind="density",id="carob",value=density))["draft"]
        r=self.client.post("/api/designer/save",json=dict(revision=self.rev,design_revision=w["design_revision"],request_id=str(uuid4()),mode="create",design_id=None,name=name,draft=d))
        self.assertEqual(r.status_code,200,r.text);return r.json()

    def edit(self,**values):
        p=self.client.get("/api/demonstrator/draft").json()
        admin={k:v for k,v in p["draft"]["inputs"].items() if k not in designer.PHYSICAL};admin.update(values)
        body=dict(revision=self.rev,planning_revision=p["planning_revision"],request_id=str(uuid4()),administration=admin)
        r=self.client.post("/api/demonstrator/draft",json=body);self.assertEqual(r.status_code,200,r.text)
        return r.json(),body

    def handoff(self,w):
        p=self.client.get("/api/demonstrator/draft").json()
        body=dict(revision=self.rev,planning_revision=p["planning_revision"],design_revision=w["design_revision"])
        before=self.client.get("/api/export").json()
        r=self.client.post("/api/designer/handoff-preview",json=body);self.assertEqual(r.status_code,200,r.text)
        if before["project"]["demonstrator"] is None and (before["planning"] is None or before["planning"]["source"] is None):
            self.assertIsNone(r.json()["previous"])
        self.assertEqual(self.client.get("/api/export").json(),before)
        body["request_id"]=str(uuid4())
        r=self.client.post("/api/designer/handoff",json=body);self.assertEqual(r.status_code,200,r.text)
        return r.json(),body

    def commit(self,p):
        body=dict(revision=self.rev,planning_revision=p["planning_revision"],action_id="demonstrator",inputs=p["draft"]["inputs"],request_id=str(uuid4()))
        r=self.client.post("/api/commit",json=body);self.assertEqual(r.status_code,200,r.text)
        self.rev=r.json()["revision"];return r.json(),body

    def test_transfer_preserves_incomplete_administration_and_simulation_then_explicit_commit(self):
        self.edit(notes="Keep my study notes",labour_days="",funding_route="self_funded")
        w=self.save_design();before=self.client.get("/api/export").json()
        p,body=self.handoff(w)
        self.assertEqual(p["draft"]["inputs"]["labour_days"],"")
        self.assertEqual(p["draft"]["inputs"]["notes"],"Keep my study notes")
        self.assertEqual(p["draft"]["inputs"]["funding_route"],"self_funded")
        after=self.client.get("/api/export").json()
        for k in ["project","undo","designer","designer_undo"]:self.assertEqual(before[k],after[k])
        self.assertIsNone(after["project"]["demonstrator"])
        self.assertEqual(p["planting"]["trees"],7)
        again=self.client.post("/api/designer/handoff",json=body);self.assertEqual(again.json(),p)
        self.assertEqual(self.client.post("/api/preview",json=dict(revision=self.rev,action_id="demonstrator",inputs=p["draft"]["inputs"])).status_code,422)
        # Use the configured route; custom strings are saved but final validation owns acceptance.
        defaults=planning_draft.initial(after["project"])["inputs"]
        p,_=self.edit(labour_days=defaults["labour_days"],funding_route=defaults["funding_route"])
        committed,body=self.commit(p)
        self.assertEqual(committed["project"]["demonstrator"]["plan"]["trees"],7)
        self.assertTrue(committed["planning"]["committed"])
        applied=self.client.get("/api/export").json()["designer"]["applied"][0]
        self.assertEqual(applied["draft"],w["evaluation"]["draft"])
        duplicate=self.client.post("/api/commit",json=body);self.assertEqual(duplicate.status_code,200,duplicate.text)
        self.assertEqual(duplicate.json()["project"],committed["project"])
        self.assertEqual(len(self.client.get("/api/export").json()["designer"]["applied"]),1)

    def test_named_alternatives_and_restart_do_not_change_planning_snapshot(self):
        w=self.save_design();p,_=self.handoff(w)
        alternative=self.save_design("Alternative",100)
        self.assertEqual(self.client.get("/api/demonstrator/draft").json(),p)
        for operation,extra in [("rename",dict(name="Renamed",confirm=False)),("delete",dict(name=None,confirm=True))]:
            r=self.client.post("/api/designer/library",json=dict(revision=self.rev,design_revision=alternative["design_revision"],operation=operation,design_id=w["active_design_id"],request_id=str(uuid4()),**extra))
            self.assertEqual(r.status_code,200,r.text);alternative=r.json()
        self.assertEqual(self.client.get("/api/demonstrator/draft").json(),p)
        restored=Store(self.path).snapshot();self.assertEqual(restored["planning"],p["draft"])
        copy=Store(Path(self.folder.name)/"copy.json")
        copy.mutate("import",0,str(uuid4()),dict(save=self.client.get("/api/export").json(),confirm_replace=False))
        self.assertEqual(copy.snapshot()["planning"],p["draft"])

    def test_revision_validation_and_failed_writes_preserve_draft(self):
        w=self.save_design();p,_=self.handoff(w);saved=self.client.get("/api/export").json()
        stale=dict(revision=self.rev,planning_revision=p["planning_revision"]-1,request_id=str(uuid4()),administration={k:v for k,v in p["draft"]["inputs"].items() if k not in designer.PHYSICAL})
        self.assertEqual(self.client.post("/api/demonstrator/draft",json=stale).status_code,409)
        stale["planning_revision"]=p["planning_revision"];stale["administration"]["invented"]=1
        self.assertEqual(self.client.post("/api/demonstrator/draft",json=stale).status_code,422)
        self.assertEqual(self.client.get("/api/export").json(),saved)
        del stale["administration"]["invented"]
        for field,value in [("notes",None),("funding_route",12),("labour_days",True)]:
            malformed=deepcopy(stale);malformed["request_id"]=str(uuid4());malformed["administration"][field]=value
            self.assertEqual(self.client.post("/api/demonstrator/draft",json=malformed).status_code,422)
            self.assertEqual(self.client.get("/api/export").json(),saved)
        with patch.object(Store,"write",side_effect=OSError("Disk full")):
            self.assertEqual(self.client.post("/api/demonstrator/draft",json=stale).status_code,503)
        self.assertEqual(self.client.get("/api/export").json(),saved)
        self.edit(notes="Changed after review")
        r=self.client.post("/api/commit",json=dict(revision=self.rev,planning_revision=p["planning_revision"],action_id="demonstrator",inputs=p["draft"]["inputs"],request_id=str(uuid4())))
        self.assertEqual(r.status_code,409)
        for route in ["designer/apply","designer/apply-preview"]:self.assertEqual(self.client.post("/api/"+route,json={}).status_code,410)

    def test_ordinary_undo_keeps_edits_parcel_deletion_removes_draft_and_undo_restores(self):
        p,_=self.handoff(self.save_design());self.commit(p)
        p,_=self.edit(notes="Later planning edit")
        r=self.client.post("/api/undo",json=dict(revision=self.rev,request_id=str(uuid4())))
        self.assertEqual(r.status_code,200,r.text);self.rev=r.json()["revision"]
        self.assertEqual(r.json()["planning"]["draft"],p["draft"])
        pid=p["draft"]["inputs"]["parcel_id"]
        preview=self.client.post("/api/parcels/removal-preview",json=dict(revision=self.rev,parcel_id=pid))
        self.assertTrue(any(a["title"]=="Demonstrator planning draft" for a in preview.json()["removed_actions"]))
        r=self.client.post("/api/parcels/delete",json=dict(revision=self.rev,parcel_id=pid,confirm=True,request_id=str(uuid4())))
        self.assertEqual(r.status_code,200,r.text);self.rev=r.json()["revision"]
        self.assertIsNone(self.client.get("/api/export").json()["planning"])
        r=self.client.post("/api/undo",json=dict(revision=self.rev,request_id=str(uuid4())))
        self.assertEqual(r.status_code,200,r.text)
        self.assertEqual(r.json()["planning"]["draft"],p["draft"])

    def test_v6_backup_and_invalid_v7_import_are_explicit(self):
        old=self.client.get("/api/export").json()
        for k in ["planning","planning_revision","planning_undo"]:del old[k]
        old.update(format_version=6,receipts={},revision=self.rev,undo_edit=None)
        path=Path(self.folder.name)/"v6.json";original=json.dumps(old).encode();path.write_bytes(original)
        migrated=Store(path);self.assertIsNone(migrated.error)
        self.assertEqual(next(path.parent.glob("v6.schema-v6-*.json")).read_bytes(),original)
        self.assertIsNone(migrated.snapshot()["planning"])
        p,_=self.handoff(self.save_design())
        bad=self.client.get("/api/export").json();bad["planning"]["source"]["ruleset_hash"]="wrong"
        with self.assertRaises(engine.Invalid):validate_export(bad)


if __name__=="__main__":unittest.main()
