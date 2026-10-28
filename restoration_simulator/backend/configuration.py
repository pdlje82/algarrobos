"""Validated JSON defaults and an explicit adapter for the older v4 form schema."""

from copy import deepcopy
import json
from pathlib import Path
from .engine_v3 import Invalid, require, number, text, ROUTES

DIRECTORY = Path(__file__).resolve().parents[1] / "scenarios"
DEFAULTS_PATH = DIRECTORY / "defaults.json"
LEGACY_FORMS_PATH = DIRECTORY / "legacy-form-defaults-v1.json"

LAND_KEYS = set(
    "parcel_area location cadastral_reference current_use current_cover site_condition restrictions covered_area stage allow_restoration allow_monitoring allow_public physical_access permits evidence instrument exit_terms".split()
)
PLAN_KEYS = set(
    "restoration_area vegetation_system plant_mix objective water_plan trees shrubs planting_method design novelty baseline_method public_participation dissemination publication_period funding_route applicant_id municipality purpose tree_unit_cost shrub_unit_cost protection_unit_cost labour_days labour_day_rate site_preparation establishment_water monitoring_budget reporting_budget installation_years followup_years notes plant_selection".split()
)
RECORD_KEYS = {
    "demo_apply": {"not_started", "basis"},
    "demo_award": {"decision", "award_amount", "basis", "reference"},
    "demo_baseline": {
        "site_ready",
        "basis",
        "photo_points",
        "cover_percent",
        "erosion",
        "reference",
    },
    "demo_evaluate": {"conclusion", "next_step", "shared", "basis", "reference"},
    "demo_funding": {"feedback", "basis", "reference"},
    "demo_install": {"confirmation"},
    "demo_monitor": {"basis", "cover_percent", "erosion", "reference"},
    "demo_pay": {"eligibility_confirmed", "basis"},
}


def keys(value, expected, path):
    require(isinstance(value, dict), f"{path} must be an object.")
    missing, extra = expected - set(value), set(value) - expected
    require(
        not missing, f"Missing configuration at {path}: {', '.join(sorted(missing))}."
    )
    require(
        not extra, f"Unsupported configuration at {path}: {', '.join(sorted(extra))}."
    )


def read_json(path):
    def unique(pairs):
        result = {}
        for key, value in pairs:
            if key in result:
                raise Invalid(f"Duplicate configuration key {key} in {path}.")
            result[key] = value
        return result

    try:
        return json.loads(
            Path(path).read_text(encoding="utf-8"), object_pairs_hook=unique
        )
    except (OSError, ValueError) as exc:
        raise Invalid(f"Cannot load required configuration {path}: {exc}") from exc


