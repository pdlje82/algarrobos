"""Versioned plant checklists. Keep catalogue v1 stable for saved-history replay.

Plant names and habitat groupings follow the library's dryland-systems picture.
Growth forms and starting quantities are editable planning assumptions, not
species prescriptions, nursery quotations or a grant eligibility assessment.
"""

from copy import deepcopy
from decimal import Decimal
from pathlib import Path
from . import engine_v3 as core

CATALOG_PATH = (
    Path(__file__).resolve().parents[1] / "scenarios" / "planting-catalog-v2.json"
)
LEGACY_CATALOG_PATH = (
    Path(__file__).resolve().parents[1] / "scenarios" / "planting-catalog-v1.json"
)


def catalogue(version=2):
    from .configuration import read_json, keys

    core.require(type(version) is int and version in {1, 2}, "Unsupported plant catalogue version.")
    source = LEGACY_CATALOG_PATH if version == 1 else CATALOG_PATH
    data = read_json(source)
    keys(data, {"version", "groups", "plants", "mixes"}, str(source))
    core.require(
        type(data["version"]) is int and data["version"] == version,
        "Unsupported plant catalogue version.",
    )
    core.require(isinstance(data["groups"], list), "Invalid plant groups.")
    for group in data["groups"]:
        keys(group, {"id", "label"}, "catalogue.group")
        core.require(
            core.text(group["id"]) and core.text(group["label"]),
            "Invalid plant group wording.",
        )
    core.require(
        len(data["groups"]) == 3
        and {g["id"] for g in data["groups"]} == {"tree", "shrub", "grass"},
        "Invalid plant groups.",
    )
    core.require(
        isinstance(data["plants"], list) and 1 <= len(data["plants"]) <= 100,
        "Invalid plant catalogue.",
    )
    ids = set()
    for plant in data["plants"]:
        keys(
            plant,
            {
                "id",
                "label",
                "group",
                "system",
                "suggested_quantity",
                "source",
                "detail",
            },
            "catalogue.plant",
        )
        core.require(
            all(
                core.text(plant[k], 1000)
                for k in ("id", "label", "system", "source", "detail")
            ),
            "Invalid catalogue plant wording.",
        )
        core.require(
            plant["id"] not in ids
            and core.text(plant["group"])
            and plant["group"] in {"tree", "shrub", "grass"},
            "Invalid or duplicate catalogue plant.",
        )
        ids.add(plant["id"])
        core.require(
            core.number(plant["suggested_quantity"], 1, 1000000)
            and float(plant["suggested_quantity"]).is_integer(),
            "Invalid suggested plant quantity.",
        )
    core.require(
        isinstance(data["mixes"], list) and len(data["mixes"]) > 0,
        "Missing plant mixes.",
    )
    for mix in data["mixes"]:
        keys(mix, {"id", "label", "plant_ids"}, "catalogue.mix")
        core.require(
            core.text(mix["id"])
            and core.text(mix["label"])
            and isinstance(mix["plant_ids"], list)
            and all(core.text(id) for id in mix["plant_ids"])
            and set(mix["plant_ids"]) <= ids,
            "Invalid plant mix references.",
        )
    return deepcopy(data)


def default_selection():
    from .configuration import load_defaults
    from .plant_prices import snapshot

    return priced_selection(
        load_defaults()["forms"]["demonstrator"]["plan"]["plant_selection"], snapshot()
    )


def priced_selection(selection, prices, previous_plan=None):
    """Explicit v1 form adapter. Never infer a missing v2 unit cost."""
    resolved = resolve(selection)
    if selection["version"] == 2:
        return deepcopy(selection)
    entries = []
    for plant in resolved["entries"]:
        if previous_plan is not None:
            rate = previous_plan[
                "tree_unit_cost" if plant["group"] == "tree" else "shrub_unit_cost"
            ]
        elif plant["custom"]:
            rate = prices["custom_unit_costs"][plant["group"]]
        else:
            rate = prices["unit_costs"][plant["id"]]
        original = next(row for row in selection["entries"] if row["id"] == plant["id"])
        entries.append(
            {**deepcopy(original), "unit_cost": rate, "price_confirmed": False}
        )
    return {"version": 2, "entries": entries}


