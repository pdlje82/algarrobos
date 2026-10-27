"""The guided pilot keeps planning, physical work, evidence and funding distinct."""

from copy import deepcopy
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from uuid import uuid4
from fastapi.testclient import TestClient
from backend import engine, engine_v3
from backend.app import create_app
from backend.storage import Store, validate_export


def values(state, action, **changes):
    definition = next(a for a in engine.list_actions(state) if a["id"] == action)
    return {**{f["name"]: f["default"] for f in definition["fields"]}, **changes}


def step(state, action, **changes):
    return engine.transition(state, action, values(state, action, **changes))[0]


def site(route="existing", **changes):
    state = engine.new_project("Planting pilot")
    fields = engine.land_form(state, route)["fields"]
    v = {f["name"]: f["default"] for f in fields}
    v.update(
        route_id=route, parcel_id="new", parcel_area=400, covered_area=400, **changes
    )
    return engine.transition(state, "establish_access", v)[0]


def planned(route="self", state=None, **changes):
    state = site() if state is None else state
    defaults = dict(
        funding_route=route,
        vegetation_system="woodland",
        plant_mix="woodland",
        water_plan="temporary",
        municipality="Alhama de Almería",
        applicant_id="partner",
        novelty="new_locally",
        public_participation="open_demo",
    )
    return step(state, "demonstrator", **{**defaults, **changes})


def baseline(state):
    return step(
        state,
        "baseline_demonstrator",
        site_ready="ready",
        basis="illustrative",
        photo_points="recorded",
    )


def awarded():
    s = baseline(planned("al20_34"))
    s = step(s, "review_demo_funding", feedback="positive", basis="illustrative")
    s = step(s, "apply_grant", not_started="confirmed", basis="illustrative")
    return step(
        s, "award_grant", decision="awarded", award_amount=845, basis="illustrative"
    )


def installed(funded=False):
    return step(
        awarded() if funded else baseline(planned()),
        "install_demonstrator",
        confirmation="confirmed",
    )


def evaluated(funded=False):
    s = installed(funded)
    s = step(s, "advance", target_year=s["demonstrator"]["followup_due"])
    s = step(
        s,
        "monitor_demonstrator",
        basis="illustrative",
        surviving_trees=8,
        surviving_shrubs=24,
    )
    return step(
        s,
        "evaluate_demonstrator",
        basis="illustrative",
        shared="published",
        reference="Illustrative public results report",
    )


