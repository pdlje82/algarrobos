"""Versioned AL20 municipality lookup; explicit provisional inputs, never verification.

The immutable dataset is separate from scoring definitions. Applying a lookup is
an editing command. Saved manual answers are never converted on read or upgrade.
The optional assessment.location_lookup field is absent for manual/older
assessments; absence means no recorded lookup. V1 keeps a shared location;
v2 retains independent per-criterion inputs and previous answers. Historical snapshots stay
valid. Every supported dataset edition must remain available for saved lookups.
"""
from copy import deepcopy
from decimal import Decimal
from pathlib import Path

from .configuration import keys, read_json
from .engine import require, same_json
from .funding import checked

DATASET_PATH = Path(__file__).resolve().parents[1] / "scenarios" / "funding-al20-statistics-v1.json"
CRITERIA = {"AT.3", "RD.5"}


@checked
def validate(data):
    from .funding import validate_guidance_source
    keys(data, {"version", "id", "territory", "label", "year", "status", "limitations", "sources", "benchmarks", "municipalities", "defaults"}, "AL20 statistics")
    require(same_json(data["defaults"], {"municipality": None, "population_mode": "unconfirmed", "settlement_name": None, "population": None, "population_year": None}), "Invalid AL20 lookup form defaults.")
    require(type(data["version"]) is int and data["version"] == 1 and data["id"] == "al20-statistics-2025-v1", "Unsupported AL20 statistics edition.")
    require(data["territory"] == "AL20" and data["year"] == 2025 and data["status"] == "provisional" and isinstance(data["label"], str), "Invalid AL20 statistics scope or status.")
    require(isinstance(data["limitations"], list) and data["limitations"] and all(isinstance(t, str) and t for t in data["limitations"]), "AL20 statistics limitations are missing.")
    require(isinstance(data["sources"], list) and {s["page"] for s in data["sources"]} == {113, 126, 181, 182}, "AL20 statistics sources are incomplete.")
    for source in data["sources"]:
        validate_guidance_source(source)
    keys(data["benchmarks"], {"population_zrl_median", "population_zrl_mean", "population_andalusia_median", "population_andalusia_mean", "businesses_zrl_median", "businesses_zrl_mean"}, "AL20 statistics benchmarks")
    from .funding_selection import points
    for value in data["benchmarks"].values():
        require(points(value) > 0, "AL20 statistical benchmarks must be positive decimal strings.")
    require(isinstance(data["municipalities"], list) and len(data["municipalities"]) == 32, "AL20 statistics must include all 32 municipalities.")
    names = set()
    for row in data["municipalities"]:
        keys(row, {"name", "population", "businesses", "population_page", "businesses_page"}, "AL20 municipality statistics")
        require(isinstance(row["name"], str) and row["name"] and row["name"] not in names, "Duplicate or missing AL20 statistical municipality.")
        names.add(row["name"])
        require(all(type(row[k]) is int and row[k] >= 0 for k in ["population", "businesses"]), "AL20 population/business counts must be nonnegative integers.")
        require(row["population_page"] == 113 and row["businesses_page"] in {181, 182}, "Invalid AL20 municipality source page.")
    return data


def dataset():
    return validate(read_json(DATASET_PATH))


@checked
def lookup(data, settings):
    keys(settings, {"municipality", "population_mode", "settlement_name", "population", "population_year"}, "AL20 location settings")
    row = next((r for r in data["municipalities"] if r["name"] == settings["municipality"]), None)
    require(row is not None, "Choose one of the 32 AL20 municipalities in the statistics database.")
    mode = settings["population_mode"]
    require(mode in {"unconfirmed", "municipality_proxy", "settlement"}, "Choose a supported AL20 population basis.")
    if mode == "settlement":
        require(isinstance(settings["settlement_name"], str) and settings["settlement_name"].strip() and len(settings["settlement_name"]) <= 300, "Enter the actual settlement name.")
        require(type(settings["population"]) is int and 0 <= settings["population"] <= 100000000, "Enter a nonnegative whole-number settlement population; zero is valid.")
        require(type(settings["population_year"]) is int and settings["population_year"] == data["year"], "Settlement population must use the same 2025 year as this dataset. Use manual answers for a different source edition.")
        population = settings["population"]
    else:
        require(all(settings[k] is None for k in ["settlement_name", "population", "population_year"]), "Clear settlement inputs when using municipality data or an unconfirmed population basis.")
        population = row["population"] if mode == "municipality_proxy" else None
    benchmarks = data["benchmarks"]
    # Exclusive alternatives: select the strongest satisfied population band.
    # Point values remain in each route's catalogue, never in this data lookup.
    answers = {"AT.3": {"AT.3.1": None, "AT.3.2": None}, "RD.5": {"RD.5.1": Decimal(row["businesses"]) < Decimal(benchmarks["businesses_zrl_mean"])}}
    if population is not None:
        below_local = Decimal(population) < Decimal(benchmarks["population_zrl_median"])
        below_andalusia = Decimal(population) < Decimal(benchmarks["population_andalusia_median"])
        answers["AT.3"] = {"AT.3.1": below_local, "AT.3.2": not below_local and below_andalusia}
    return {"municipality": deepcopy(row), "population_used": population, "answers": answers}


