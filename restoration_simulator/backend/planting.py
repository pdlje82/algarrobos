"""Versioned plant checklists. Keep catalogue v1 stable for saved-history replay.

Plant names and habitat groupings follow the library's dryland-systems picture.
Growth forms and starting quantities are editable planning assumptions, not
species prescriptions, nursery quotations or a grant eligibility assessment.
"""

from copy import deepcopy
from . import engine_v3 as core

SOURCE = "/api/sources/dryland-systems"
GROUPS = [
    {"id": "tree", "label": "Trees"},
    {"id": "shrub", "label": "Shrubs"},
    {"id": "grass", "label": "Grasses / herbaceous plants"},
]
# Names remain at the identification level supplied by the reference picture.
_PLANTS_V1 = [
    ("carob", "Carob", "tree", "woodland", 5),
    ("wild_olive", "Wild olive", "tree", "woodland", 5),
    ("lentisk", "Lentisk", "shrub", "woodland", 10),
    ("buckthorn", "Buckthorn", "shrub", "woodland", 10),
    ("palmetto", "Palmetto", "shrub", "woodland", 10),
    ("retama", "Retama", "shrub", "scrub", 10),
    ("esparto", "Esparto", "grass", "scrub", 20),
    ("thyme", "Thyme", "shrub", "scrub", 10),
    ("ziziphus", "Ziziphus", "shrub", "arid", 10),
    ("lycium", "Lycium", "shrub", "arid", 10),
    ("salsola", "Salsola", "shrub", "arid", 10),
    ("oleander", "Oleander", "shrub", "watercourse", 10),
    ("tamarix", "Tamarix (tree form)", "tree", "watercourse", 5),
]
_MIXES_V1 = [
    ("woodland", "Woodland–shrub mosaic · system 3"),
    ("scrub", "Semi-arid shrubland / grassland · system 4"),
    ("arid", "Very arid scrub · system 5"),
    ("watercourse", "Seasonal watercourse · system 2"),
]


def catalogue():
    return dict(
        version=1,
        groups=deepcopy(GROUPS),
        plants=[
            dict(
                id=id,
                label=name,
                group=group,
                system=system,
                suggested_quantity=quantity,
                source=SOURCE,
                detail=f"Library example for {dict(_MIXES_V1)[system]}. Confirm exact species, native provenance, soil, water and permissions for the site. Growth form is a budgeting assumption; use a custom plant for another form.",
            )
            for id, name, group, system, quantity in _PLANTS_V1
        ],
        mixes=[
            dict(id=id, label=name, plant_ids=[p[0] for p in _PLANTS_V1 if p[3] == id])
            for id, name in _MIXES_V1
        ],
    )


def default_selection():
    return dict(
        version=1,
        entries=[
            dict(id=p[0], quantity=p[4]) for p in _PLANTS_V1 if p[3] == "woodland"
        ],
    )


def resolve(selection):
    """Validate the submitted list and return authoritative names and totals."""
    core.require(
        isinstance(selection, dict)
        and set(selection) == {"version", "entries"}
        and type(selection["version"]) is int
        and selection["version"] == 1
        and isinstance(selection["entries"], list)
        and 1 <= len(selection["entries"]) <= 100,
        "Select at least one plant from the checklist (up to 100 entries).",
    )
    plants = {p["id"]: p for p in catalogue()["plants"]}
    entries, ids, names = [], set(), set()
    for row in selection["entries"]:
        core.require(
            isinstance(row, dict) and isinstance(row.get("id"), str),
            "Invalid plant entry.",
        )
        id = row["id"]
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
                set(row) == {"id", "quantity"},
                "Catalogue plant names and groups are supplied by Python.",
            )
            plant = deepcopy(plants[id])
            plant["custom"] = False
        else:
            core.require(
                id.startswith("custom-")
                and core.text(id, 80)
                and set(row) == {"id", "quantity", "label", "group"}
                and core.text(row["label"], 120)
                and row["label"] == row["label"].strip()
                and isinstance(row["group"], str)
                and row["group"] in {g["id"] for g in GROUPS},
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
        entries.append({**plant, "quantity": row["quantity"]})
    trees = sum(p["quantity"] for p in entries if p["group"] == "tree")
    shrubs = sum(p["quantity"] for p in entries if p["group"] != "tree")
    core.require(
        trees <= 1000000 and shrubs <= 1000000,
        "Plant totals exceed the supported amount.",
    )
    return dict(entries=entries, trees=trees, shrubs=shrubs)


def review(selection, target):
    result = resolve(selection)
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
    return {**result, "questions": questions}