class DemonstratorTests(unittest.TestCase):
    def test_plan_is_read_only_in_preview_and_commit_does_not_plant_or_spend(self):
        s = site()
        before = deepcopy(s)
        v = values(
            s,
            "demonstrator",
            vegetation_system="Custom dryland system",
            plant_mix="Locally reviewed species mix",
        )
        p = engine.preview(s, "demonstrator", v)
        self.assertEqual(s, before)
        s, _ = engine.transition(s, "demonstrator", v)
        self.assertEqual(s["cash"], 60000)
        self.assertEqual(s["time"], 0)
        self.assertEqual(s["activities"], [])
        self.assertEqual(
            p["demonstrator"]["plan"]["plant_mix"], "Locally reviewed species mix"
        )
        self.assertEqual(s["grant"]["status"], "not_applied")
        self.assertTrue(
            p["demonstrator"]["fit"]["issues"]
        )  # private individual default
        self.assertEqual(engine.validate_state(s), s)

    def test_itemised_budget_and_small_plot_workflow(self):
        s = planned()
        self.assertEqual(s["demonstrator"]["budget"]["installation"], 645)
        self.assertEqual(s["demonstrator"]["budget"]["total"], 845)
        s = baseline(s)
        s = step(s, "install_demonstrator", confirmation="confirmed")
        self.assertEqual((s["time"], s["cash"]), (0.25, 59355))
        self.assertEqual(engine.summary(s)["restored_area"], 200)
        self.assertEqual(s["demonstrator"]["status"], "installed")
        self.assertIsNone(s["demonstrator"]["observation"])
        self.assertEqual(s["demonstrator"]["followup_due"], 1.25)
        s = step(s, "advance", target_year=1.25)
        s = step(
            s,
            "monitor_demonstrator",
            basis="observed",
            surviving_trees=8,
            surviving_shrubs=24,
        )
        self.assertEqual(s["demonstrator"]["observation"]["survival_percent"], 80)
        self.assertEqual(s["cash"], 59255)
        s = step(s, "evaluate_demonstrator", basis="observed", conclusion="mixed")
        self.assertEqual(s["cash"], 59155)
        self.assertEqual(s["demonstrator"]["evaluation"]["conclusion"], "mixed")
        self.assertEqual(s["grant"]["amount"], 0)
        self.assertEqual(engine.validate_state(s), s)

    def test_al20_award_is_explicit_and_payment_follows_spending_and_results(self):
        s = awarded()
        self.assertEqual(s["cash"], 60000)
        self.assertEqual(s["grant"]["amount"], 845)
        with self.assertRaises(engine.Invalid):
            step(
                s,
                "receive_payment",
                eligibility_confirmed="confirmed",
                basis="illustrative",
            )
        s = evaluated(True)
        self.assertEqual(s["cash"], 59155)
        before = deepcopy(s)
        for change in [
            dict(received_amount=846),
            dict(received_amount=True),
            dict(eligibility_confirmed="pending"),
        ]:
            with self.assertRaises(engine.Invalid):
                step(
                    s,
                    "receive_payment",
                    eligibility_confirmed=change.get(
                        "eligibility_confirmed", "confirmed"
                    ),
                    basis="illustrative",
                    **{k: v for k, v in change.items() if k != "eligibility_confirmed"},
                )
            self.assertEqual(s, before)
        s = step(
            s,
            "receive_payment",
            eligibility_confirmed="confirmed",
            basis="illustrative",
        )
        self.assertEqual(s["cash"], 60000)
        self.assertEqual(s["grant"]["status"], "paid")
        with self.assertRaises(engine.Invalid):
            step(
                s,
                "receive_payment",
                eligibility_confirmed="confirmed",
                basis="illustrative",
            )
        self.assertEqual(engine.validate_state(s), s)

    def test_pending_and_declined_decisions_never_create_cash(self):
        s = baseline(planned("al20_34"))
        s = step(s, "review_demo_funding", feedback="positive", basis="illustrative")
        s = step(s, "apply_grant", not_started="confirmed", basis="illustrative")
        s = step(s, "award_grant")
        self.assertEqual((s["cash"], s["grant"]["status"]), (60000, "applied"))
        s = step(s, "award_grant", decision="declined", basis="illustrative")
        self.assertEqual((s["cash"], s["grant"]["status"]), (60000, "declined"))
        self.assertIn("declined", engine.summary(s)["grant_explanation"])
        s = step(
            s, "demonstrator", **{**s["demonstrator"]["plan"], "funding_route": "self"}
        )
        self.assertEqual(s["grant"]["status"], "not_applied")
        self.assertIsNone(s["demonstrator"]["baseline"])

    def test_hard_funding_mismatches_cannot_be_overridden_by_feedback(self):
        for change in [
            dict(applicant_id="individual"),
            dict(municipality="outside"),
            dict(purpose="commercial"),
            dict(novelty="established"),
            dict(public_participation="private"),
            dict(dissemination="none"),
        ]:
            with self.subTest(change=change):
                s = planned("al20_34", **change)
                s = step(
                    s,
                    "review_demo_funding",
                    feedback="positive",
                    basis="observed",
                    reference="Reported AL20 discussion",
                )
                with self.assertRaises(engine.Invalid):
                    step(
                        s, "apply_grant", not_started="confirmed", basis="illustrative"
                    )

    def test_custom_eligibility_details_need_referenced_feedback(self):
        s = planned("al20_34", novelty="Custom planting-establishment experiment")
        s = step(s, "review_demo_funding", feedback="positive", basis="illustrative")
        with self.assertRaises(engine.Invalid):
            step(s, "apply_grant", not_started="confirmed", basis="illustrative")
        with self.assertRaises(engine.Invalid):
            step(s, "review_demo_funding", feedback="positive", basis="observed")
        s = step(
            s,
            "review_demo_funding",
            feedback="positive",
            basis="observed",
            reference="User-reported AL20 classification, reference X",
        )
        s = step(s, "apply_grant", not_started="confirmed", basis="observed")
        self.assertEqual(s["grant"]["status"], "applied")
        with self.assertRaises(engine.Invalid):
            step(s, "demonstrator")

    def test_start_conditions_requested_amounts_and_caps_are_validated(self):
        s = planned("al20_34")
        s = step(s, "review_demo_funding", feedback="positive", basis="illustrative")
        for change in [
            dict(not_started="started"),
            dict(requested_amount=846),
            dict(requested_amount=28001),
            dict(requested_amount=-1),
            dict(requested_amount=1.001),
        ]:
            v = dict(not_started="confirmed", basis="illustrative")
            v.update(change)
            with self.assertRaises(engine.Invalid):
                step(s, "apply_grant", **v)
        s = step(s, "apply_grant", not_started="confirmed", basis="illustrative")
        with self.assertRaises(engine.Invalid):
            step(
                s,
                "award_grant",
                decision="awarded",
                award_amount=846,
                basis="illustrative",
            )
        with self.assertRaises(engine.Invalid):
            step(
                s, "award_grant", decision="awarded", award_amount=845, basis="observed"
            )

    def test_baseline_and_monitoring_permission_are_required_before_planting(self):
        s = planned()
        with self.assertRaises(engine.Invalid):
            step(s, "install_demonstrator", confirmation="confirmed")
        s = step(s, "baseline_demonstrator", site_ready="ready", basis="illustrative")
        with self.assertRaises(engine.Invalid):
            step(s, "install_demonstrator", confirmation="confirmed")
        s = planned(state=site(allow_monitoring="unknown"))
        s = baseline(s)
        with self.assertRaises(engine.Invalid):
            step(s, "install_demonstrator", confirmation="confirmed")

    def test_access_must_extend_past_the_followup_boundary(self):
        s = planned(state=site("free_use", term_years=1), followup_years=0.75)
        s = baseline(s)  # would finish at the exact access expiry: insufficient
        with self.assertRaises(engine.Invalid):
            step(s, "install_demonstrator", confirmation="confirmed")
        s = step(
            s,
            "renew_access",
            agreement_id="agreement-1",
            term_years=2,
            commitment_years=0,
        )
        s = step(s, "install_demonstrator", confirmation="confirmed")
        self.assertEqual(s["demonstrator"]["status"], "installed")

    def test_observations_are_not_generated_by_advancing_time(self):
        s = installed()
        with self.assertRaises(engine.Invalid):
            step(
                s,
                "monitor_demonstrator",
                basis="illustrative",
                surviving_trees=8,
                surviving_shrubs=24,
            )
        s = step(s, "advance", target_year=s["demonstrator"]["followup_due"])
        self.assertIsNone(s["demonstrator"]["observation"])
        before = deepcopy(s)
        for change in [
            dict(surviving_trees=11, surviving_shrubs=24),
            dict(surviving_trees=8, surviving_shrubs=31),
            dict(surviving_trees=8, surviving_shrubs=24, cover_percent=101),
        ]:
            with self.assertRaises(engine.Invalid):
                step(s, "monitor_demonstrator", basis="illustrative", **change)
            self.assertEqual(s, before)
        with self.assertRaises(engine.Invalid):
            step(s, "monitor_demonstrator")

    def test_unaffordable_stage_is_atomic_and_bad_inputs_are_rejected(self):
        s = site()
        before = deepcopy(s)
        for change in [
            dict(trees=True),
            dict(trees=1.5),
            dict(restoration_area=401),
            dict(tree_unit_cost=1.001),
            dict(installation_years=0),
            dict(trees=0, shrubs=0),
        ]:
            with self.assertRaises(engine.Invalid):
                step(s, "demonstrator", **change)
            self.assertEqual(s, before)
        scenario = engine.load_scenario()
        scenario["initial_cash"] = 700
        s = engine.new_project("Limited", scenario)
        v = {f["name"]: f["default"] for f in engine.land_form(s, "existing")["fields"]}
        v.update(route_id="existing", parcel_id="new")
        s = engine.transition(s, "establish_access", v)[0]
        s = step(
            baseline(planned(state=s)), "install_demonstrator", confirmation="confirmed"
        )
        s = step(s, "advance", target_year=s["demonstrator"]["followup_due"])
        before = deepcopy(s)
        with self.assertRaises(engine.Invalid):
            step(
                s,
                "monitor_demonstrator",
                basis="illustrative",
                surviving_trees=5,
                surviving_shrubs=20,
            )
        self.assertEqual(s, before)

    def test_funded_and_self_financed_runs_finish_with_optional_expansion(self):
        for funded in [False, True]:
            s = evaluated(funded)
            if funded:
                s = step(
                    s,
                    "receive_payment",
                    eligibility_confirmed="confirmed",
                    basis="illustrative",
                )
            s = step(s, "expand", parcel_id="parcel-1", restoration_area=200)
            s = step(s, "company")
            s = step(s, "foundation")
            s = step(s, "advance", target_year=30)
            self.assertEqual(engine.summary(s)["restored_area"], 400)
            self.assertEqual(engine.validate_state(s), s)

    def test_budget_observation_and_original_snapshot_tampering_is_rejected(self):
        s = evaluated()
        for collection, key, val in [
            ("budget", "installation", 0),
            ("observation", "survival_percent", 100),
            ("plan", "trees", 100),
        ]:
            bad = deepcopy(s)
            bad["demonstrator"][collection][key] = val
            with self.assertRaises(engine.Invalid):
                engine.validate_state(bad)

    def test_partial_single_payment_is_not_presented_as_the_full_award(self):
        s = evaluated(True)
        s = step(
            s,
            "receive_payment",
            received_amount=800,
            eligibility_confirmed="confirmed",
            basis="illustrative",
        )
        report = engine.summary(s)
        self.assertIn("€800.00", report["grant_explanation"])
        self.assertIn("€845.00", report["grant_explanation"])
        self.assertEqual(
            report["demonstrator"]["funding_record"]["received_amount"], 800
        )
        self.assertEqual(engine.validate_state(s), s)

    def test_observation_and_evaluation_can_be_recorded_at_year_30(self):
        s = step(site(), "advance", target_year=28.75)
        s = step(
            baseline(planned(state=s)), "install_demonstrator", confirmation="confirmed"
        )
        s = step(s, "advance", target_year=30)
        s = step(
            s,
            "monitor_demonstrator",
            basis="illustrative",
            surviving_trees=5,
            surviving_shrubs=15,
        )
        s = step(s, "evaluate_demonstrator", basis="illustrative", conclusion="mixed")
        self.assertTrue(engine.summary(s)["complete"])
        self.assertEqual(s["demonstrator"]["status"], "evaluated")
        self.assertEqual(engine.validate_state(s), s)


