"""Per-plant pricing, confirmation, frozen histories and atomic editable defaults."""

from copy import deepcopy
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from uuid import uuid4

from fastapi.testclient import TestClient
from backend import engine, planting, demonstrator, plant_prices
from backend.app import create_app
from backend.storage import Store
from test_demonstrator import site


def values(state, selection=None, priced=True):
    data = {
        f["name"]: deepcopy(f["default"])
        for f in demonstrator.fields(state, "demo_plan", priced=priced)
    }
    data.update(
        funding_route="self", vegetation_system="woodland", water_plan="temporary"
    )
    if selection is not None:
        data["plant_selection"] = selection
    return data


class PlantPriceTests(unittest.TestCase):
    def test_individual_prices_confirmation_and_decimal_totals_survive_replay(self):
        state = site()
        before = deepcopy(state)
        v = values(
            state,
            {
                "version": 2,
                "entries": [
                    {
                        "id": "carob",
                        "quantity": 3,
                        "unit_cost": 0.1,
                        "price_confirmed": True,
                    },
                    {
                        "id": "wild_olive",
                        "quantity": 2,
                        "unit_cost": 7.35,
                        "price_confirmed": False,
                    },
                    {
                        "id": "lentisk",
                        "quantity": 4,
                        "unit_cost": 0,
                        "price_confirmed": True,
                    },
                    {
                        "id": "custom-a",
                        "label": "Local shrub",
                        "group": "shrub",
                        "quantity": 2,
                        "unit_cost": 1.15,
                        "price_confirmed": False,
                    },
                ],
            },
        )
        preview = engine.preview(state, "demonstrator", v)["demonstrator"]
        self.assertEqual(state, before)
        self.assertEqual(preview["budget"]["rows"][0]["amount"], 15)
        self.assertEqual(preview["budget"]["rows"][1]["amount"], 2.3)
        self.assertEqual(preview["planting"]["entries"][0]["line_total"], 0.3)
        new = engine.transition(state, "demonstrator", v)[0]
        self.assertEqual(engine.validate_state(new), new)
        with tempfile.TemporaryDirectory() as folder:
            store = Store(Path(folder) / "project.json")
            store.mutate(
                "import",
                0,
                str(uuid4()),
                dict(
                    save=dict(format_version=4, project=new, undo=state),
                    confirm_replace=False,
                ),
            )
            restarted = Store(store.path)
            self.assertEqual(
                restarted.snapshot()["project"]["demonstrator"]["plan"][
                    "plant_selection"
                ],
                v["plant_selection"],
            )
            self.assertEqual(
                restarted.export()["project"]["demonstrator"]["budget"],
                new["demonstrator"]["budget"],
            )

    def test_invalid_prices_or_confirmation_never_change_the_project(self):
        state = site()
        before = deepcopy(state)
        valid = {"id": "carob", "quantity": 2, "unit_cost": 6, "price_confirmed": False}
        bad_rows = [
            {**valid, "unit_cost": value}
            for value in [None, True, -1, 0.001, 1000001, float("nan"), float("inf")]
        ]
        bad_rows += [{**valid, "price_confirmed": value} for value in [None, 1, "yes"]]
        bad_rows += [
            {k: v for k, v in valid.items() if k != missing}
            for missing in ["unit_cost", "price_confirmed"]
        ]
        for row in bad_rows:
            with self.subTest(row=row), self.assertRaises(engine.Invalid):
                engine.transition(
                    state,
                    "demonstrator",
                    values(state, {"version": 2, "entries": [row]}),
                )
            self.assertEqual(state, before)

    def test_v1_checklist_adapter_uses_recorded_group_rates_without_rewriting_history(
        self,
    ):
        state = site()
        selection = {
            "version": 1,
            "entries": [
                {"id": "carob", "quantity": 2},
                {"id": "lentisk", "quantity": 3},
            ],
        }
        old = engine.transition(
            state,
            "demonstrator",
            {
                **values(state, selection, priced=False),
                "tree_unit_cost": 8.25,
                "shrub_unit_cost": 1.75,
            },
        )[0]
        before = deepcopy(old)
        field = next(
            f
            for f in demonstrator.fields(old, "demo_plan")
            if f["name"] == "plant_selection"
        )
        self.assertIn("shared tree/shrub rates", field["legacy_notice"])
        self.assertEqual(field["default"]["version"], 2)
        self.assertEqual(
            [e["unit_cost"] for e in field["default"]["entries"]], [8.25, 1.75]
        )
        self.assertTrue(
            all(e["price_confirmed"] is False for e in field["default"]["entries"])
        )
        self.assertIsNone(
            engine.summary(old)["demonstrator"]["planting"]["entries"][0][
                "price_confirmed"
            ]
        )
        self.assertEqual(engine.validate_state(old), before)
        self.assertEqual(old, before)

    def test_saved_defaults_only_affect_new_selections_not_recorded_plans(self):
        current = plant_prices.snapshot()
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "prices.json"
            path.write_text(
                json.dumps({k: v for k, v in current.items() if k != "revision"}),
                encoding="utf-8",
            )
            with patch.object(plant_prices, "path", return_value=path):
                state = site()
                old = engine.transition(state, "demonstrator", values(state))[0]
                before = deepcopy(old)
                rev = plant_prices.snapshot()["revision"]
                updated = plant_prices.update({"carob": 0, "wild_olive": 8.75}, rev)
                self.assertEqual(updated["unit_costs"]["carob"], 0)
                self.assertEqual(
                    updated["custom_unit_costs"], current["custom_unit_costs"]
                )
                self.assertEqual(
                    plant_prices.update({"carob": 0, "wild_olive": 8.75}, rev), updated
                )
                selection = planting.default_selection()
                self.assertEqual(selection["entries"][0]["unit_cost"], 0)
                self.assertFalse(selection["entries"][0]["price_confirmed"])
                self.assertEqual(engine.validate_state(old), before)
                reopened = values(old)["plant_selection"]
                self.assertEqual(
                    reopened, old["demonstrator"]["plan"]["plant_selection"]
                )

    def test_atomic_failure_and_conflicting_edits_preserve_defaults(self):
        original = {k: v for k, v in plant_prices.snapshot().items() if k != "revision"}
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "prices.json"
            path.write_text(json.dumps(original), encoding="utf-8")
            with patch.object(plant_prices, "path", return_value=path):
                rev = plant_prices.snapshot()["revision"]
                raw = path.read_bytes()
                with (
                    patch.object(
                        plant_prices.os, "replace", side_effect=OSError("blocked")
                    ),
                    self.assertRaisesRegex(
                        engine.Invalid, "Cannot save default plant prices"
                    ),
                ):
                    plant_prices.update({"carob": 9}, rev)
                self.assertEqual(path.read_bytes(), raw)
                self.assertEqual(list(Path(folder).glob("*.tmp")), [])
                plant_prices.update({"carob": 8}, rev)
                saved = path.read_bytes()
                with self.assertRaises(plant_prices.PriceConflict):
                    plant_prices.update({"carob": 10}, rev)
                self.assertEqual(path.read_bytes(), saved)
                for patch_prices in [
                    {"carob": None},
                    {"carob": True},
                    {"carob": 0.001},
                    {"custom-a": 2},
                    {},
                ]:
                    with (
                        self.subTest(prices=patch_prices),
                        self.assertRaises(engine.Invalid),
                    ):
                        plant_prices.update(
                            patch_prices, plant_prices.snapshot()["revision"]
                        )
                    self.assertEqual(path.read_bytes(), saved)

    def test_missing_malformed_or_incomplete_price_configuration_is_not_repaired(self):
        original = {k: v for k, v in plant_prices.snapshot().items() if k != "revision"}
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "prices.json"
            with patch.object(plant_prices, "path", return_value=path):
                with self.assertRaises(engine.Invalid):
                    plant_prices.snapshot()
                for raw in ["{broken", '{"version":1,"version":1}']:
                    path.write_text(raw, encoding="utf-8")
                    with self.assertRaises(engine.Invalid):
                        plant_prices.snapshot()
                for alter in [
                    lambda data: data["unit_costs"].pop("carob"),
                    lambda data: data.update(version=99),
                    lambda data: data.update(currency="USD"),
                ]:
                    data = deepcopy(original)
                    alter(data)
                    path.write_text(json.dumps(data), encoding="utf-8")
                    with self.assertRaises(engine.Invalid):
                        plant_prices.snapshot()

    def test_api_updates_defaults_without_mutating_the_active_save(self):
        original = {k: v for k, v in plant_prices.snapshot().items() if k != "revision"}
        with tempfile.TemporaryDirectory() as folder:
            prices = Path(folder) / "prices.json"
            prices.write_text(json.dumps(original), encoding="utf-8")
            with patch.object(plant_prices, "path", return_value=prices):
                save = Path(folder) / "project.json"
                client = TestClient(create_app(save))
                imported = client.post(
                    "/api/import",
                    json=dict(
                        revision=0,
                        request_id=str(uuid4()),
                        confirm_replace=False,
                        save=dict(format_version=4, project=site(), undo=None),
                    ),
                )
                self.assertEqual(imported.status_code, 200, imported.text)
                raw = save.read_bytes()
                rev = client.get("/api/plant-prices").json()["revision"]
                response = client.post(
                    "/api/plant-prices",
                    json=dict(expected_revision=rev, unit_costs={"carob": 7.25}),
                )
                self.assertEqual(response.status_code, 200, response.text)
                self.assertEqual(response.json()["unit_costs"]["carob"], 7.25)
                self.assertEqual(save.read_bytes(), raw)
                conflict = client.post(
                    "/api/plant-prices",
                    json=dict(expected_revision=rev, unit_costs={"carob": 8}),
                )
                self.assertEqual(conflict.status_code, 409)
                field = next(
                    f
                    for a in client.get("/api/project").json()["actions"]
                    if a["id"] == "demonstrator"
                    for f in a["fields"]
                    if f["name"] == "plant_selection"
                )
                self.assertEqual(field["default"]["entries"][0]["unit_cost"], 7.25)
                self.assertFalse(field["default"]["entries"][0]["price_confirmed"])
