from copy import deepcopy
import json
from pathlib import Path
import tempfile
import unittest
from uuid import uuid4
from unittest.mock import patch
from fastapi.testclient import TestClient
from backend import engine_v3 as engine, engine as current_engine, legacy
from backend.app import create_app
from backend.storage import Store, validate_export


def inputs(state, route="lease", parcel="new", agreement=None, **changes):
    fields = engine.land_form(state, route, parcel, agreement)["fields"]
    result = {f["name"]: f["default"] for f in fields}
    result.update(route_id=route, parcel_id=parcel)
    if agreement:
        result["agreement_id"] = agreement
    return {**result, **changes}


class LandEngineTests(unittest.TestCase):
    def test_all_seven_routes_complete_a_funded_run_with_explicit_renewal(self):
        for route in engine.ROUTES:
            with self.subTest(route=route):
                state = engine.new_project(route)
                old = deepcopy(state)
                draft = inputs(state, route)
                projection = engine.preview(state, "establish_access", draft)
                self.assertEqual(state, old)
                state, _ = engine.transition(state, "establish_access", draft)
                self.assertEqual(state["cash"], projection["cash_after"])
                expected_owner = (
                    draft["holder_id"]
                    if engine.route(state, route)["ownership"]
                    else draft["owner_id"]
                )
                self.assertEqual(state["parcels"][0]["owner_id"], expected_owner)
                for action, values in [
                    (
                        "demonstrator",
                        {"parcel_id": "parcel-1", "restoration_area": 10000},
                    ),
                    ("apply_grant", {}),
                    ("award_grant", {}),
                    ("receive_payment", {}),
                ]:
                    state, _ = engine.transition(state, action, values)
                if state["agreements"][0]["end"] is not None:
                    state, _ = engine.transition(
                        state,
                        "renew_access",
                        dict(
                            agreement_id="agreement-1",
                            term_years=30,
                            commitment_years=5,
                        ),
                    )
                state, _ = engine.transition(
                    state,
                    "expand",
                    {"parcel_id": "parcel-1", "restoration_area": 10000},
                )
                state, _ = engine.transition(state, "advance", {"target_year": 30})
                self.assertEqual(engine.summary(state)["restored_area"], 20000)
                self.assertEqual(engine.summary(state)["active_area"], 20000)
                self.assertEqual(state["organizations"], [])
                self.assertEqual(engine.validate_state(state), state)

    def test_lease_payments_expiry_and_maintenance_have_distinct_clocks(self):
        s, _ = engine.transition(
            engine.new_project("Lease"),
            "establish_access",
            inputs(
                engine.new_project("Draft"),
                term_years=2,
                annual_payment=100,
                deposit=300,
                upfront=200,
                annual_maintenance=50,
                commitment_years=4,
            ),
        )
        self.assertEqual(s["cash"], 59400)
        s, _ = engine.transition(
            s, "demonstrator", {"parcel_id": "parcel-1", "restoration_area": 10000}
        )
        # A different action crosses the first annual rent and maintenance date.
        self.assertEqual(s["cash"], 47250)
        s, _ = engine.transition(s, "advance", {"target_year": 3})
        self.assertEqual(s["agreements"][0]["status"], "expired")
        self.assertEqual(s["agreements"][0]["deposit_held"], 0)
        self.assertEqual(engine.summary(s)["active_area"], 0)
        self.assertEqual(engine.summary(s)["restored_area"], 10000)
        self.assertEqual(s["cash"], 47500)
        s, _ = engine.transition(s, "advance", {"target_year": 30})
        self.assertEqual(s["cash"], 47400)
        self.assertEqual(
            len([p for p in s["payments"] if p["kind"] == "Deposit returned"]), 1
        )
        self.assertEqual(
            len([p for p in s["payments"] if p["kind"] == "Maintenance / monitoring"]),
            4,
        )

    def test_proposals_keep_unknowns_and_do_not_change_existing_access(self):
        s = engine.new_project("Proposals")
        s, _ = engine.transition(s, "establish_access", inputs(s, "existing"))
        cash = s["cash"]
        s, _ = engine.transition(
            s,
            "establish_access",
            inputs(
                s,
                "lease",
                "parcel-1",
                stage="pending",
                upfront=None,
                annual_payment=None,
                physical_access="unknown",
            ),
        )
        self.assertEqual(s["cash"], cash)
        self.assertIsNone(s["agreements"][1]["upfront"])
        self.assertEqual(s["parcels"][0]["physical_access"], "yes")
        self.assertEqual(engine.summary(s)["active_area"], 20000)
        with self.assertRaises(engine.Invalid):
            engine.transition(
                s, "activate_access", inputs(s, "lease", "parcel-1", "agreement-2")
            )
        s, _ = engine.transition(s, "end_access", {"agreement_id": "agreement-1"})
        self.assertEqual(s["parcels"][0]["owner_id"], "individual")
        self.assertEqual(engine.summary(s)["active_area"], 0)

    def test_pending_donation_does_not_transfer_until_finalisation(self):
        s = engine.new_project("Donation")
        s, _ = engine.transition(
            s, "establish_access", inputs(s, "donation", stage="pending", upfront=None)
        )
        self.assertEqual(s["parcels"][0]["owner_id"], "third-party")
        self.assertEqual(s["cash"], 60000)
        s, _ = engine.transition(
            s,
            "activate_access",
            inputs(s, "donation", "parcel-1", "agreement-1", upfront=500),
        )
        self.assertEqual(s["parcels"][0]["owner_id"], "individual")
        self.assertEqual(s["cash"], 59500)
        self.assertEqual(len(s["parcels"]), 1)
        with self.assertRaises(engine.Invalid):
            engine.transition(
                s, "activate_access", inputs(s, "donation", "parcel-1", "agreement-1")
            )

    def test_cover_duration_permissions_and_parcel_area_are_enforced(self):
        for changes in [
            dict(covered_area=30000),
            dict(annual_payment=True),
            dict(upfront="500"),
            dict(upfront=1.001),
        ]:
            s = engine.new_project("Invalid")
            before = deepcopy(s)
            with self.assertRaises(engine.Invalid):
                engine.transition(s, "establish_access", inputs(s, **changes))
            self.assertEqual(s, before)
        for changes in [
            dict(term_years=1),
            dict(allow_restoration="unknown"),
            dict(permits="pending"),
            dict(physical_access="no"),
        ]:
            s = engine.new_project("Access")
            s, _ = engine.transition(s, "establish_access", inputs(s, **changes))
            with self.assertRaises(engine.Invalid):
                engine.transition(
                    s,
                    "demonstrator",
                    {"parcel_id": "parcel-1", "restoration_area": 10000},
                )

    def test_unfunded_time_jump_leaves_original_unchanged(self):
        scenario = engine.load_scenario()
        scenario["initial_cash"] = 10000
        s = engine.new_project("Cash", scenario)
        s, _ = engine.transition(
            s,
            "establish_access",
            inputs(
                s, annual_payment=3000, deposit=0, upfront=0, annual_maintenance=100
            ),
        )
        before = deepcopy(s)
        with self.assertRaisesRegex(engine.Invalid, "Insufficient cash"):
            engine.transition(s, "advance", {"target_year": 10})
        self.assertEqual(s, before)

    def test_renewal_does_not_duplicate_area_or_payments_and_preserves_gaps(self):
        s = engine.new_project("Renewal")
        s, _ = engine.transition(
            s,
            "establish_access",
            inputs(
                s, term_years=2, annual_payment=100, deposit=200, annual_maintenance=0
            ),
        )
        s, _ = engine.transition(
            s,
            "renew_access",
            dict(agreement_id="agreement-1", term_years=1, commitment_years=0),
        )
        self.assertEqual(s["agreements"][0]["end"], 3.5)
        self.assertEqual(engine.summary(s)["active_area"], 20000)
        s, _ = engine.transition(s, "advance", {"target_year": 4})
        self.assertEqual(engine.summary(s)["active_area"], 0)
        s, _ = engine.transition(
            s,
            "renew_access",
            dict(agreement_id="agreement-1", term_years=3, commitment_years=0),
        )
        self.assertEqual(
            s["agreements"][0]["periods"],
            [dict(start=0.5, end=3.5), dict(start=4.1, end=7.1)],
        )
        self.assertEqual(engine.summary(s)["active_area"], 20000)
        self.assertEqual(len(s["parcels"]), 1)

    def test_old_expired_right_cannot_overlap_a_new_active_arrangement(self):
        s = engine.new_project("Overlap")
        s, _ = engine.transition(
            s,
            "establish_access",
            inputs(s, "free_use", term_years=1, commitment_years=0),
        )
        s, _ = engine.transition(s, "advance", {"target_year": 2})
        s, _ = engine.transition(s, "establish_access", inputs(s, "lease", "parcel-1"))
        before = deepcopy(s)
        with self.assertRaises(engine.Invalid):
            engine.transition(
                s,
                "renew_access",
                dict(agreement_id="agreement-1", term_years=5, commitment_years=0),
            )
        self.assertEqual(s, before)

    def test_renewed_maintenance_prorates_the_last_partial_year_and_preserves_lapsed_periods(
        self,
    ):
        s = engine.new_project("Maintenance")
        s, _ = engine.transition(
            s,
            "establish_access",
            inputs(
                s, "free_use", term_years=3, annual_maintenance=100, commitment_years=1
            ),
        )
        s, _ = engine.transition(
            s,
            "renew_access",
            dict(agreement_id="agreement-1", term_years=1, commitment_years=1),
        )
        s, _ = engine.transition(s, "advance", {"target_year": 2})
        payments = [
            p["cash_change"]
            for p in s["payments"]
            if p["kind"] == "Maintenance / monitoring"
        ]
        self.assertEqual(payments, [-100, -10])
        self.assertEqual(s["cash"], 59590)
        s, _ = engine.transition(s, "advance", {"target_year": 6})
        s, _ = engine.transition(
            s,
            "renew_access",
            dict(agreement_id="agreement-1", term_years=2, commitment_years=1),
        )
        self.assertEqual(len(s["obligations"]), 2)
        self.assertEqual(s["obligations"][0]["end"], 1.6)
        self.assertEqual(s["obligations"][1]["start"], 6.1)
        self.assertEqual(engine.validate_state(s), s)

    def test_organisations_do_not_receive_land_automatically(self):
        s = engine.new_project("Owners")
        s, _ = engine.transition(s, "establish_access", inputs(s, "existing"))
        s, _ = engine.transition(
            s, "demonstrator", {"parcel_id": "parcel-1", "restoration_area": 10000}
        )
        s, _ = engine.transition(s, "company", {})
        s, _ = engine.transition(s, "foundation", {})
        self.assertEqual(s["parcels"][0]["owner_id"], "individual")
        s, _ = engine.transition(
            s,
            "establish_access",
            inputs(s, "purchase", holder_id="company", operator_id="foundation"),
        )
        self.assertEqual(s["parcels"][1]["owner_id"], "company")
        self.assertEqual(s["agreements"][1]["operator_id"], "foundation")

    def test_commitments_and_rent_beyond_the_horizon_are_disclosed(self):
        s = engine.new_project("Beyond")
        s, _ = engine.transition(
            s, "establish_access", inputs(s, term_years=40, commitment_years=50)
        )
        s, _ = engine.transition(s, "advance", {"target_year": 30})
        report = engine.summary(s)
        self.assertGreater(report["remaining_maintenance_commitment"], 0)
        self.assertGreater(report["future_rent_after_horizon"], 0)
        self.assertEqual(len(report["beyond_horizon"]), 1)
        self.assertEqual(engine.validate_state(s), s)


