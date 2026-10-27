"""Small-plot journeys and exact upgrades from the hectare-based simulator."""

from copy import deepcopy
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from uuid import uuid4

from backend import engine, engine_v2
from backend.storage import Store, validate_export


def land(state, route="existing", module=engine, **changes):
    values = {f["name"]: f["default"] for f in module.land_form(state, route)["fields"]}
    return {**values, "route_id": route, "parcel_id": "new", **changes}


class SquareMetreTests(unittest.TestCase):
    def test_200_square_metre_pilot_on_part_of_a_finca(self):
        s = engine.new_project("My finca")
        draft = land(s, parcel_area=2000, covered_area=200)
        projected = engine.preview(s, "establish_access", draft)
        self.assertTrue(projected["recorded_ownership"])
        self.assertEqual((projected["end_year"], projected["duration"]), (0, 0))
        s, _ = engine.transition(s, "establish_access", draft)
        self.assertEqual(s["cash"], 60000)
        self.assertEqual(s["obligations"], [])
        report = engine.summary(s)
        self.assertEqual(
            (report["owned_area"], report["active_area"], report["restored_area"]),
            (2000, 200, 0),
        )
        before = deepcopy(s)
        with self.assertRaises(engine.Invalid):
            engine.transition(
                s, "demonstrator", dict(parcel_id="parcel-1", restoration_area=201)
            )
        self.assertEqual(s, before)
        action = next(a for a in engine.list_actions(s) if a["id"] == "demonstrator")
        self.assertTrue(action["available"])
        self.assertEqual(action["fields"][1]["default"], 200)
        s, _ = engine.transition(
            s, "demonstrator", dict(parcel_id="parcel-1", restoration_area=200)
        )
        self.assertEqual(s["cash"], 48000)  # fixed cost, not automatically scaled
        self.assertEqual(engine.summary(s)["restored_area"], 200)
        self.assertEqual(s["time"], 1.5)
        self.assertEqual(engine.validate_state(s), s)

    def test_all_routes_support_small_plots_and_explicit_fixed_prices(self):
        for route in engine.ROUTES:
            with self.subTest(route=route):
                s = engine.new_project(route)
                s, _ = engine.transition(
                    s,
                    "establish_access",
                    land(s, route, parcel_area=200, covered_area=200),
                )
                cash = s["cash"]
                s, _ = engine.transition(
                    s, "demonstrator", dict(parcel_id="parcel-1", restoration_area=100)
                )
                self.assertEqual(s["activities"][0]["area"], 100)
                self.assertGreaterEqual(cash - s["cash"], 12000)
                self.assertEqual(engine.validate_state(s), s)

    def test_existing_ownership_recorded_later_has_no_wait_or_automatic_commitment(
        self,
    ):
        s, _ = engine.transition(
            engine.new_project("Later"), "advance", dict(target_year=5)
        )
        form = engine.land_form(s, "existing")
        fields = {f["name"]: f for f in form["fields"]}
        self.assertTrue(fields["stage"]["hidden"])
        self.assertEqual(fields["evidence"]["default"], "reported")
        self.assertNotIn("fictional", str(fields["evidence"]).lower())
        s, explanation = engine.transition(s, "establish_access", land(s))
        self.assertEqual(s["time"], 5)
        self.assertEqual(s["agreements"][0]["start"], 5)
        self.assertIsNone(s["agreements"][0]["end"])
        self.assertEqual(s["obligations"], [])
        self.assertIn("No acquisition or ownership transfer", explanation)
        explicit = land(s, annual_maintenance=50, commitment_years=3)
        s, _ = engine.transition(s, "establish_access", explicit)
        self.assertEqual(len(s["obligations"]), 1)
        self.assertEqual(s["obligations"][0]["annual_amount"], 50)

    def test_small_areas_still_require_permissions_and_minimum_size(self):
        for changes in [
            dict(covered_area=201, parcel_area=200),
            dict(parcel_area=0),
            dict(covered_area=True),
            dict(covered_area=0.001),
        ]:
            s = engine.new_project("Invalid")
            before = deepcopy(s)
            with self.assertRaises(engine.Invalid):
                engine.transition(s, "establish_access", land(s, **changes))
            self.assertEqual(s, before)
        s = engine.new_project("Permission")
        s, _ = engine.transition(
            s,
            "establish_access",
            land(s, parcel_area=200, covered_area=200, allow_restoration="unknown"),
        )
        with self.assertRaises(engine.Invalid):
            engine.transition(
                s, "demonstrator", dict(parcel_id="parcel-1", restoration_area=100)
            )

    def test_custom_categories_survive_save_export_import_and_undo(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "save.json"
            store = Store(path)
            state, _ = store.mutate(
                "new", 0, str(uuid4()), dict(name="Categories", confirm_replace=False)
            )
            s = state["project"]
            state, _ = store.mutate(
                "commit",
                state["revision"],
                str(uuid4()),
                dict(
                    action_id="establish_access",
                    inputs=land(
                        s,
                        current_use="Community seed garden",
                        current_cover="Carob and herb mosaic",
                        site_condition="Former orchard",
                    ),
                ),
            )
            exported = store.export()
            store = Store(path)
            form = engine.land_form(store.snapshot()["project"], "lease")
            fields = {f["name"]: f for f in form["fields"]}
            self.assertIn(
                "Community seed garden",
                [o["value"] for o in fields["current_use"]["options"]],
            )
            self.assertIn(
                "Carob and herb mosaic",
                [o["value"] for o in fields["current_cover"]["options"]],
            )
            self.assertEqual(validate_export(exported), exported)
            self.assertEqual(
                exported["project"]["parcels"][0]["site_condition"], "Former orchard"
            )
            result, _ = store.mutate("undo", state["revision"], str(uuid4()), {})
            self.assertEqual(result["project"]["parcels"], [])

    def test_legacy_v2_upgrade_keeps_history_payments_undo_and_original_backup(self):
        s = engine_v2.new_project("Hectares")
        before, _ = engine_v2.transition(
            s,
            "establish_access",
            land(s, module=engine_v2, current_use="Old custom description"),
        )
        old, _ = engine_v2.transition(
            before, "demonstrator", dict(parcel_id="parcel-1")
        )
        envelope = dict(
            format_version=2,
            project=old,
            undo=before,
            receipts={"old-request": "old-fingerprint"},
            revision=old["revision"],
        )
        raw = json.dumps(envelope).encode()
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "active.json"
            path.write_bytes(raw)
            store = Store(path)
            upgraded = store.snapshot()
            project = upgraded["project"]
            self.assertEqual(upgraded["format_version"], 3)
            self.assertEqual(project["parcels"][0]["area"], 20000)
            self.assertEqual(project["agreements"][0]["covered_area"], 20000)
            self.assertEqual(project["activities"][0]["area"], 10000)
            for key in ("history", "cash", "time", "payments", "obligations"):
                self.assertEqual(project[key], old[key])
            self.assertEqual(project["agreements"][0]["start"], 0.1)
            self.assertEqual(upgraded["receipts"], envelope["receipts"])
            self.assertEqual(
                next(Path(folder).glob("*.schema-v2-*.json")).read_bytes(), raw
            )
            self.assertEqual(engine.validate_state(project), project)
            self.assertEqual(Store(path).snapshot(), upgraded)
            state, _ = store.mutate(
                "commit",
                upgraded["revision"],
                str(uuid4()),
                dict(
                    action_id="establish_access",
                    inputs=land(project, parcel_area=200, covered_area=200),
                ),
            )
            self.assertEqual(Store(path).snapshot(), state)
            store = Store(path)
            state, _ = store.mutate("undo", state["revision"], str(uuid4()), {})
            self.assertEqual(state["project"]["history"], old["history"])
            # Importing the original export also upgrades it without rewriting it.
            converted = validate_export(
                {k: envelope[k] for k in ("format_version", "project", "undo")}
            )
            self.assertEqual(converted["undo"]["parcels"][0]["area"], 20000)
            bad = deepcopy(project)
            bad["previous_origin"]["cash"] += 1
            with self.assertRaises(engine.Invalid):
                engine.validate_state(bad)

    def test_failed_v2_upgrade_does_not_replace_original(self):
        old = engine_v2.new_project("Original")
        raw = json.dumps(
            dict(format_version=2, project=old, undo=None, receipts={}, revision=0)
        ).encode()
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "save.json"
            path.write_bytes(raw)
            with patch("backend.storage.os.replace", side_effect=OSError("No space")):
                store = Store(path)
            with self.assertRaises(OSError):
                store.snapshot()
            self.assertEqual(path.read_bytes(), raw)

    def test_fractional_hectare_upgrade_does_not_round_away_area(self):
        old = engine_v2.new_project("Fractional parcel")
        old, _ = engine_v2.transition(
            old,
            "establish_access",
            land(old, module=engine_v2, parcel_area=2.1234567, covered_area=2.1234567),
        )
        upgraded = engine.validate_state(old)
        self.assertEqual(upgraded["parcels"][0]["area"], 21234.567)
        self.assertEqual(upgraded["agreements"][0]["covered_area"], 21234.567)
        self.assertEqual(engine.validate_state(upgraded), upgraded)

    def test_preview_includes_other_parcels_for_timeline_and_named_sources(self):
        s = engine.new_project("Timeline")
        s, _ = engine.transition(s, "establish_access", land(s, parcel_name="My finca"))
        p = engine.preview(
            s, "establish_access", land(s, "lease", parcel_name="Neighbour's plot")
        )
        self.assertEqual(len(p["timeline_agreements"]), 2)
        self.assertEqual(
            [x["name"] for x in p["parcels"]], ["My finca", "Neighbour's plot"]
        )
        self.assertEqual(len(engine.land_form(s, "existing")["category_sources"]), 3)


if __name__ == "__main__":
    unittest.main()
