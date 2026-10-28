"""Defaults are required configuration, not substitutes for malformed state."""

from copy import deepcopy
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from uuid import uuid4
from fastapi.testclient import TestClient
from backend import configuration, engine, planting, demonstrator
from backend.app import create_app
from test_demonstrator import site


class ConfigurationTests(unittest.TestCase):
    def test_missing_malformed_and_duplicate_config_are_errors(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "defaults.json"
            with self.assertRaisesRegex(engine.Invalid, "required configuration"):
                configuration.load_defaults(path)
            for raw in ("{broken", '{"version":1,"version":1}'):
                path.write_text(raw, encoding="utf-8")
                with self.assertRaises(engine.Invalid):
                    configuration.load_defaults(path)

    def test_required_defaults_and_versions_are_not_repaired(self):
        original = configuration.load_defaults()
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "defaults.json"
            for alter in [
                lambda d: d["forms"]["land"]["existing"].pop("covered_area"),
                lambda d: d["forms"]["demonstrator"]["plan"].pop("tree_unit_cost"),
                lambda d: d.update(version=99),
                lambda d: d["forms"]["land"]["existing"].update(parcel_area=True),
                lambda d: d["forms"]["land"]["existing"].update(covered_area=5000),
                lambda d: d["forms"]["demonstrator"]["plan"].update(
                    tree_unit_cost=1.001
                ),
                lambda d: d["forms"]["demonstrator"]["records"]["demo_award"].update(
                    decision="invented"
                ),
                lambda d: d["forms"]["planting"].update(custom_group={}),
                lambda d: d["client"].update(theme="invisible"),
                lambda d: d["runtime"].update(save_path=""),
            ]:
                changed = deepcopy(original)
                alter(changed)
                path.write_text(json.dumps(changed), encoding="utf-8")
                with self.subTest(config=changed), self.assertRaises(engine.Invalid):
                    configuration.load_defaults(path)

    def test_json_values_apply_and_zero_is_preserved_without_replacing_snapshot(self):
        previous = engine.new_project("Original snapshot")
        changed = configuration.load_defaults()
        changed["forms"]["land"]["existing"].update(parcel_area=6000, covered_area=300)
        changed["forms"]["demonstrator"]["plan"].update(
            restoration_area=150, tree_unit_cost=0
        )
        changed["forms"]["planting"].update(custom_quantity=4)
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "changed.json"
            path.write_text(json.dumps(changed), encoding="utf-8")
            with patch.object(configuration, "DEFAULTS_PATH", path):
                new = engine.new_project("New snapshot")
            v = {
                f["name"]: f["default"]
                for f in engine.land_form(new, "existing")["fields"]
            }
            self.assertEqual((v["parcel_area"], v["covered_area"]), (6000, 300))
            new = engine.transition(
                new,
                "establish_access",
                {**v, "route_id": "existing", "parcel_id": "new"},
            )[0]
            # Shared rates remain the explicit compatibility contract for old plans.
            v = {
                f["name"]: f["default"]
                for f in demonstrator.fields(new, "demo_plan", legacy=True)
            }
            self.assertEqual(v["restoration_area"], 150)
            self.assertEqual(v["tree_unit_cost"], 0)
            new = engine.transition(new, "demonstrator", v)[0]
            self.assertEqual(new["demonstrator"]["budget"]["rows"][0]["amount"], 0)
            self.assertEqual(engine.validate_state(new), new)
        original_form = {
            f["name"]: f["default"]
            for f in engine.land_form(previous, "existing")["fields"]
        }
        self.assertEqual(
            original_form["parcel_area"],
            previous["scenario"]["input_defaults"]["land"]["existing"]["parcel_area"],
        )

    def test_snapshot_missing_a_required_field_is_not_treated_as_legacy(self):
        original = engine.new_project("Strict snapshot")
        for key in ("input_defaults", "form_schema_version"):
            bad = deepcopy(original)
            del bad["scenario"][key]
            with self.subTest(key=key), self.assertRaises(engine.Invalid):
                engine.validate_state(bad)
        bad = deepcopy(original)
        del bad["scenario"]["input_defaults"]["demonstrator"]["plan"]["tree_unit_cost"]
        with self.assertRaisesRegex(engine.Invalid, "tree_unit_cost"):
            engine.validate_state(bad)

    def test_missing_catalogue_and_missing_legacy_adapter_do_not_use_other_data(self):
        with tempfile.TemporaryDirectory() as folder:
            missing = Path(folder) / "missing.json"
            with (
                patch.object(planting, "CATALOG_PATH", missing),
                self.assertRaises(engine.Invalid),
            ):
                configuration.load_defaults()
            old = engine.load_scenario()
            del old["form_schema_version"]
            del old["input_defaults"]
            with (
                patch.object(configuration, "LEGACY_FORMS_PATH", missing),
                self.assertRaises(engine.Invalid),
            ):
                configuration.forms_for(old)

    def test_legacy_form_adapter_is_explicit_and_does_not_rewrite_project(self):
        scenario = engine.load_scenario()
        del scenario["form_schema_version"]
        del scenario["input_defaults"]
        state = engine.new_project("Earlier schema", scenario)
        before = deepcopy(state)
        with tempfile.TemporaryDirectory() as folder:
            client = TestClient(create_app(Path(folder) / "s.json"))
            r = client.post(
                "/api/import",
                json=dict(
                    revision=0,
                    request_id=str(uuid4()),
                    confirm_replace=False,
                    save=dict(format_version=4, project=state, undo=None),
                ),
            )
            self.assertEqual(r.status_code, 200, r.text)
            self.assertEqual(r.json()["configuration_mode"], "legacy-v4-form-adapter")
            self.assertIsNotNone(r.json()["configuration_notice"])
            self.assertNotIn("input_defaults", r.json()["project"]["scenario"])
        self.assertEqual(state, before)

    def test_bad_config_import_preserves_project_and_disk(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "s.json"
            client = TestClient(create_app(path))
            state = site()
            req = dict(
                revision=0,
                request_id=str(uuid4()),
                confirm_replace=False,
                save=dict(format_version=4, project=state, undo=None),
            )
            before = client.post("/api/import", json=req).json()
            raw = path.read_bytes()
            bad = deepcopy(before["project"])
            del bad["scenario"]["input_defaults"]["land"]["existing"]["parcel_area"]
            req.update(
                revision=before["revision"],
                request_id=str(uuid4()),
                confirm_replace=True,
                save=dict(format_version=4, project=bad, undo=None),
            )
            failed = client.post("/api/import", json=req)
            self.assertEqual(failed.status_code, 422, failed.text)
            self.assertIn("parcel_area", failed.json()["detail"])
            self.assertEqual(
                client.get("/api/project").json()["project"], before["project"]
            )
            self.assertEqual(path.read_bytes(), raw)

    def test_empty_explicit_save_path_is_rejected_instead_of_using_default(self):
        with patch.dict(os.environ, {"RESTORATION_SAVE_PATH": ""}):
            with self.assertRaisesRegex(engine.Invalid, "save path is empty"):
                create_app()
        with self.assertRaisesRegex(engine.Invalid, "save path is empty"):
            create_app("")


if __name__ == "__main__":
    unittest.main()