class DemonstratorPersistenceTests(unittest.TestCase):
    def test_v3_upgrade_preserves_history_cash_undo_and_legacy_grant(self):
        s = engine_v3.new_project("Original journey")
        v = {
            f["name"]: f["default"]
            for f in engine_v3.land_form(s, "existing")["fields"]
        }
        v.update(route_id="existing", parcel_id="new")
        before = engine_v3.transition(s, "establish_access", v)[0]
        old = engine_v3.transition(
            before, "demonstrator", dict(parcel_id="parcel-1", restoration_area=10000)
        )[0]
        envelope = dict(
            format_version=3,
            project=old,
            undo=before,
            receipts={"prior": "fingerprint"},
            revision=old["revision"],
        )
        raw = json.dumps(envelope, ensure_ascii=False).encode()
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "active.json"
            path.write_bytes(raw)
            store = Store(path)
            current = store.snapshot()
            self.assertEqual(current["format_version"], 4)
            self.assertEqual(current["project"]["history"], old["history"])
            self.assertEqual(current["project"]["cash"], old["cash"])
            self.assertTrue(current["project"]["demonstrator"]["legacy"])
            self.assertEqual(
                next(Path(folder).glob("*.schema-v3-*.json")).read_bytes(), raw
            )
            self.assertEqual(engine.validate_state(current["undo"]), current["undo"])
            self.assertEqual(Store(path).snapshot(), current)
            self.assertEqual(
                validate_export(store.export())["project"], current["project"]
            )
            restored, _ = store.mutate("undo", current["revision"], str(uuid4()), {})
            self.assertEqual(restored["project"]["activities"], [])
            self.assertEqual(restored["project"]["cash"], before["cash"])
        # Empty / pre-pilot old projects receive the new guided workflow.
        upgraded = engine.validate_state(before)
        self.assertFalse(upgraded["scenario"]["legacy_workflow"])
        self.assertEqual(
            next(a for a in engine.list_actions(upgraded) if a["id"] == "demonstrator")[
                "kind"
            ],
            "demo_plan",
        )

    def test_v4_export_import_restart_and_saved_undo_after_observations(self):
        project = evaluated(True)
        undo = installed(True)
        # Use a real adjacent snapshot to retain one-level undo semantics.
        previous = step(
            undo, "advance", target_year=undo["demonstrator"]["followup_due"]
        )
        latest = step(
            previous,
            "monitor_demonstrator",
            basis="illustrative",
            surviving_trees=8,
            surviving_shrubs=24,
        )
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "save.json"
            store = Store(path)
            store.mutate(
                "import",
                0,
                str(uuid4()),
                dict(
                    save=dict(format_version=4, project=latest, undo=previous),
                    confirm_replace=False,
                ),
            )
            saved = store.snapshot()
            self.assertEqual(Store(path).snapshot(), saved)
            restored, _ = Store(path).mutate(
                "undo", saved["revision"], str(uuid4()), {}
            )
            self.assertEqual(restored["project"]["demonstrator"]["status"], "installed")
            self.assertIsNone(restored["project"]["demonstrator"]["observation"])

    def test_failed_v3_upgrade_preserves_original_and_v4_preview_does_not_save(self):
        old = engine_v3.new_project("Original")
        raw = json.dumps(
            dict(format_version=3, project=old, undo=None, receipts={}, revision=0)
        ).encode()
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "save.json"
            path.write_bytes(raw)
            with patch("backend.storage.os.replace", side_effect=OSError("No space")):
                store = Store(path)
            self.assertEqual(path.read_bytes(), raw)
            with self.assertRaises(OSError):
                store.snapshot()

    def test_api_dropdowns_sources_preview_and_retry_are_consistent(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "api.json"
            client = TestClient(create_app(path))
            result = client.post(
                "/api/project/new",
                json=dict(name="API pilot", revision=0, request_id=str(uuid4())),
            ).json()
            s = result["project"]
            v = {
                f["name"]: f["default"]
                for f in engine.land_form(s, "existing")["fields"]
            }
            v.update(
                route_id="existing", parcel_id="new", parcel_area=200, covered_area=200
            )
            result = client.post(
                "/api/commit",
                json=dict(
                    action_id="establish_access",
                    inputs=v,
                    revision=result["revision"],
                    request_id=str(uuid4()),
                ),
            ).json()
            s = result["project"]
            v = values(s, "demonstrator")
            fields = next(a for a in result["actions"] if a["id"] == "demonstrator")[
                "fields"
            ]
            self.assertGreater(
                len([f for f in fields if f["type"] in {"select", "category"}]), 12
            )
            original = path.read_bytes()
            p = client.post(
                "/api/preview",
                json=dict(
                    revision=result["revision"], action_id="demonstrator", inputs=v
                ),
            )
            self.assertEqual(p.status_code, 200, p.text)
            self.assertEqual(path.read_bytes(), original)
            request = dict(
                revision=result["revision"],
                action_id="demonstrator",
                inputs=v,
                request_id=str(uuid4()),
            )
            first = client.post("/api/commit", json=request)
            self.assertEqual(first.status_code, 200, first.text)
            retry = client.post("/api/commit", json=request)
            self.assertEqual(retry.status_code, 200)
            self.assertEqual(first.json()["project"], retry.json()["project"])
            self.assertEqual(client.get("/api/export").json()["format_version"], 4)
            for source in [
                "plant-supply",
                "pilot-primer",
                "al20-categories",
                "dryland-systems",
            ]:
                self.assertEqual(client.get("/api/sources/" + source).status_code, 200)
            client.close()


if __name__ == "__main__":
    unittest.main()
