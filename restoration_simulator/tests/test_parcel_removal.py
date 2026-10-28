"""Exploration deletes must purge choices, replay survivors and support Undo."""

from copy import deepcopy
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from uuid import uuid4
from fastapi.testclient import TestClient
from backend import (
    engine,
    engine_v3,
    engine_v2,
    legacy,
    parcel_removal,
    parcel_removal_legacy,
)
from backend.storage import Store, validate_export
from backend.app import create_app
from test_demonstrator import (
    site,
    baseline,
    planned,
    installed,
    awarded,
    evaluated,
    step,
)


def add(state, route="existing", name="Surviving finca", **changes):
    v = {f["name"]: f["default"] for f in engine.land_form(state, route)["fields"]}
    v.update(
        route_id=route,
        parcel_id="new",
        parcel_name=name,
        parcel_area=400,
        covered_area=400,
        **changes,
    )
    return engine.transition(state, "establish_access", v)[0]


class ExplorationDeleteTests(unittest.TestCase):
    def test_plan_baseline_payments_and_time_disappear_without_deletion_event(self):
        state = baseline(
            planned(state=site("lease", annual_maintenance=100, commitment_years=4))
        )
        before = deepcopy(state)
        impact = parcel_removal.plan(state, "parcel-1")
        self.assertEqual(state, before)
        self.assertEqual(len(impact["removed_actions"]), 3)
        new = parcel_removal.delete(state, ["parcel-1"])
        for key in (
            "parcels",
            "agreements",
            "activities",
            "obligations",
            "payments",
            "history",
        ):
            self.assertEqual(new[key], [])
        self.assertIsNone(new["demonstrator"])
        self.assertEqual((new["cash"], new["time"]), (60000, 0))
        self.assertEqual(engine.validate_state(new), new)

    def test_completed_pilot_and_all_funding_stages_are_deleted_together(self):
        state = step(
            evaluated(True),
            "receive_payment",
            eligibility_confirmed="confirmed",
            basis="illustrative",
        )
        p = parcel_removal.plan(state, "parcel-1")
        titles = [a["title"] for a in p["removed_actions"]]
        self.assertIn("Record the reimbursement", titles)
        self.assertIn("Plant the demonstrator", titles)
        new = parcel_removal.delete(state, ["parcel-1"])
        self.assertEqual(new["parcels"], [])
        self.assertEqual(new["payments"], [])
        self.assertIsNone(new["demonstrator"])
        self.assertEqual(new["grant"], dict(status="not_applied", amount=0))
        # An explicit advance-to-year choice is unrelated and remains.
        self.assertEqual([h["action_id"] for h in new["history"]], ["advance"])
        self.assertEqual(new["time"], state["history"][7]["inputs"]["target_year"])
        self.assertEqual(engine.validate_state(new), new)

    def test_survivor_ids_agreements_and_followup_references_are_remapped(self):
        state = add(site("purchase"), "lease", name="Keep this leased finca")
        state = step(
            state,
            "renew_access",
            agreement_id="agreement-2",
            term_years=2,
            commitment_years=0,
        )
        state = planned(state=state, parcel_id="parcel-2")
        state = baseline(state)
        state = step(state, "install_demonstrator", confirmation="confirmed")
        new = parcel_removal.delete(state, ["parcel-1"])
        self.assertEqual(len(new["parcels"]), 1)
        self.assertEqual(new["parcels"][0]["name"], "Keep this leased finca")
        self.assertEqual(new["parcels"][0]["id"], "parcel-1")
        self.assertEqual(new["agreements"][0]["id"], "agreement-1")
        self.assertEqual(new["demonstrator"]["plan"]["parcel_id"], "parcel-1")
        self.assertEqual(new["history"][1]["inputs"]["agreement_id"], "agreement-1")
        self.assertEqual(new["agreements"][0]["renewals"], 1)
        self.assertEqual(len(new["activities"]), 1)
        self.assertLess(new["time"], state["time"])
        self.assertGreater(new["cash"], state["cash"])
        self.assertEqual(engine.validate_state(new), new)

    def test_deleting_later_parcel_keeps_earlier_pilot_and_funding(self):
        state = add(awarded(), "lease", name="Delete this later parcel")
        new = parcel_removal.delete(state, ["parcel-2"])
        self.assertEqual(new["demonstrator"], state["demonstrator"])
        self.assertEqual(new["grant"], state["grant"])
        self.assertEqual(len(new["parcels"]), 1)
        self.assertNotIn("Delete this later parcel", json.dumps(new))
        self.assertEqual(engine.validate_state(new), new)

    def test_pending_proposal_activation_and_end_access_all_disappear(self):
        state = site("lease", stage="pending")
        state = step(
            state,
            "activate_access",
            **{
                f["name"]: f["default"]
                for f in engine.land_form(state, "lease", "parcel-1", "agreement-1")[
                    "fields"
                ]
            },
            route_id="lease",
            parcel_id="parcel-1",
            agreement_id="agreement-1",
        )
        state = step(state, "end_access", agreement_id="agreement-1")
        new = parcel_removal.delete(state, ["parcel-1"])
        self.assertEqual(new["history"], [])
        self.assertEqual((new["time"], new["cash"]), (0, 60000))

    def test_transitive_prerequisites_and_collateral_choices_are_in_preview(self):
        state = step(evaluated(), "company")
        state = add(
            state,
            name="Dependent company finca",
            owner_id="company",
            holder_id="company",
            operator_id="company",
        )
        impact = parcel_removal.plan(state, "parcel-1")
        self.assertEqual(len(impact["deleted_parcels"]), 2)
        self.assertTrue(
            any("Cannot be retained" in a["reason"] for a in impact["removed_actions"])
        )
        new = parcel_removal.delete(state, ["parcel-1"])
        self.assertEqual(new["organizations"], [])
        self.assertEqual(new["parcels"], [])
        self.assertEqual(engine.validate_state(new), new)

    def test_invalid_targets_are_atomic_and_remaining_advances_are_preserved(self):
        state = step(site(), "advance", target_year=30)
        original = deepcopy(state)
        for ids in [[], ["missing"], ["parcel-1", "parcel-1"], [True]]:
            with self.subTest(ids=ids), self.assertRaises(engine.Invalid):
                parcel_removal.rebuild(state, ids)
            self.assertEqual(state, original)
        new = parcel_removal.delete(state, ["parcel-1"])
        self.assertEqual(new["time"], 30)
        self.assertEqual([h["action_id"] for h in new["history"]], ["advance"])

    def test_nested_versions_are_rebuilt_without_deleted_origin_snapshots(self):
        old = legacy.new_project("Legacy exploration")
        old = legacy.transition(old, "use_own_land")[0]
        old = legacy.transition(old, "demonstrator", dict(parcel_id="parcel-1"))[0]
        state = engine.validate_state(old)
        state = add(state, name="Modern surviving finca")
        new = parcel_removal.delete(state, ["parcel-1"])
        self.assertEqual(
            [p["name"] for p in new["parcels"]], ["Modern surviving finca"]
        )
        self.assertEqual(new["activities"], [])
        origin = new["demonstrator_origin"]["previous_origin"]["legacy_origin"]
        self.assertEqual(origin["parcels"], [])
        self.assertEqual(origin["history"], [])
        self.assertEqual(engine.validate_state(new), new)

    def test_v2_and_v3_survivors_keep_unit_conversion_and_earlier_rules(self):
        for module in (engine_v2, engine_v3):
            old = module.new_project("Older parcels")
            for name in ("Delete older parcel", "Keep older parcel"):
                v = {
                    f["name"]: f["default"]
                    for f in module.land_form(old, "existing")["fields"]
                }
                v.update(route_id="existing", parcel_id="new", parcel_name=name)
                old = module.transition(old, "establish_access", v)[0]
            state = engine.validate_state(old)
            new = parcel_removal.delete(state, ["parcel-1"])
            self.assertEqual(len(new["parcels"]), 1)
            self.assertEqual(new["parcels"][0]["area"], state["parcels"][1]["area"])
            self.assertNotIn("Delete older parcel", json.dumps(new))
            self.assertEqual(engine.validate_state(new), new)


