"""Read-only reviewed irrigation profiles and prepared inputs; no simulation or saves.

Unknown numerical values are explicit nulls with a status and explanation. This
module never selects ecological values, calculates routes, or adopts Designer rules.
"""
from copy import deepcopy
from datetime import date
import math
from pathlib import Path

from fastapi import HTTPException

from .configuration import keys, read_json
from .engine_v3 import Invalid, require

DIRECTORY = Path(__file__).resolve().parents[1]
LIBRARY_PATH = DIRECTORY / "scenarios" / "drone-irrigator-research-v1.json"
RULES_PATH = DIRECTORY / "design_rules" / "drone_irrigator_v1.json"
COLLECTIONS = {
    "irrigation_profile": "plant_profiles", "reservoir_system": "reservoirs",
    "drone_platform": "aircraft", "drone_base": "bases", "research_topic": "work_packages",
    "research_scenario": "scenarios", "cluster_template": "templates",
}
COMMON = {"title", "summary", "citation_ids", "limitations", "facts", "open_questions", "web_sources"}
EXTRA = {
    "irrigation_profile": {"species_id", "reservoir_assessments", "water_demand", "nursery_fit"},
    "reservoir_system": {"material", "refill_status", "drone_interface_status"},
    "drone_platform": {"integration_status"}, "drone_base": {"integration_status"},
    "research_topic": {"work_package", "research_status"},
    "research_scenario": {"adoption", "inputs", "required_inputs", "cluster_ids", "reservoir_id", "aircraft_id", "base_id"},
    "cluster_template": {"adoption", "source_palette", "species_ids", "spacing_policy", "placement_requirements"},
}


def _text(value, at):
    require(isinstance(value, str) and bool(value.strip()), f"{at}: nonempty text is required.")


def _strings(value, at):
    require(isinstance(value, list), f"{at}: an explicit list is required.")
    for item in value:
        _text(item, at)
    require(len(value) == len(set(value)), f"{at}: duplicate entries are unsupported.")


def _number(value, at):
    require(type(value) in (int, float) and math.isfinite(value) and value >= 0,
            f"{at}: a finite nonnegative number is required.")


def _refs(value, registry, at):
    _strings(value, at)
    require(set(value) <= set(registry["citations"]), f"{at}: unresolved shared citations {sorted(set(value) - set(registry['citations']))}.")