class MigrationTests(unittest.TestCase):
    def test_v1_migration_preserves_history_cash_undo_receipts_and_backup(self):
        before = legacy.new_project("Original")
        before, _ = legacy.transition(before, "use_own_land")
        old, _ = legacy.transition(before, "demonstrator", {"parcel_id": "parcel-1"})
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "active.json"
            envelope = dict(
                format_version=1,
                project=old,
                undo=before,
                receipts={"prior-id": "fingerprint"},
                revision=old["revision"],
            )
            raw = json.dumps(envelope).encode()
            path.write_bytes(raw)
            store = Store(path)
            current = store.snapshot()
            self.assertEqual(current["project"]["schema_version"], 4)
            self.assertEqual(current["project"]["cash"], old["cash"])
            self.assertEqual(current["project"]["history"], old["history"])
            self.assertEqual(current["receipts"], envelope["receipts"])
            self.assertEqual(
                next(Path(folder).glob("*.schema-v1-*.json")).read_bytes(), raw
            )
            self.assertEqual(
                json.loads(path.read_text(encoding="utf-8"))["format_version"], 5
            )
            self.assertEqual(
                current_engine.validate_state(current["project"]), current["project"]
            )
            store = Store(path)
            result, _ = store.mutate("undo", old["revision"], str(uuid4()), {})
            self.assertEqual(result["project"]["activities"], [])
            self.assertEqual(result["project"]["cash"], before["cash"])
            self.assertEqual(validate_export(store.export())["format_version"], 5)

    def test_failed_migration_preserves_original_file(self):
        old = legacy.new_project("Original")
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "active.json"
            raw = json.dumps(
                dict(format_version=1, project=old, undo=None, receipts={}, revision=0)
            ).encode()
            path.write_bytes(raw)
            with patch("backend.storage.os.replace", side_effect=OSError("No space")):
                store = Store(path)
            with self.assertRaises(OSError):
                store.snapshot()
            self.assertEqual(path.read_bytes(), raw)

    def test_v2_tampering_in_agreements_obligations_or_receipts_is_rejected(self):
        s = engine.new_project("Validation")
        s, _ = engine.transition(s, "establish_access", inputs(s))
        for collection, key, value in [
            ("agreements", "end", 999),
            ("obligations", "annual_amount", 0),
            ("payments", "cash_change", 0),
            ("parcels", "owner_id", "company"),
        ]:
            bad = deepcopy(s)
            bad[collection][0][key] = value
            with self.assertRaises(engine.Invalid):
                engine.validate_state(bad)

    def test_source_links_and_form_previews_do_not_mutate_save(self):
        with tempfile.TemporaryDirectory() as folder:
            client = TestClient(create_app(Path(folder) / "save.json"))
            result = client.post(
                "/api/project/new",
                json=dict(name="Sources", revision=0, request_id=str(uuid4())),
            ).json()
            before = client.get("/api/project").json()
            form = client.post(
                "/api/land/form",
                json=dict(revision=result["revision"], route_id="public_management"),
            )
            self.assertEqual(form.status_code, 200)
            self.assertEqual(client.get("/api/project").json(), before)
            self.assertEqual(client.get("/api/sources/unknown").status_code, 404)
            self.assertEqual(client.get("/api/sources/land-poster").status_code, 200)
            for source in ("vega-assessment", "vega-baseline", "forest-habitats"):
                response = client.get("/api/sources/" + source)
                self.assertEqual(response.status_code, 200)
                self.assertEqual(response.headers["content-type"], "application/pdf")
            self.assertEqual(
                client.post(
                    "/api/land/form", json=dict(revision=0, route_id="lease")
                ).status_code,
                409,
            )


if __name__ == "__main__":
    unittest.main()
