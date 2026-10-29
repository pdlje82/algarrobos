"""Exploratory removal purges committed records, never parcels or saved drafts."""
from copy import deepcopy
import json
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch
from uuid import uuid4
import unittest
from fastapi.testclient import TestClient
from backend import engine, legacy, demonstrator_removal, designer
from backend.app import create_app
from backend.storage import Store, validate_export
from test_demonstrator import site, planned, baseline, evaluated, step
from test_parcel_removal import add
from planning_helpers import stage_plan


class DemonstratorRemovalRulesTests(unittest.TestCase):
    def test_planned_baseline_and_paid_pilot_remove_only_committed_dependencies(self):
        for state in [planned(),baseline(planned()),step(evaluated(True),"receive_payment",eligibility_confirmed="confirmed",basis="illustrative")]:
            with self.subTest(stage=state["demonstrator"]["status"]):
                original=deepcopy(state);preview=demonstrator_removal.plan(state)
                self.assertEqual(state,original);self.assertTrue(preview["can_remove"])
                after=demonstrator_removal.delete(state)
                self.assertIsNone(after["demonstrator"])
                self.assertEqual(after["grant"],dict(status="not_applied",amount=0))
                self.assertEqual(after["parcels"],state["parcels"])
                self.assertEqual(after["agreements"],state["agreements"])
                self.assertEqual(after["activities"],[])
                self.assertNotIn('"action_id": "demonstrator"',json.dumps(after))
                self.assertNotIn("Illustrative public results report",json.dumps(after))
                self.assertEqual(engine.validate_state(after),after)
                self.assertEqual(after["cash"],preview["cash_after"])
                if state["demonstrator"]["status"]=="evaluated":
                    self.assertTrue(any(a["title"]=="Record the reimbursement" for a in preview["removed_actions"]))

    def test_later_independent_parcels_and_fixed_advance_remain(self):
        state=add(evaluated(),name="Independent later finca")
        after=demonstrator_removal.delete(state)
        self.assertEqual(after["parcels"],state["parcels"])
        self.assertEqual(after["time"],state["history"][4]["inputs"]["target_year"])
        self.assertEqual([h["action_id"] for h in after["history"]],["establish_access","advance","establish_access"])
        self.assertEqual(engine.validate_state(after),after)

    def test_dependent_land_blocks_removal_with_a_readable_preview(self):
        state=add(step(evaluated(),"company"),name="Company-owned finca",owner_id="company",holder_id="company",operator_id="company")
        before=deepcopy(state);preview=demonstrator_removal.plan(state)
        self.assertFalse(preview["can_remove"])
        self.assertIn("Company-owned finca",preview["blocked_reason"])
        with self.assertRaises(engine.Invalid):demonstrator_removal.delete(state)
        self.assertEqual(state,before)

    def test_no_demonstrator_and_nested_legacy_history_are_explicit(self):
        with self.assertRaises(engine.Invalid):demonstrator_removal.plan(site())
        old=legacy.new_project("Legacy deletion")
        old=legacy.transition(old,"use_own_land")[0]
        old=legacy.transition(old,"demonstrator",dict(parcel_id="parcel-1"))[0]
        state=engine.validate_state(old)
        original=deepcopy(state)
        with self.assertRaisesRegex(engine.Invalid,"frozen history"):demonstrator_removal.delete(state)
        self.assertEqual(state,original)
        origin=legacy.transition(legacy.new_project("Earlier land only"),"use_own_land")[0]
        guided=planned(state=engine.validate_state(origin))
        result=demonstrator_removal.delete(guided)
        self.assertEqual(len(result["parcels"]),1)
        self.assertIsNone(result["demonstrator"])
        self.assertNotIn('"action_id": "demonstrator"',json.dumps(result))
        self.assertEqual(engine.validate_state(result),result)