def validate_record(kind, native, row, registry, plants, reservoirs):
    at = f"Irrigation research {kind}/{native}"
    keys(row, COMMON | EXTRA[kind], at)
    for field in ("title", "summary"):
        _text(row[field], at + "." + field)
    _refs(row["citation_ids"], registry, at)
    for field in ("limitations", "open_questions"):
        _strings(row[field], at + "." + field)
    require(bool(row["limitations"]), at + ": applicability limitations are required.")
    require(isinstance(row["facts"], dict), at + ": facts must be an explicit map.")
    for ident, fact in row["facts"].items():
        _text(ident, at + ".facts")
        keys(fact, {"label", "value", "unit", "basis", "context", "citation_ids"}, at + ".facts." + ident)
        for field in ("label", "unit", "context"):
            _text(fact[field], at + ".facts." + ident + "." + field)
        _number(fact["value"], at + ".facts." + ident)
        require(fact["basis"] in {"manufacturer", "field_observation", "historical_price", "project_assumption"}, at + ": unsupported fact basis.")
        _refs(fact["citation_ids"], registry, at)
        require(set(fact["citation_ids"]) <= set(row["citation_ids"]), at + ": fact evidence must be declared on its record.")
        require(bool(fact["citation_ids"]) == (fact["basis"] != "project_assumption"), at + ": distinguish source facts from assumptions.")
    require(isinstance(row["web_sources"], list), at + ": web_sources must be a list.")
    for web in row["web_sources"]:
        keys(web, {"title", "url", "checked_on", "finding", "limitation"}, at + ".web_sources")
        for field in web:
            _text(web[field], at + ".web_sources." + field)
        require(web["url"].startswith("https://"), at + ": web evidence requires an HTTPS source URL.")
        try:
            checked = date.fromisoformat(web["checked_on"])
        except ValueError as exc:
            raise Invalid(at + ": invalid web-source review date.") from exc
        require(checked.isoformat() == web["checked_on"] and checked <= date.today(), at + ": invalid/future web-source review date.")
    if kind == "irrigation_profile":
        require(native == row["species_id"] and native in plants, at + ": species identity must match the shared catalogue.")
        require(isinstance(row["reservoir_assessments"], dict) and set(row["reservoir_assessments"]) == set(reservoirs), at + ": assess every registered reservoir explicitly.")
        for ident, assessment in row["reservoir_assessments"].items():
            keys(assessment, {"status", "reason", "citation_ids"}, at + ".reservoir_assessments." + ident)
            require(assessment["status"] in {"supported", "conditional", "unsuitable", "not_assessed"}, at + ": unsupported suitability status.")
            _text(assessment["reason"], at)
            _refs(assessment["citation_ids"], registry, at)
            require(set(assessment["citation_ids"]) <= set(row["citation_ids"]), at + ": suitability evidence must be declared on its record.")
            if assessment["status"] != "not_assessed":
                require(bool(assessment["citation_ids"]), at + ": a suitability conclusion requires evidence.")
        water = row["water_demand"]
        keys(water, {"status", "low_l_day", "central_l_day", "high_l_day", "context", "citation_ids"}, at + ".water_demand")
        _text(water["context"], at)
        _refs(water["citation_ids"], registry, at)
        require(set(water["citation_ids"]) <= set(row["citation_ids"]), at + ": water evidence must be declared on its record.")
        values = [water[k] for k in ("low_l_day", "central_l_day", "high_l_day")]
        require(water["status"] in {"not_established", "reviewed_range"}, at + ": unsupported demand status.")
        if water["status"] == "not_established":
            require(values == [None, None, None], at + ": unknown demand must retain explicit nulls, never a default rate.")
        else:
            for value in values:
                _number(value, at + ".water_demand")
            require(values == sorted(values) and bool(water["citation_ids"]), at + ": reviewed demand needs an ordered sourced range.")
        keys(row["nursery_fit"], {"status", "context"}, at + ".nursery_fit")
        require(row["nursery_fit"]["status"] == "not_established", at + ": unsupported nursery-fit contract; register measured fit explicitly.")
        _text(row["nursery_fit"]["context"], at)
    elif kind == "reservoir_system":
        require(row["material"] in {"biodegradable_paper", "reusable_polypropylene"}, at + ": unsupported material.")
        require(row["refill_status"] in {"manufacturer_documented", "field_reported_with_modification"}, at + ": unsupported refill status.")
        require(row["drone_interface_status"] == "development_required", at + ": no reviewed commercial insertion system is registered.")
    elif kind in {"drone_platform", "drone_base"}:
        require(row["integration_status"] in {"component_only", "manual_service", "hypothetical_integration"}, at + ": unsupported integration status.")
    elif kind == "research_topic":
        require(row["work_package"] == native and native in {f"R{i}" for i in range(1, 12)}, at + ": unsupported work package.")
        require(row["research_status"] == "reviewed_with_gaps", at + ": unsupported research state.")
    elif kind == "research_scenario":
        require(row["adoption"] == "prepared_not_adopted", at + ": research inputs cannot activate a simulator.")
        require(isinstance(row["inputs"], dict) and row["inputs"], at + ": explicit illustrative inputs are required.")
        require(all(k in row["facts"] and row["facts"][k]["basis"] == "project_assumption" and row["facts"][k]["value"] == v for k, v in row["inputs"].items()), at + ": scenario inputs must resolve to their declared assumption facts.")
        _strings(row["required_inputs"], at)
        require(bool(row["required_inputs"]), at + ": unresolved scenario requirements must remain visible.")
        _strings(row["cluster_ids"], at)
        require(row["reservoir_id"] in reservoirs, at + ": unknown selected reservoir.")
    elif kind == "cluster_template":
        require(row["adoption"] == "prepared_not_adopted" and row["spacing_policy"] == "reference_current_designer_rules_then_review_access", at + ": unsupported cluster adoption/spacing policy.")
        _strings(row["species_ids"], at)
        require(bool(row["species_ids"]) and set(row["species_ids"]) <= plants, at + ": unresolved cluster species.")
        _strings(row["placement_requirements"], at)
        require(bool(row["placement_requirements"]), at + ": servicing constraints are required.")


