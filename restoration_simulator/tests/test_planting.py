"""Checklist quantities must survive previews, replay and persistence exactly."""

from copy import deepcopy
from pathlib import Path
import tempfile
import unittest
from uuid import uuid4
from fastapi.testclient import TestClient
from backend import engine, demonstrator, planting
from backend.app import create_app
from backend.storage import Store, validate_export
from test_demonstrator import site, planned, baseline, step


def inputs(state, **changes):
    priced = not (
        "plant_selection" in changes and changes["plant_selection"]["version"] == 1
    )
    return {
        **{
            f["name"]: deepcopy(f["default"])
            for f in demonstrator.fields(state, "demo_plan", priced=priced)
        },
        "funding_route": "self",
        "vegetation_system": "woodland",
        "water_plan": "temporary",
        **changes,
    }


class PlantChecklistTests(unittest.TestCase):
    def test_expanded_catalogue_preserves_original_entries_and_legacy_resolution(self):
        original = planting.catalogue(1)
        current = planting.catalogue(2)
        original_ids = {plant["id"] for plant in original["plants"]}
        self.assertEqual(len(original_ids), 13)
        self.assertEqual(
            [plant for plant in current["plants"] if plant["id"] in original_ids],
            original["plants"],
        )
        additions = {"rosemary", "rhamnus_lycioides", "ephedra_fragilis", "kermes_oak", "holm_oak", "phillyrea_angustifolia", "phillyrea_latifolia", "myrtle", "terebinth", "cork_oak"}
        self.assertEqual({p["id"] for p in current["plants"]} - original_ids, additions)
        scrub = next(m for m in current["mixes"] if m["id"] == "scrub")
        self.assertEqual(len(scrub["plant_ids"]), 6)
        self.assertTrue({"rosemary", "rhamnus_lycioides", "ephedra_fragilis"} <= set(scrub["plant_ids"]))
        for version in [0, 3, True, None]:
            with self.subTest(version=version), self.assertRaises(engine.Invalid):
                planting.catalogue(version)
        with self.assertRaises(engine.Invalid):
            planting.resolve({"version": 1, "entries": [{"id": "rosemary", "quantity": 1}]})

    def test_added_species_keep_prices_quantities_and_confirmation_through_replay(self):
        state = site()
        selection = {
            "version": 2,
            "entries": [
                {"id": "rosemary", "quantity": 2, "unit_cost": 1.25, "price_confirmed": True},
                {"id": "rhamnus_lycioides", "quantity": 3, "unit_cost": 0, "price_confirmed": False},
                {"id": "ephedra_fragilis", "quantity": 4, "unit_cost": 3.75, "price_confirmed": True},
            ],
        }
        values = inputs(state, vegetation_system="scrub", plant_selection=selection)
        preview = engine.preview(state, "demonstrator", values)["demonstrator"]
        self.assertEqual((preview["plan"]["trees"], preview["plan"]["shrubs"]), (0, 9))
        self.assertEqual(sum(p["line_total"] for p in preview["planting"]["entries"]), 17.5)
        committed = engine.transition(state, "demonstrator", values)[0]
        self.assertEqual(engine.validate_state(committed), committed)
        self.assertEqual(inputs(committed)["plant_selection"], selection)
        self.assertEqual(state["cash"], committed["cash"])
        self.assertEqual(committed["history"][-1]["inputs"]["plant_selection"], selection)

    def test_species_counts_drive_budget_and_preview_is_read_only(self):
        state = site()
        before = deepcopy(state)
        v = inputs(
            state,
            plant_selection={
                "version": 1,
                "entries": [
                    {"id": "carob", "quantity": 2},
                    {"id": "lentisk", "quantity": 3},
                    {"id": "esparto", "quantity": 4},
                    {
                        "id": "custom-native",
                        "label": "Locally identified native shrub",
                        "group": "shrub",
                        "quantity": 5,
                    },
                ],
            },
        )
        preview = engine.preview(state, "demonstrator", v)["demonstrator"]
        self.assertEqual(state, before)
        self.assertEqual((preview["plan"]["trees"], preview["plan"]["shrubs"]), (2, 12))
        self.assertEqual(preview["budget"]["installation"], 513)
        self.assertEqual(preview["budget"]["total"], 713)
        self.assertEqual(len(preview["planting"]["entries"]), 4)
        self.assertEqual(len(preview["planting"]["questions"]), 2)
        new = engine.transition(state, "demonstrator", v)[0]
        self.assertEqual(new["cash"], state["cash"])
        self.assertEqual(new["history"][-1]["inputs"], v)
        self.assertEqual(engine.validate_state(new), new)

    def test_checkbox_default_and_saved_plan_restore_exact_species_quantities(self):
        state = site()
        v = inputs(state)
        self.assertEqual(planting.resolve(v["plant_selection"])["trees"], 10)
        new = engine.transition(state, "demonstrator", v)[0]
        self.assertEqual(new["demonstrator"]["budget"]["total"], 845)
        self.assertEqual(inputs(new)["plant_selection"], v["plant_selection"])
        self.assertEqual(new["demonstrator"]["plan"]["shrubs"], 30)
        questions = engine.summary(new)["demonstrator"]["planting"]["questions"]
        self.assertEqual(len(questions), 1)
        self.assertIn("unconfirmed estimates", questions[0])

    def test_invalid_entries_and_aggregate_injection_are_atomic(self):
        state = site()
        original = deepcopy(state)
        custom = {
            "id": "custom-a",
            "label": "Native plant",
            "group": "shrub",
            "quantity": 1,
        }
        invalid = [
            {"version": True, "entries": [{"id": "carob", "quantity": 1}]},
            {"version": 2, "entries": [{"id": "carob", "quantity": 1}]},
            {"version": 1, "entries": []},
        ]
        invalid += [
            {"version": 1, "entries": [{"id": "carob", "quantity": q}]}
            for q in [True, None, 0, -1, 1.5, 1000001]
        ]
        invalid += [
            {"version": 1, "entries": rows}
            for rows in [
                [{"id": "carob", "quantity": 1}, {"id": "carob", "quantity": 2}],
                [{"id": "unknown", "quantity": 1}],
                [{"id": "carob", "quantity": 1, "group": "grass"}],
                [{**custom, "group": {}}],
                [{**custom, "label": "  "}],
                [custom, {**custom, "id": "custom-b", "label": "NATIVE PLANT"}],
                [{**custom, "label": "Carob"}, {"id": "carob", "quantity": 1}],
            ]
        ]
        for value in invalid:
            with self.subTest(value=value), self.assertRaises(engine.Invalid):
                engine.transition(
                    state, "demonstrator", inputs(state, plant_selection=value)
                )
            self.assertEqual(state, original)
        with self.assertRaises(engine.Invalid):
            engine.transition(state, "demonstrator", inputs(state, trees=999))

    def test_old_v4_plans_replay_without_inventing_species_and_can_be_revised(self):
        old = planned(plant_mix="Custom local mixture", trees=4, shrubs=12)
        self.assertEqual(engine.validate_state(old), old)
        self.assertIsNone(engine.summary(old)["demonstrator"]["planting"])
        field = next(
            f
            for f in demonstrator.fields(old, "demo_plan")
            if f["name"] == "plant_selection"
        )
        self.assertEqual(field["default"]["entries"], [])
        self.assertIn("No species quantities were recorded", field["legacy_notice"])
        new = engine.transition(
            old,
            "demonstrator",
            inputs(old, plant_selection=planting.default_selection()),
        )[0]
        self.assertEqual(new["history"][:-1], old["history"])
        self.assertEqual(new["demonstrator"]["plan"]["trees"], 10)
        self.assertEqual(engine.validate_state(new), new)

    def test_selected_species_survive_installation_followup_export_restart_and_undo(
        self,
    ):
        state = site()
        before = engine.transition(state, "demonstrator", inputs(state))[0]
        installed = step(
            baseline(before), "install_demonstrator", confirmation="confirmed"
        )
        previous = step(installed, "advance", target_year=1.25)
        observed = step(
            previous,
            "monitor_demonstrator",
            basis="illustrative",
            surviving_trees=8,
            surviving_shrubs=24,
        )
        self.assertEqual(engine.validate_state(observed), observed)
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "save.json"
            store = Store(path)
            store.mutate(
                "import",
                0,
                str(uuid4()),
                dict(
                    save=dict(format_version=4, project=observed, undo=previous),
                    confirm_replace=False,
                ),
            )
            saved = store.snapshot()
            self.assertEqual(Store(path).snapshot(), saved)
            self.assertEqual(
                validate_export(store.export())["project"], saved["project"]
            )
            undone, _ = Store(path).mutate("undo", saved["revision"], str(uuid4()), {})
            self.assertEqual(
                undone["project"]["demonstrator"]["plan"]["plant_selection"],
                before["demonstrator"]["plan"]["plant_selection"],
            )
        bad = deepcopy(observed)
        bad["demonstrator"]["plan"]["plant_selection"]["entries"][0]["quantity"] = 99
        with self.assertRaises(engine.Invalid):
            engine.validate_state(bad)

    def test_api_exposes_catalogue_and_checks_list_preview_without_autosaving(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "api.json"
            state = site()
            with TestClient(create_app(path)) as client:
                result = client.post(
                    "/api/import",
                    json=dict(
                        save=dict(format_version=4, project=state, undo=None),
                        revision=0,
                        request_id=str(uuid4()),
                        confirm_replace=False,
                    ),
                )
                self.assertEqual(result.status_code, 200, result.text)
                data = result.json()
                action = next(a for a in data["actions"] if a["id"] == "demonstrator")
                field = next(
                    f for f in action["fields"] if f["type"] == "plant_selection"
                )
                self.assertEqual(len(field["catalogue"]["mixes"]), 4)
                self.assertEqual(field["catalogue"]["version"], 2)
                self.assertEqual(len(field["catalogue"]["plants"]), 23)
                raw = path.read_bytes()
                v = inputs(state)
                preview = client.post(
                    "/api/preview",
                    json=dict(
                        revision=data["revision"], action_id="demonstrator", inputs=v
                    ),
                )
                self.assertEqual(preview.status_code, 200, preview.text)
                self.assertEqual(path.read_bytes(), raw)
                self.assertEqual(preview.json()["demonstrator"]["budget"]["total"], 845)


if __name__ == "__main__":
    unittest.main()