def validate_forms(forms, path="forms"):
    keys(forms, {"land", "demonstrator", "planting", "actions"}, path)
    keys(forms["actions"], {"renew_access"}, path + ".actions")
    keys(
        forms["actions"]["renew_access"],
        {"term_years", "commitment_years"},
        path + ".actions.renew_access",
    )
    renew = forms["actions"]["renew_access"]
    require(
        type(renew["term_years"]) is int
        and 1 <= renew["term_years"] <= 60
        and type(renew["commitment_years"]) is int
        and 0 <= renew["commitment_years"] <= 60,
        "Invalid renewal defaults.",
    )
    keys(forms["land"], ROUTES, path + ".land")
    for id, values in forms["land"].items():
        at = path + ".land." + id
        keys(values, LAND_KEYS, at)
        require(
            number(values["parcel_area"], 0.01, 100000000),
            at + ".parcel_area must be positive.",
        )
        require(
            number(values["covered_area"], 0.01, values["parcel_area"]),
            at + ".covered_area must fit inside the parcel.",
        )
        for key in LAND_KEYS - {"parcel_area", "covered_area"}:
            require(isinstance(values[key], str), at + "." + key + " must be text.")
        for key in (
            "physical_access",
            "allow_restoration",
            "allow_monitoring",
            "allow_public",
        ):
            require(
                values[key] in {"yes", "no", "unknown"},
                at + "." + key + " is unsupported.",
            )
        require(values["stage"] in {"active", "pending"}, at + ".stage is unsupported.")
        require(
            values["permits"] in {"assumed_clear", "pending", "restricted"},
            at + ".permits is unsupported.",
        )
        evidence = (
            {"reported", "reference_supplied", "unverified"}
            if id == "existing"
            else {"assumed", "user_supplied", "unverified"}
        )
        require(values["evidence"] in evidence, at + ".evidence is unsupported.")
    keys(forms["demonstrator"], {"plan", "records"}, path + ".demonstrator")
    plan = forms["demonstrator"]["plan"]
    keys(plan, PLAN_KEYS, path + ".demonstrator.plan")
    quantities = {"trees", "shrubs"}
    numeric = {
        "restoration_area",
        "tree_unit_cost",
        "shrub_unit_cost",
        "protection_unit_cost",
        "labour_days",
        "labour_day_rate",
        "site_preparation",
        "establishment_water",
        "monitoring_budget",
        "reporting_budget",
        "installation_years",
        "followup_years",
    } | quantities
    for key in numeric:
        require(
            number(plan[key], 0, 100000000),
            f"{path}.demonstrator.plan.{key} must be a nonnegative number.",
        )
        if key in quantities:
            require(float(plan[key]).is_integer(), key + " must be a whole number.")
        if key not in {
            "restoration_area",
            "labour_days",
            "installation_years",
            "followup_years",
            "trees",
            "shrubs",
        }:
            require(round(plan[key], 2) == plan[key], key + " must use whole cents.")
        if key != "restoration_area":
            require(plan[key] <= 1000000, key + " exceeds the supported range.")
    require(
        plan["restoration_area"] > 0
        and 0.1 <= plan["installation_years"] <= 10
        and 0.1 <= plan["followup_years"] <= 10,
        "Invalid demonstrator area or timing defaults.",
    )
    for key in PLAN_KEYS - numeric - {"plant_selection"}:
        require(
            isinstance(plan[key], str), f"{path}.demonstrator.plan.{key} must be text."
        )
        require(key == "notes" or bool(plan[key].strip()), key + " must not be empty.")
    from .planting import resolve

    resolve(plan["plant_selection"])
    records = forms["demonstrator"]["records"]
    keys(records, set(RECORD_KEYS), path + ".demonstrator.records")
    for kind, expected in RECORD_KEYS.items():
        keys(records[kind], expected, path + ".demonstrator.records." + kind)
        for name, value in records[kind].items():
            if name == "cover_percent":
                require(
                    value is None or number(value, 0, 100),
                    "Invalid starting cover measurement.",
                )
            elif name == "award_amount":
                require(number(value, 0, 28000), "Invalid default award amount.")
            else:
                require(isinstance(value, str), f"{kind}.{name} must be text.")
                allowed = {
                    "basis": {"unknown", "observed", "illustrative"},
                    "not_started": {"unknown", "confirmed", "started"},
                    "decision": {"pending", "awarded", "declined"},
                    "site_ready": {"pending", "ready", "unsuitable"},
                    "photo_points": {"planned", "recorded", "not_used"},
                    "erosion": {"unknown", "none", "low", "moderate", "high"},
                    "conclusion": {"inconclusive", "encouraging", "mixed", "poor"},
                    "next_step": {"maintain", "adapt", "expand"},
                    "shared": {"pending", "published"},
                    "feedback": {"pending", "positive", "negative"},
                    "confirmation": {"pending", "confirmed"},
                    "eligibility_confirmed": {"pending", "confirmed"},
                }
                if name in allowed:
                    require(
                        value in allowed[name],
                        f"Unsupported default {kind}.{name}: {value}.",
                    )
    keys(forms["planting"], {"custom_group", "custom_quantity"}, path + ".planting")
    require(
        isinstance(forms["planting"]["custom_group"], str)
        and forms["planting"]["custom_group"] in {"tree", "shrub", "grass"},
        "Unsupported custom plant group.",
    )
    count = forms["planting"]["custom_quantity"]
    require(
        number(count, 1, 1000000) and float(count).is_integer(),
        "Custom plant quantity must be a positive whole number.",
    )
    return deepcopy(forms)


def load_defaults(path=None):
    source = DEFAULTS_PATH if path is None else Path(path)
    data = read_json(source)
    keys(data, {"version", "forms", "client", "runtime"}, str(source))
    require(
        type(data["version"]) is int and data["version"] == 1,
        "Unsupported defaults JSON version.",
    )
    validate_forms(data["forms"])
    keys(
        data["client"],
        {"project_name", "theme", "theme_storage_key", "notice_without_project"},
        "client",
    )
    for key, value in data["client"].items():
        require(text(value, 1000), "Invalid client configuration: " + key)
    require(
        data["client"]["theme"] in {"system", "light", "dark"},
        "Unsupported configured theme.",
    )
    require(
        len(data["client"]["project_name"]) <= 80,
        "Default project name exceeds 80 characters.",
    )
    keys(data["runtime"], {"save_path"}, "runtime")
    require(
        text(data["runtime"]["save_path"], 1000), "runtime.save_path must not be empty."
    )
    return deepcopy(data)


def forms_for(scenario):
    if "form_schema_version" in scenario:
        require(
            type(scenario["form_schema_version"]) is int
            and scenario["form_schema_version"] == 2,
            "Unsupported form schema version.",
        )
        require(
            "input_defaults" in scenario,
            "Missing scenario.input_defaults for form schema 2.",
        )
        return validate_forms(scenario["input_defaults"], "scenario.input_defaults")
    # Explicit compatibility contract: pre-schema-2 v4 saves had no form snapshot.
    # Its immutable JSON definition supplies their original form schema, visibly
    # identified in API responses. It is never used to repair schema-2 data.
    require(
        "input_defaults" not in scenario and "defaults_file" not in scenario,
        "Missing form_schema_version for the supplied form configuration.",
    )
    require(
        scenario["version"] in {3, 4},
        "No form-schema adapter for this scenario version.",
    )
    forms = validate_forms(read_json(LEGACY_FORMS_PATH), "legacy-v4-forms")
    own = next(r for r in scenario["land_routes"] if r["id"] == "existing")
    explicit = {"default_parcel_area", "default_covered_area"} & set(own)
    if explicit:
        require(
            len(explicit) == 2,
            "Legacy ownership configuration requires both default area fields.",
        )
        forms["land"]["existing"].update(
            parcel_area=own["default_parcel_area"],
            covered_area=own["default_covered_area"],
        )
        validate_forms(forms, "legacy-v4-forms")
    return forms
