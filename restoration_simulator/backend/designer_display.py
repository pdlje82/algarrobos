"""Read-only inspector facts. Never modifies saved drafts or frozen evaluators."""
from copy import deepcopy
from . import planting, plant_names
from .designer_v1 import checked


def single(value):
    if value is None: return None
    lo, hi = value["diameter_m"]
    return lo if lo == hi else None


@checked
def describe(evaluation):
    draft = evaluation["draft"]
    catalogue = {p["id"]: p for p in planting.catalogue()["plants"]}
    names = plant_names.load()
    rows = {p["id"]: p for p in draft["selection"]["entries"]}
    remembered = {ident: pref["entry"] for ident, pref in draft["preferences"].items()} if draft["version"] >= 2 else rows
    plotted = {p["id"]: p for p in evaluation["instances"]}
    def label(species):
        return names[species]["spanish"] if species in catalogue else rows[species]["label"]
    def numbered(ident):
        species, index = ident.rsplit(":", 1)
        return f"{label(species)} {int(index)+1}"
    defaults = draft["bundle"]["defaults"]
    if draft["version"] == 1:
        densities = None  # Historical count-based draft: no density defaults existed.
    elif draft["version"] == 2:
        old = defaults["density_defaults"]
        densities = dict(carob=old["carob"], tree=old["other"], shrub=old["other"], grass=old["other"])
    else:
        densities = deepcopy(defaults["density_defaults"])
    editors = {}
    if draft["version"] >= 2:
        for species, overlays in evaluation["overlays"].items():
            value = overlays["crown"]
            entered = draft["dimensions"][species]["crown"] if species in draft["dimensions"] else None
            if draft["version"] == 3:
                group = catalogue[species]["group"] if species in catalogue else remembered[species]["group"]
                default = defaults["mature_diameters"][species] if species in catalogue else defaults["custom_diameters"][group]
            else:
                record = next((p for p in draft["bundle"]["plant_dimensions"]["plants"] if p["id"] == species), None)
                default = single(record["crown"]) if record is not None else None
            editors[species] = {
                "value": single(value), "range": None if value is None else deepcopy(value["diameter_m"]),
                "default_value": default, "basis": entered["basis"] if entered is not None else "assumption",
                "note": entered["note"] if entered is not None else "", "has_override": entered is not None,
                "editable": draft["version"] == 3,
            }
    species = defaults["pocket_species"]
    count = rows[species]["quantity"] if species in rows else 0
    example_id = species + ":0" if count else None
    instance = plotted[example_id] if example_id in plotted else None
    if not draft["pocket"]["enabled"]: status = "off"
    elif not count: status = "absent"
    elif instance is None: status = "unplaced"
    elif instance["manual"]: status = "independent"
    else: status = "linked"
    retained = draft["positions"][example_id] if example_id in draft["positions"] else draft["displaced"][example_id] if draft["version"] >= 2 and example_id in draft["displaced"] else None
    follows = status == "linked" or (status == "unplaced" and retained is not None and not retained["manual"])
    crown = evaluation["overlays"][species]["crown"] if draft["version"] >= 2 and species in evaluation["overlays"] else None
    links = draft["associations"] if draft["version"] == 3 else {}
    plants = {}
    for ident, p in plotted.items():
        parent = links[ident]["parent_id"] if ident in links else None
        group = catalogue[p["species"]]["group"] if p["species"] in catalogue else rows[p["species"]]["group"]
        if parent is not None: mode = "associated"
        elif p["manual"]: mode = "manual"
        elif group == "tree": mode = "tree"
        elif draft["version"] == 3 and evaluation["placement"]["categories"][p["species"]] == "open_ground": mode = "open_ground"
        else: mode = "independent"
        plants[ident] = {"mode": mode, "parent_id": parent, "parent_name": numbered(parent) if parent is not None else None,
                        "name": numbered(ident)}
    unplaced = []
    if draft["version"] >= 2:
        for ident in draft["unplaced"]:
            if ident in draft["displaced"]:
                reason = "with_tree_outside" if ident in links else "outside"
            else:
                reason = "not_positioned"
                if draft["version"] == 3 and evaluation["placement"]["categories"][ident.rsplit(":", 1)[0]] == "within_crowns" and not any((catalogue[p["species"]]["group"] if p["species"] in catalogue else rows[p["species"]]["group"]) == "tree" for p in plotted.values()):
                    reason = "no_tree"
            unplaced.append({"id": ident, "name": numbered(ident), "reason": reason})
    return {
        "version": 1, "density_defaults": densities, "crown_editors": editors, "plants": plants, "unplaced": unplaced,
        "pocket": {"enabled": draft["pocket"]["enabled"], "supported_count": 1,
            "species": species, "name": label(species) if species in catalogue or species in rows else None,
            "example_id": example_id, "state": status, "plotted": instance is not None,
            "moves_with_pocket": follows, "quantity": count, "extra_quantity": max(0, count-1),
            "radius": draft["pocket"]["radius"], "crown_diameter": single(crown),
            "crown_range": None if crown is None else deepcopy(crown["diameter_m"])},
    }