class DemonstratorRemovalApiTests(unittest.TestCase):
    def setUp(self):
        self.folder=TemporaryDirectory();self.addCleanup(self.folder.cleanup)
        self.path=Path(self.folder.name)/"save.json"
        Store(self.path).mutate("import",0,str(uuid4()),dict(save=dict(format_version=4,project=site(),undo=None),confirm_replace=False))
        self.client=TestClient(create_app(self.path));self.addCleanup(self.client.close)
        data=self.client.get("/api/project").json()
        action=next(a for a in data["actions"] if a["id"]=="demonstrator")
        p=stage_plan(self.client,{f["name"]:f["default"] for f in action["fields"]})
        r=self.client.post("/api/commit",json=dict(revision=data["revision"],action_id="demonstrator",inputs=p["draft"]["inputs"],planning_revision=p["planning_revision"],request_id=str(uuid4())))
        self.assertEqual(r.status_code,200,r.text);self.data=r.json()

    def test_preview_cancel_failure_retry_restart_export_and_undo_preserve_exploration(self):
        before=self.client.get("/api/export").json();original=self.path.read_bytes()
        preview=self.client.post("/api/demonstrator/removal-preview",json=dict(revision=self.data["revision"]))
        self.assertEqual(preview.status_code,200,preview.text)
        self.assertTrue(preview.json()["planning_preserved"])
        self.assertEqual(preview.json()["preserved_designs"],1)
        self.assertEqual(preview.json()["removed_applied_snapshots"],1)
        self.assertEqual(self.path.read_bytes(),original)
        request=dict(revision=self.data["revision"],request_id=str(uuid4()),confirm=True)
        with patch("backend.storage.os.replace",side_effect=OSError("Disk full")):
            r=self.client.post("/api/demonstrator/delete",json=request)
            self.assertEqual(r.status_code,503,r.text)
        self.assertEqual(self.path.read_bytes(),original)
        r=self.client.post("/api/demonstrator/delete",json=request)
        self.assertEqual(r.status_code,200,r.text);after=r.json()
        self.assertIsNone(after["project"]["demonstrator"])
        self.assertEqual(after["undo_kind"],"delete")
        self.assertEqual(after["project"]["parcels"],before["project"]["parcels"])
        self.assertEqual(after["planning"]["draft"],before["planning"])
        exported=self.client.get("/api/export").json()
        self.assertEqual(exported["designer"]["designs"],before["designer"]["designs"])
        self.assertEqual(exported["designer"]["applied"],[])
        self.assertIsNone(exported["undo"])
        self.assertIsNone(exported["designer_undo"])
        self.assertEqual(validate_export(exported)["project"],after["project"])
        self.assertEqual(self.client.post("/api/demonstrator/delete",json=request).json()["project"],after["project"])
        restored=Store(self.path);self.assertIsNone(restored.error)
        self.assertEqual(restored.snapshot()["undo_edit"],dict(kind="delete_demonstrator"))
        # Later saved alternatives and planning edits survive Undo removal.
        w=self.client.get("/api/designer").json()
        save=self.client.post("/api/designer/save",json=dict(revision=after["revision"],design_revision=w["design_revision"],request_id=str(uuid4()),draft=w["evaluation"]["draft"],mode="create",design_id=None,name="Later alternative"))
        self.assertEqual(save.status_code,200,save.text)
        p=self.client.get("/api/demonstrator/draft").json()
        administration={k:v for k,v in p["draft"]["inputs"].items() if k not in designer.PHYSICAL};administration["notes"]="Later planning edit"
        edit=self.client.post("/api/demonstrator/draft",json=dict(revision=after["revision"],planning_revision=p["planning_revision"],request_id=str(uuid4()),administration=administration))
        self.assertEqual(edit.status_code,200,edit.text)
        undo=self.client.post("/api/undo",json=dict(revision=after["revision"],request_id=str(uuid4())))
        self.assertEqual(undo.status_code,200,undo.text)
        self.assertEqual(undo.json()["project"]["demonstrator"],before["project"]["demonstrator"])
        latest=self.client.get("/api/export").json()
        self.assertEqual(len(latest["designer"]["designs"]),2)
        self.assertEqual(latest["designer"]["applied"],before["designer"]["applied"])
        self.assertEqual(latest["planning"]["inputs"]["notes"],"Later planning edit")

    def test_confirmation_stale_requests_and_invalid_undo_metadata_are_rejected(self):
        before=self.path.read_bytes()
        for changes,expected in [(dict(confirm=False),422),(dict(confirm="true"),422),(dict(revision=self.data["revision"]-1),409)]:
            body=dict(revision=self.data["revision"],request_id=str(uuid4()),confirm=True);body.update(changes)
            self.assertEqual(self.client.post("/api/demonstrator/delete",json=body).status_code,expected)
        self.assertEqual(self.path.read_bytes(),before)
        r=self.client.post("/api/demonstrator/delete",json=dict(revision=self.data["revision"],request_id=str(uuid4()),confirm=True))
        self.assertEqual(r.status_code,200,r.text)
        self.assertEqual(self.client.post("/api/demonstrator/removal-preview",json=dict(revision=r.json()["revision"])).status_code,422)
        raw=Store(self.path).snapshot()
        raw["undo_edit"]["kind"]="unknown_delete"
        export={k:raw[k] for k in ["format_version","project","undo","undo_edit","designer","designer_revision","designer_undo","planning","planning_revision","planning_undo"]}
        with self.assertRaises(engine.Invalid):validate_export(export)
        advanced=self.client.post("/api/commit",json=dict(revision=r.json()["revision"],request_id=str(uuid4()),action_id="advance",inputs={"target_year":0.1}))
        self.assertEqual(advanced.status_code,200,advanced.text)
        undone=self.client.post("/api/undo",json=dict(revision=advanced.json()["revision"],request_id=str(uuid4())))
        self.assertEqual(undone.status_code,200,undone.text)
        self.assertIsNone(undone.json()["project"]["demonstrator"],"A later simulation action replaces the demonstrator-removal Undo buffer.")


if __name__=="__main__":unittest.main()