def load(registry=None):
    if registry is None:
        from .knowledge_citations import load_registry
        registry = load_registry()
    from .planting import catalogue
    from .designer import load_bundle
    plants = {p["id"] for p in catalogue()["plants"]}
    data, rules = read_json(LIBRARY_PATH), read_json(RULES_PATH)
    keys(data, {"version", "id", "reviewed_on", "plant_profiles", "reservoirs", "aircraft", "bases", "work_packages", "scenarios"}, str(LIBRARY_PATH))
    keys(rules, {"version", "id", "adoption", "templates"}, str(RULES_PATH))
    require(type(data["version"]) is int and data["version"] == 1 and data["id"] == "drone-irrigator-research-v1", "Unsupported irrigation research schema/identity.")
    require(type(rules["version"]) is int and rules["version"] == 1 and rules["id"] == "drone-irrigator-clusters-2026-11-04-v1" and rules["adoption"] == "prepared_not_adopted", "Unsupported prepared cluster schema/identity/adoption.")
    try:
        reviewed = date.fromisoformat(data["reviewed_on"])
    except (ValueError, TypeError) as exc:
        raise Invalid("Irrigation research review date must be an ISO date.") from exc
    require(reviewed.isoformat() == data["reviewed_on"] and reviewed <= date.today(), "Invalid/future irrigation research review date.")
    for collection in ("plant_profiles", "reservoirs", "aircraft", "bases", "work_packages", "scenarios"):
        require(isinstance(data[collection], dict) and bool(data[collection]), f"Irrigation research {collection}: a nonempty record map is required.")
    require(set(data["plant_profiles"]) == plants, "Irrigation profiles must explicitly cover each shared catalogue species.")
    require(set(data["work_packages"]) == {f"R{i}" for i in range(1, 12)}, "All eleven irrigation research packages are required.")
    for kind, collection in COLLECTIONS.items():
        owner = rules if kind == "cluster_template" else data
        require(isinstance(owner[collection], dict) and owner[collection], f"Irrigation research {collection}: a nonempty map is required.")
        for ident, row in owner[collection].items():
            _text(ident, collection)
            validate_record(kind, ident, row, registry, plants, data["reservoirs"])
    bundle = load_bundle()
    palettes = {p["id"]: p for p in bundle["vegetation_combinations"]}
    for ident, row in rules["templates"].items():
        require(row["source_palette"] in palettes, f"Cluster {ident}: unresolved source palette.")
        palette = palettes[row["source_palette"]]
        require(set(row["species_ids"]) <= set(palette["starter"] + palette["optional"]), f"Cluster {ident}: species disagree with the referenced palette.")
    for ident, row in data["scenarios"].items():
        require(set(row["cluster_ids"]) <= set(rules["templates"]), f"Scenario {ident}: unresolved cluster template.")
        require(row["aircraft_id"] in data["aircraft"] and row["base_id"] in data["bases"], f"Scenario {ident}: unresolved aircraft/base.")
    return data, rules


def profiles():
    try:
        data, _ = load()
        return {"version": 1, "reviewed_on": data["reviewed_on"], "plant_profiles": deepcopy(data["plant_profiles"])}
    except Invalid as exc:
        raise HTTPException(500, f"Irrigation profiles unavailable: {exc} Restore the reviewed data and retry; no rates were substituted.") from exc


def main(argv=None):
    import argparse
    import json
    import sys
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", required=True, action="store_true")
    parser.parse_args(argv)
    try:
        data, rules = load()
        result = {"version": 1, "reviewed_on": data["reviewed_on"],
                  "plant_profiles": len(data["plant_profiles"]), "work_packages": len(data["work_packages"]),
                  "prepared_clusters": len(rules["templates"]), "adoption": rules["adoption"]}
    except (Invalid, HTTPException) as exc:
        message = exc.detail if isinstance(exc, HTTPException) else str(exc)
        print(f"Irrigation research validation failed: {message}", file=sys.stderr)
        return 1
    print(json.dumps(result, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