@checked
def validate_assessment(assessment, bundle):
    if "location_lookup" not in assessment:
        return  # Explicit optional contract: absent means manual historical input.
    from .funding import digest
    metadata = assessment["location_lookup"]
    keys(metadata, {"version", "dataset_id", "dataset_hash", "automated"} | ({"settings"} if metadata["version"] == 1 else {"items"}), "AL20 saved location lookup")
    require(type(metadata["version"]) is int and metadata["version"] in {1, 2}, "Unsupported saved AL20 location lookup. Keep this save and install its matching evaluator.")
    data = dataset()
    require(metadata["dataset_id"] == data["id"] and metadata["dataset_hash"] == digest(data), "The saved AL20 statistics edition differs. Restore its immutable dataset before reopening; no answers have been replaced.")
    automatic = metadata["automated"]
    require(isinstance(automatic, list) and len(set(automatic)) == len(automatic) and set(automatic) <= CRITERIA, "Invalid automatic AL20 criterion list.")
    if metadata["version"] == 2:
        require(isinstance(metadata["items"], dict) and set(metadata["items"]) <= CRITERIA and set(automatic) <= set(metadata["items"]), "Missing per-criterion location decision.")
        for cid, item in metadata["items"].items():
            keys(item, {"settings", "before_answers"}, "saved " + cid + " decision")
            result = lookup(data, item["settings"])
            if item["before_answers"] is not None:
                keys(item["before_answers"], set(result["answers"][cid]), "previous " + cid + " answers")
                require(all(v is None or type(v) is bool for v in item["before_answers"].values()), "Invalid previous location selections.")
                require(cid != "AT.3" or sum(v is True for v in item["before_answers"].values()) <= 1, "Previous population alternatives conflict.")
            require(cid != "AT.3" or result["population_used"] is not None or item["before_answers"] is None, "A new population decision needs its applied population basis.")
            require(cid != "RD.5" or item["settings"]["population_mode"] == "unconfirmed", "The business decision must retain municipality-only inputs.")
            if cid in automatic: require(same_json(assessment["criteria"][cid]["answers"], result["answers"][cid]), "Automatic " + cid + " answers differ from its saved location. Use manual selections or review the lookup again.")
        return
    result = lookup(data, metadata["settings"])
    for cid in automatic:
        require(same_json(assessment["criteria"][cid]["answers"], result["answers"][cid]), "Automatic " + cid + " answers differ from the saved location. Switch this criterion to manual or recalculate the lookup.")


@checked
def apply(draft, project, route, settings, automated, expected_dataset_hash):
    from .funding import validate_draft, digest
    d = validate_draft(deepcopy(draft), project)
    require(d["version"] == 4, "Review the catalogue update before using structured AL20 location lookup.")
    require(route in d["selection_assessments"], "Choose a supported AL20 route for the location lookup.")
    data = dataset()
    require(expected_dataset_hash == digest(data), "The statistics dataset changed while editing. Reload the lookup and review its source edition.")
    require(isinstance(automated, list) and len(set(automated)) == len(automated) and set(automated) <= CRITERIA, "Choose AT.3 and/or RD.5 for automatic lookup.")
    result = lookup(data, settings)
    # Confirm the saved catalogue still encodes these known comparisons. New
    # criterion definitions need a separate, reviewed lookup implementation.
    profile = d["bundle"]["selection"]["profiles"][d["bundle"]["selection"]["routes"][route]]
    for cid in CRITERIA:
        criterion = next(c for c in profile["criteria"] if c["id"] == cid)
        require(criterion["method"] == "sum" and set(result["answers"][cid]) == {c["id"] for c in criterion["choices"]}, "The saved scoring definitions need a version-specific location adapter.")
        if cid == "AT.3":
            require(Decimal(criterion["choices"][0]["points"]) >= Decimal(criterion["choices"][1]["points"]) and any(set(g) == set(result["answers"][cid]) for g in criterion["exclusive_groups"]), "The saved AT.3 alternatives are incompatible with this lookup.")
    assessment = d["selection_assessments"][route]
    require("location_lookup" not in assessment or assessment["location_lookup"]["version"] == 1, "Use the reviewed location-apply service for per-criterion decisions; the legacy action cannot replace their history.")
    assessment["location_lookup"] = {"version": 1, "dataset_id": data["id"], "dataset_hash": digest(data), "settings": deepcopy(settings), "automated": list(automated)}
    for cid in automated:
        assessment["criteria"][cid]["answers"] = result["answers"][cid]
    validate_draft(d, project)
    return d


def describe():
    from .funding import digest
    data = dataset()
    return {"version": 1, "dataset": data, "dataset_hash": digest(data)}