class DeletePersistenceTests(unittest.TestCase):
    def test_preview_cancel_atomic_save_retry_restart_undo_and_clean_export(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "save.json"
            original = site("purchase", parcel_name="Erase every trace")
            with TestClient(create_app(path)) as client:
                r = client.post(
                    "/api/import",
                    json=dict(
                        revision=0,
                        request_id=str(uuid4()),
                        confirm_replace=False,
                        save=dict(format_version=4, project=original, undo=None),
                    ),
                )
                self.assertEqual(r.status_code, 200, r.text)
                before = r.json()
                raw = path.read_bytes()
                preview = client.post(
                    "/api/parcels/removal-preview",
                    json=dict(revision=before["revision"], parcel_id="parcel-1"),
                )
                self.assertEqual(preview.status_code, 200, preview.text)
                self.assertEqual(preview.json()["cash_after"], 60000)
                self.assertEqual(path.read_bytes(), raw)
                req = dict(
                    revision=before["revision"],
                    request_id=str(uuid4()),
                    parcel_id="parcel-1",
                    confirm=True,
                )
                with patch(
                    "backend.storage.os.replace", side_effect=OSError("No space")
                ):
                    self.assertEqual(
                        client.post("/api/parcels/delete", json=req).status_code, 503
                    )
                self.assertEqual(path.read_bytes(), raw)
                deleted = client.post("/api/parcels/delete", json=req)
                self.assertEqual(deleted.status_code, 200, deleted.text)
                self.assertEqual(deleted.json()["undo_kind"], "delete")
                self.assertEqual(
                    client.post("/api/parcels/delete", json=req).json()["project"],
                    deleted.json()["project"],
                )
                self.assertEqual(
                    client.post(
                        "/api/parcels/delete", json={**req, "request_id": str(uuid4())}
                    ).status_code,
                    409,
                )
                exported = client.get("/api/export").json()
                self.assertIsNone(exported["undo"])
                self.assertNotIn("Erase every trace", json.dumps(exported))
                self.assertEqual(validate_export(exported), exported)
                self.assertEqual(
                    client.get("/api/project").json()["project"]["history"], []
                )
            store = Store(path)
            self.assertEqual(store.snapshot()["project"], deleted.json()["project"])
            restored, _ = store.mutate(
                "undo", store.snapshot()["revision"], str(uuid4()), {}
            )
            for key in ("parcels", "agreements", "payments", "cash", "time", "history"):
                self.assertEqual(restored["project"][key], before["project"][key])

    def test_false_confirmation_and_simulation_commit_do_not_delete(self):
        with tempfile.TemporaryDirectory() as folder:
            client = TestClient(create_app(Path(folder) / "s.json"))
            state = site()
            r = client.post(
                "/api/import",
                json=dict(
                    revision=0,
                    request_id=str(uuid4()),
                    confirm_replace=False,
                    save=dict(format_version=4, project=state, undo=None),
                ),
            ).json()
            req = dict(
                revision=r["revision"],
                request_id=str(uuid4()),
                parcel_id="parcel-1",
                confirm=False,
            )
            self.assertEqual(
                client.post("/api/parcels/delete", json=req).status_code, 422
            )
            req.pop("confirm")
            req.pop("parcel_id")
            req.update(
                action_id="remove_parcel",
                inputs=dict(parcel_id="parcel-1", mode="remove", confirm=True),
            )
            self.assertEqual(client.post("/api/commit", json=req).status_code, 422)
            self.assertEqual(client.get("/api/project").json()["project"], r["project"])

    def test_old_removed_parcels_are_purged_on_load_and_import(self):
        state = add(
            site(parcel_name="First forgotten parcel"), name="Second forgotten parcel"
        )
        for id in ("parcel-1", "parcel-2"):
            state = parcel_removal_legacy.transition(
                state, dict(parcel_id=id, mode="remove", confirm=True)
            )[0]
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "old.json"
            path.write_text(
                json.dumps(
                    dict(
                        format_version=4,
                        project=state,
                        undo=None,
                        receipts={},
                        revision=state["revision"],
                    )
                ),
                encoding="utf-8",
            )
            store = Store(path)
            clean = store.snapshot()
            self.assertEqual(clean["project"]["history"], [])
            self.assertEqual(clean["project"]["parcels"], [])
            self.assertEqual(clean["project"]["time"], 0)
            self.assertEqual(Store(path).snapshot(), clean)
            self.assertNotIn("forgotten parcel", store.export()["project"].__str__())
            imported = Store(Path(folder) / "import.json")
            imported.mutate(
                "import",
                0,
                str(uuid4()),
                dict(
                    save=dict(format_version=4, project=state, undo=None),
                    confirm_replace=False,
                ),
            )
            self.assertEqual(imported.snapshot()["project"]["history"], [])
            self.assertEqual(Store(imported.path).snapshot(), imported.snapshot())

    def test_deletion_undo_is_checked_and_next_action_discards_its_buffer(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "s.json"
            store = Store(path)
            store.mutate(
                "import",
                0,
                str(uuid4()),
                dict(
                    save=dict(
                        format_version=4,
                        project=site(parcel_name="Deleted secret name"),
                        undo=None,
                    ),
                    confirm_replace=False,
                ),
            )
            store.mutate(
                "delete_parcel",
                store.snapshot()["revision"],
                str(uuid4()),
                dict(parcel_id="parcel-1", confirm=True),
            )
            raw = store.snapshot()
            tampered = {
                k: raw[k] for k in ("format_version", "project", "undo", "undo_edit")
            }
            for ids in [["missing"], [], [{}], [True], ["parcel-1", "parcel-1"]]:
                tampered["undo_edit"] = dict(kind="delete_parcels", parcel_ids=ids)
                with self.subTest(ids=ids), self.assertRaises(engine.Invalid):
                    validate_export(tampered)
            store.mutate(
                "commit",
                raw["revision"],
                str(uuid4()),
                dict(action_id="advance", inputs=dict(target_year=2)),
            )
            self.assertIsNone(store.snapshot()["undo_edit"])
            self.assertNotIn("Deleted secret name", path.read_text(encoding="utf-8"))

    def test_failed_cleanup_keeps_the_old_save_unchanged(self):
        state = parcel_removal_legacy.transition(
            site(), dict(parcel_id="parcel-1", mode="remove", confirm=True)
        )[0]
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "old.json"
            raw = json.dumps(
                dict(
                    format_version=4,
                    project=state,
                    undo=None,
                    receipts={},
                    revision=state["revision"],
                )
            ).encode()
            path.write_bytes(raw)
            with patch("backend.storage.os.replace", side_effect=OSError("No space")):
                store = Store(path)
            with self.assertRaises(OSError):
                store.snapshot()
            self.assertEqual(path.read_bytes(), raw)


if __name__ == "__main__":
    unittest.main()