def resolve(selection):
    """Validate the submitted list and return authoritative names and totals."""
    core.require(
        isinstance(selection, dict)
        and set(selection) == {"version", "entries"}
        and type(selection["version"]) is int
        and selection["version"] in {1, 2}
        and isinstance(selection["entries"], list)
        and 1 <= len(selection["entries"]) <= 100,
        "Select at least one plant from the checklist (up to 100 entries).",
    )
    # Unpriced v1 histories retain their frozen catalogue. Priced v2 lists use
    # the expanded catalogue, whose original entries are preserved unchanged.
    catalog = catalogue(selection["version"])
    plants = {p["id"]: p for p in catalog["plants"]}
    entries, ids, names = [], set(), set()
    for row in selection["entries"]:
        core.require(
            isinstance(row, dict) and isinstance(row.get("id"), str),
            "Invalid plant entry.",
        )
        id = row["id"]
        cost_keys = (
            {"unit_cost", "price_confirmed"} if selection["version"] == 2 else set()
        )
        if selection["version"] == 2:
            from .plant_prices import price

            core.require(
                "unit_cost" in row, "Each selected plant needs an explicit unit price."
            )
            price(row["unit_cost"])
            core.require(
                "price_confirmed" in row and type(row["price_confirmed"]) is bool,
                "Each plant needs an explicit Price confirmed checkbox value.",
            )
        core.require(
            id not in ids, "Each plant may appear only once; edit its quantity instead."
        )
        ids.add(id)
        core.require(
            core.number(row.get("quantity"), 1, 1000000)
            and float(row["quantity"]).is_integer(),
            "Each selected plant needs a positive whole-number quantity.",
        )
        if id in plants:
            core.require(
                set(row) == {"id", "quantity"} | cost_keys,
                "Catalogue plant names and groups are supplied by Python.",
            )
            plant = deepcopy(plants[id])
            plant["custom"] = False
        else:
            core.require(
                id.startswith("custom-")
                and core.text(id, 80)
                and set(row) == {"id", "quantity", "label", "group"} | cost_keys
                and core.text(row["label"], 120)
                and row["label"] == row["label"].strip()
                and isinstance(row["group"], str)
                and row["group"] in {g["id"] for g in catalog["groups"]},
                "Custom plants need a name, a valid growth form and a custom ID.",
            )
            plant = dict(
                id=id, label=row["label"], group=row["group"], system=None, custom=True
            )
        name = plant["label"].casefold()
        core.require(
            name not in names,
            "Duplicate plant name; edit the existing quantity instead.",
        )
        names.add(name)
        if selection["version"] == 2:
            plant["unit_cost"] = row["unit_cost"]
            plant["price_confirmed"] = row["price_confirmed"]
            plant["line_total"] = float(
                Decimal(str(row["unit_cost"])) * int(row["quantity"])
            )
        entries.append({**plant, "quantity": row["quantity"]})
    trees = sum(p["quantity"] for p in entries if p["group"] == "tree")
    shrubs = sum(p["quantity"] for p in entries if p["group"] != "tree")
    core.require(
        trees <= 1000000 and shrubs <= 1000000,
        "Plant totals exceed the supported amount.",
    )
    return dict(entries=entries, trees=trees, shrubs=shrubs)


def review(selection, target, legacy_plan=None):
    result = resolve(selection)
    if selection["version"] == 1 and legacy_plan is not None:
        for p in result["entries"]:
            p["unit_cost"] = legacy_plan[
                "tree_unit_cost" if p["group"] == "tree" else "shrub_unit_cost"
            ]
            p["line_total"] = float(Decimal(str(p["unit_cost"])) * int(p["quantity"]))
            p["price_confirmed"] = None  # The older format did not record confirmation.
    systems = {p["system"] for p in result["entries"] if p["system"]}
    questions = []
    if len(systems) > 1:
        questions.append(
            "This list combines reference habitats. Review water, soil and placement for each plant; combining mixes does not establish site suitability."
        )
    if target not in systems and systems:
        questions.append(
            "The selected plants include examples outside the target vegetation system. Check the intended habitat and planting locations."
        )
    if any(p["custom"] for p in result["entries"]):
        questions.append(
            "Custom plants need identification, provenance and site-suitability review; their inclusion does not establish funding eligibility."
        )
    if selection["version"] == 2 and any(
        not p["price_confirmed"] for p in result["entries"]
    ):
        questions.append(
            "Some plant prices are unconfirmed estimates. Mark Price confirmed only after checking the entered amount, for example with a supplier. Confirmation is user-reported, not a funding approval."
        )
    return {**result, "questions": questions}
