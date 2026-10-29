"""Designer-v2 editing policy. Historical v1 snapshots use designer_v1 unchanged."""
from copy import deepcopy
from decimal import Decimal, ROUND_HALF_UP
import math
from pathlib import Path

from . import designer_v1 as legacy
from . import planting, plant_prices
from .configuration import read_json, keys
from .engine import Invalid, require, number

DIRECTORY = legacy.DIRECTORY
checked = legacy.checked
digest = legacy.digest
dimensions = legacy.dimensions
V2_FIELDS = {"preferences", "dismissed", "legacy_exclusions", "dimensions", "displaced", "area_density_update"}


def v1_bundle(bundle):
    result = deepcopy(bundle)
    result.pop("plant_dimensions", None)
    result["manifest"].update(version=1, engine="designer-v1")
    result["manifest"]["files"] = [f for f in result["manifest"]["files"] if f != "plant_dimensions.json"]
    for key in ("density_defaults", "density_rounding", "aspect_limits", "root_ball_default"):
        result["defaults"].pop(key, None)
    return result


@checked
def validate_bundle(bundle):
    if bundle["manifest"]["version"] == 1:
        return legacy.validate_bundle(bundle)
    keys(bundle, {"manifest", "defaults", "sources", "rules", "vegetation_combinations", "treatments", "plant_dimensions"}, "designer-v2 bundle")
    m = bundle["manifest"]
    require(type(m["version"]) is int and m["version"] == 2 and m["engine"] == "designer-v2", "Unsupported designer rules engine/version.")
    require(set(m["files"]) == {"defaults.json", "sources.json", "rules.json", "vegetation_combinations.json", "treatments.json", "plant_dimensions.json"}, "Unsupported v2 bundle files.")
    legacy.validate_bundle(v1_bundle(bundle))
    d = bundle["defaults"]
    keys(d["density_defaults"], {"carob", "other"}, "density defaults")
    require(all(number(v, 0, 1000000) for v in d["density_defaults"].values()) and d["density_rounding"] == "half_up", "Invalid density defaults/rounding.")
    require(d["aspect_limits"] == [0.05, 20], "Unsupported aspect limits.")
    has_root_default = "root_ball_default" in d
    has_root_rule = any(r["id"] == "root_ball_default" for r in bundle["rules"])
    require(has_root_default == has_root_rule, "The shared root-ball drawing default and its registered rule must both be present. Restore defaults.json or review the rule update.")
    if has_root_default:
        value = d["root_ball_default"]
        keys(value, {"diameter_m", "kind", "evidence", "source", "section", "context"}, "shared root-ball drawing default")
        require(isinstance(value["diameter_m"], list) and len(value["diameter_m"]) == 2 and all(number(v, 0.001, 200) for v in value["diameter_m"]) and value["diameter_m"][0] == value["diameter_m"][1], "Enter one positive shared root-ball diameter in metres.")
        require(value["kind"] == "typical" and value["evidence"] == "assumption" and value["source"] is None and all(isinstance(value[k], str) and value[k] for k in ("section", "context")), "The shared root-ball default must be explicitly labelled as a drawing assumption.")
    data = bundle["plant_dimensions"]
    keys(data, {"version", "units", "plants"}, "plant dimension references")
    require(data["version"] == 1 and data["units"] == "metres", "Unsupported dimension reference version/units.")
    species = {p["id"] for p in planting.catalogue()["plants"]}
    require(isinstance(data["plants"], list) and len(data["plants"]) == len(species) and {p["id"] for p in data["plants"]} == species, "Dimension references must cover each catalogue species exactly once.")
    for p in data["plants"]:
        keys(p, {"id", "scientific_name", "crown", "root_ball", "stock", "references", "limitations", "reviewed"}, "species dimensions")
        require(all(isinstance(p[k], str) and p[k] for k in ("scientific_name", "stock", "limitations", "reviewed")), "Empty dimension context.")
        require(p["references"] and all(isinstance(u, str) and u.startswith("https://") for u in p["references"]), "Invalid dimension source URL.")
        for feature in ("crown", "root_ball"):
            value = p[feature]
            if value is None: continue  # Explicit research gap, never inferred dimensions.
            keys(value, {"diameter_m", "kind", "evidence", "source", "section", "context"}, "dimension evidence")
            require(value["kind"] in {"range", "typical"} and value["evidence"] in legacy.EVIDENCE and value["source"] in p["references"], "Invalid dimension provenance.")
            require(isinstance(value["diameter_m"], list) and len(value["diameter_m"]) == 2 and all(number(v, 0.001, 200) for v in value["diameter_m"]) and value["diameter_m"][0] <= value["diameter_m"][1], "Invalid diameter range.")
    return bundle


@checked
def load_bundle():
    m = read_json(DIRECTORY / "manifest.json")
    require(m["files"] == ["defaults.json", "sources.json", "rules.json", "vegetation_combinations.json", "treatments.json", "plant_dimensions.json"], "Unsupported designer file manifest.")
    return validate_bundle({"manifest": m, **{Path(f).stem: read_json(DIRECTORY / f) for f in m["files"]}})


def count_for(density, area):
    require(number(density, 0, 1000000) and number(area, 0.01, 1000000), "Enter a non-negative density and a valid planting area.")
    result = int((Decimal(str(density)) * Decimal(str(area)) / Decimal(10000)).quantize(Decimal(1), rounding=ROUND_HALF_UP))
    require(result <= 1000000, "This density and area exceed one million plants per species; reduce either input.")
    return result


def defaults_for(draft, ident):
    return draft["bundle"]["defaults"]["density_defaults"]["carob" if ident == "carob" else "other"]


def make_preference(draft, ident, entry=None):
    density = defaults_for(draft, ident)
    if entry is None:
        prices = plant_prices.snapshot()["unit_costs"]
        require(ident in prices, "Select a catalogue plant or supply a complete custom plant entry.")
        entry = {"id": ident, "quantity": 1, "unit_cost": prices[ident], "price_confirmed": False}
    quantity = count_for(density, draft["physical"]["restoration_area"])
    return {"density": density, "quantity": quantity, "entry": deepcopy(entry)}


def upgrade(draft):
    result = deepcopy(draft)
    result["bundle"] = load_bundle()
    result["version"] = 2
    if draft["version"] == 1:
        area = draft["physical"]["restoration_area"]
        result.update(preferences={r["id"]: {"density": r["quantity"] * 10000 / area, "quantity": r["quantity"], "entry": deepcopy(r)} for r in draft["selection"]["entries"]}, dismissed={}, legacy_exclusions=deepcopy(draft["exclusions"]), dimensions={}, displaced={}, area_density_update=None)
    return result


def new_draft(project):
    b = load_bundle()
    values = {f["name"]: deepcopy(f["default"]) for f in legacy.plan_fields(project)}
    physical = {k: values[k] for k in legacy.PHYSICAL if k != "plant_selection"}
    physical.update(parcel_id=None, restoration_area=b["defaults"]["area"])
    d = b["defaults"]
    return {"version": 2, "bundle": b, "physical": physical,
        "zone": {k: d[k] for k in ("aspect", "boundary_side", "boundary_type", "boundary_custom")},
        "site": {"rainfall": None, "soil": "unknown", "notes": ""},
        "approaches": [], "combinations": [], "optional_members": [], "manual_ids": [], "exclusions": [],
        "selection": {"version": 2, "entries": []}, "positions": {}, "radii": {}, "overrides": [],
        "pocket": {"enabled": False, "x": None, "y": None, "radius": d["pocket_radius"]},
        "mulch": {"enabled": False, "type": d["mulch_type"], "radius": d["mulch_radius"], "plant_ids": []},
        "existing": [], "unplaced": [], "preferences": {}, "dismissed": {}, "legacy_exclusions": [], "dimensions": {}, "displaced": {}, "area_density_update": None}


def base_draft(draft):
    result = {k: deepcopy(v) for k, v in draft.items() if k not in V2_FIELDS}
    result["version"] = 1
    result["bundle"] = v1_bundle(draft["bundle"])
    width, height = dimensions(draft)
    # Out-of-zone features remain in v2; the historical geometry evaluator receives
    # only its supported in-zone subset. The response explicitly reports omissions.
    result["existing"] = [p for p in result["existing"] if 0 <= p["x"] <= width and 0 <= p["y"] <= height]
    if draft["pocket"]["x"] is not None and not (0 <= draft["pocket"]["x"] <= width and 0 <= draft["pocket"]["y"] <= height):
        result["pocket"].update(enabled=False, x=None, y=None)
    return result


@checked
def validate_draft(draft, project=None):
    if draft["version"] == 1: return legacy.validate_draft(draft, project)
    require(type(draft["version"]) is int and draft["version"] == 2 and draft["bundle"]["manifest"]["version"] == 2, "Unsupported designer draft version/bundle.")
    validate_bundle(draft["bundle"])
    legacy.validate_draft(base_draft(draft), project)
    require(set(draft) == set(base_draft(draft)) | V2_FIELDS, "Unknown or missing designer-v2 fields.")
    require(isinstance(draft["preferences"], dict) and isinstance(draft["dismissed"], dict) and isinstance(draft["dimensions"], dict) and isinstance(draft["displaced"], dict), "Invalid designer preference or geometry data.")
    species = {p["id"] for p in planting.catalogue()["plants"]}
    for ident, p in draft["preferences"].items():
        require(ident in species or ident.startswith("custom-"), "Unknown density species.")
        keys(p, {"density", "quantity", "entry"}, "species density preference")
        require(number(p["density"], 0, 1000000) and type(p["quantity"]) is int and 0 <= p["quantity"] <= 1000000, "Invalid density/count preference.")
        require(p["entry"]["id"] == ident, "Preference plant identity mismatch.")
        planting.resolve({"version": 2, "entries": [p["entry"]]})
    for row in draft["selection"]["entries"]:
        require(row["id"] in draft["preferences"] and row["quantity"] == draft["preferences"][row["id"]]["quantity"], "Plant count and density preference disagree.")
        require(row == {**draft["preferences"][row["id"]]["entry"], "quantity": row["quantity"]}, "Plant prices/details and saved preferences disagree.")
    valid_sources = {"combination:" + c["id"] for c in draft["bundle"]["vegetation_combinations"]} | {"pocket"}
    for ident, sources in draft["dismissed"].items():
        require(ident in draft["preferences"] and isinstance(sources, list) and len(sources) == len(set(sources)) and set(sources) <= valid_sources, "Invalid source-specific dismissal.")
    require(isinstance(draft["legacy_exclusions"], list) and set(draft["legacy_exclusions"]) <= set(draft["exclusions"]), "Invalid legacy exclusions.")
    for ident, overlays in draft["dimensions"].items():
        require(ident in draft["preferences"], "Unknown dimension override species.")
        keys(overlays, {"root_ball", "crown"}, "dimension overrides")
        for value in overlays.values():
            if value is None: continue
            keys(value, {"diameter", "basis", "note"}, "dimension override")
            require(number(value["diameter"], 0.001, 200) and value["basis"] in {"measured", "assumption"} and isinstance(value["note"], str), "Enter a diameter and explicit measured/assumed basis.")
    for p in [*draft["existing"], *draft["displaced"].values()]:
        require(number(p["x"], -1000000, 1000000) and number(p["y"], -1000000, 1000000), "Invalid retained out-of-zone coordinates.")
    for p in draft["existing"]:
        keys(p, {"id", "species", "x", "y", "radius"}, "existing vegetation")
        require(isinstance(p["id"], str) and p["species"] in species and number(p["radius"], 0.01, 100), "Invalid existing vegetation identity/radius.")
    require(len({p["id"] for p in draft["existing"]}) == len(draft["existing"]), "Duplicate existing vegetation identity.")
    for key, p in draft["displaced"].items():
        keys(p, {"x", "y", "manual"}, "retained position")
        require(key in draft["unplaced"] and type(p["manual"]) is bool, "Retained position must belong to an unplaced plant.")
    for coord in ("x", "y"):
        require(draft["pocket"][coord] is None or number(draft["pocket"][coord], -1000000, 1000000), "Invalid retained pocket coordinates.")
    update = draft["area_density_update"]
    require(update is None or (isinstance(update, dict) and set(update) <= set(draft["preferences"]) and all(number(v, 0, 1000000) for v in update.values())), "Invalid previous density targets.")
    return draft


def sources_for(draft):
    wanted = {}
    active = set(draft["combinations"]) | {v + "_mix" for v in draft["approaches"]}
    for c in draft["bundle"]["vegetation_combinations"]:
        if c["id"] in active:
            for ident in c["starter"] + [v for v in c["optional"] if v in draft["optional_members"]]:
                wanted.setdefault(ident, []).append("combination:" + c["id"])
    if draft["pocket"]["enabled"]: wanted.setdefault(draft["bundle"]["defaults"]["pocket_species"], []).append("pocket")
    return wanted


def wanted_species(draft):
    wanted = sources_for(draft)
    for ident in list(wanted):
        dismissed = draft["dismissed"][ident] if ident in draft["dismissed"] else []
        wanted[ident] = [s for s in wanted[ident] if s not in dismissed]
        if not wanted[ident]: del wanted[ident]
    for ident in draft["manual_ids"]: wanted.setdefault(ident, []).append("manual")
    return {k: v for k, v in wanted.items() if k not in draft["exclusions"]}


def remove_species(draft, ident):
    require(ident in draft["preferences"], "Select this species before removing it.")
    draft["manual_ids"] = [v for v in draft["manual_ids"] if v != ident]
    sources = sources_for(draft)
    draft["dismissed"][ident] = sources[ident] if ident in sources else []


def add_species(draft, ident):
    if ident not in draft["preferences"]: draft["preferences"][ident] = make_preference(draft, ident)
    elif draft["preferences"][ident]["density"] == 0:
        density = defaults_for(draft, ident)
        draft["preferences"][ident].update(density=density, quantity=count_for(density, draft["physical"]["restoration_area"]))
    if ident not in draft["manual_ids"]: draft["manual_ids"].append(ident)
    draft["exclusions"] = [v for v in draft["exclusions"] if v != ident]
    draft["legacy_exclusions"] = [v for v in draft["legacy_exclusions"] if v != ident]
    draft["dismissed"].pop(ident, None)


def resize(draft, width, height):
    old_w, old_h = dimensions(draft)
    require(number(width, 0.001, 1000000) and number(height, 0.001, 1000000), "Enter positive zone dimensions.")
    aspect = width / height
    require(0.05 <= aspect <= 20, "Width/height ratio must remain between 0.05 and 20.")
    dx, dy = (width - old_w) / 2, (height - old_h) / 2
    draft["zone"]["aspect"] = aspect
    for p in [*draft["positions"].values(), *draft["displaced"].values(), *draft["existing"]]:
        p["x"] += dx; p["y"] += dy
    if draft["pocket"]["x"] is not None:
        draft["pocket"]["x"] += dx; draft["pocket"]["y"] += dy
    for key, p in list(draft["positions"].items()):
        if not (0 <= p["x"] <= width and 0 <= p["y"] <= height):
            draft["displaced"][key] = p
            if key not in draft["unplaced"]: draft["unplaced"].append(key)
            del draft["positions"][key]


def overlay_for(draft, ident, kind):
    if ident in draft["dimensions"] and draft["dimensions"][ident][kind] is not None:
        v = draft["dimensions"][ident][kind]
        return {"diameter_m": [v["diameter"], v["diameter"]], "kind": "typical", "evidence": v["basis"], "source": None, "section": "User input", "context": v["note"]}
    record = next((p for p in draft["bundle"]["plant_dimensions"]["plants"] if p["id"] == ident), None)
    if record is not None and record[kind] is not None:
        return record[kind]
    if kind == "root_ball" and "root_ball_default" in draft["bundle"]["defaults"]:
        return deepcopy(draft["bundle"]["defaults"]["root_ball_default"])
    # Older snapshots explicitly have no shared root-ball assumption. Custom plants
    # have no botanical reference, but can use the declared shared drawing default.
    return None


def edit(draft, command, before):
    require(isinstance(command, dict) and "kind" in command, "Missing designer command.")
    kind = command["kind"]
    if kind == "plant":
        keys(command, {"kind", "id", "enabled"}, "plant command")
        require(type(command["enabled"]) is bool, "Invalid plant selection.")
        if command["enabled"]: add_species(draft, command["id"])
        else: remove_species(draft, command["id"])
    elif kind == "density":
        keys(command, {"kind", "id", "value"}, "density command")
        ident, value = command["id"], command["value"]
        quantity = count_for(value, draft["physical"]["restoration_area"])
        add_species(draft, ident)
        draft["preferences"][ident].update(density=value, quantity=quantity)
        if value == 0: remove_species(draft, ident)
    elif kind == "density_step":
        keys(command, {"kind", "id", "step"}, "density arrow command")
        require(type(command["step"]) is int and command["step"] in {-1, 1}, "Density arrows change one plant at a time.")
        ident = command["id"]
        require(ident in before, "Select this plant before changing its density.")
        p = draft["preferences"][ident]; quantity = max(0, p["quantity"] + command["step"])
        require(quantity <= 1000000, "Plant count exceeds the supported maximum.")
        p.update(density=quantity * 10000 / draft["physical"]["restoration_area"], quantity=quantity)
        if quantity == 0: remove_species(draft, ident)
    elif kind == "exclude":
        keys(command, {"kind", "id", "enabled"}, "persistent exclusion")
        ident = command["id"]; require(type(command["enabled"]) is bool, "Invalid exclusion value.")
        if command["enabled"]:
            if ident not in draft["preferences"]: draft["preferences"][ident] = make_preference(draft, ident)
            remove_species(draft, ident)
            if ident not in draft["exclusions"]: draft["exclusions"].append(ident)
        else:
            draft["exclusions"] = [v for v in draft["exclusions"] if v != ident]
            draft["legacy_exclusions"] = [v for v in draft["legacy_exclusions"] if v != ident]
            draft["dismissed"].pop(ident, None)
    elif kind == "toggle":
        keys(command, {"kind", "collection", "id", "enabled"}, "toggle command")
        key = command["collection"]
        require(key in {"approaches", "combinations", "optional_members", "manual_ids"} and type(command["enabled"]) is bool, "Invalid toggle.")
        if command["enabled"] and command["id"] not in draft[key]: draft[key].append(command["id"])
        if not command["enabled"]: draft[key] = [v for v in draft[key] if v != command["id"]]
    elif kind == "selection":
        keys(command, {"kind", "selection"}, "selection command")
        selection = deepcopy(command["selection"])
        keys(selection, {"version", "entries"}, "selection value")
        require(selection["version"] == 2 and isinstance(selection["entries"], list), "Invalid priced selection.")
        after_ids = {p["id"] for p in selection["entries"]}
        require(len(after_ids) == len(selection["entries"]), "Duplicate plant entry.")
        for row in selection["entries"]:
            require(type(row["quantity"]) is int and row["quantity"] >= 0, "Invalid derived plant count.")
            check = {**row, "quantity": max(1, row["quantity"])}
            planting.resolve({"version": 2, "entries": [check]})
            if row["id"] not in draft["preferences"]:
                require(not row["id"].startswith("custom-"), "Use the custom-plant command with an explicit density.")
                preference = make_preference(draft, row["id"], check)
                require(row["quantity"] == preference["quantity"], "New designer selections must use the configured density; use a density command to change it.")
                draft["preferences"][row["id"]] = preference
            else:
                require(row["quantity"] == draft["preferences"][row["id"]]["quantity"], "Edit density rather than derived quantity in the designer.")
                draft["preferences"][row["id"]]["entry"] = check
            if row["id"] not in before: add_species(draft, row["id"])
        for ident in before.keys() - after_ids: remove_species(draft, ident)
    elif kind == "custom":
        keys(command, {"kind", "entry", "density"}, "custom plant command")
        entry = command["entry"]
        planting.resolve({"version": 2, "entries": [entry]})
        require(entry["id"].startswith("custom-") and entry["id"] not in draft["preferences"], "Custom plant identity must be new.")
        quantity = count_for(command["density"], draft["physical"]["restoration_area"])
        draft["preferences"][entry["id"]] = {"entry": deepcopy(entry), "density": command["density"], "quantity": quantity}
        add_species(draft, entry["id"])
    elif kind == "resize":
        keys(command, {"kind", "axis", "length"}, "resize command")
        require(command["axis"] in {"width", "height"} and number(command["length"], 0.001, 1000000), "Invalid resize dimension.")
        area = draft["physical"]["restoration_area"]
        w, h = (command["length"], area / command["length"]) if command["axis"] == "width" else (area / command["length"], command["length"])
        resize(draft, w, h)
    elif kind == "patch":
        keys(command, {"kind", "section", "values"}, "designer patch")
        section, values = command["section"], command["values"]
        require(section in {"physical", "zone", "site", "pocket", "mulch"} and isinstance(values, dict) and set(values) <= set(draft[section]), "Unknown designer setting.")
        if section == "physical" and "restoration_area" in values:
            area = values["restoration_area"]; require(number(area, 0.01, 1000000), "Enter a positive planting area.")
            if draft["area_density_update"] is None:
                draft["area_density_update"] = {ident: draft["preferences"][ident]["density"] for ident in before}
            aspect = draft["zone"]["aspect"]
            resize(draft, math.sqrt(area * aspect), math.sqrt(area / aspect))
            draft["physical"]["restoration_area"] = area
            for ident in before:
                p = draft["preferences"][ident]; p["density"] = p["quantity"] * 10000 / area
        if section == "zone" and "aspect" in values:
            a = draft["physical"]["restoration_area"]; ratio = values["aspect"]
            require(number(ratio, 0.05, 20), "Invalid zone proportions.")
            resize(draft, math.sqrt(a * ratio), math.sqrt(a / ratio))
        if section == "pocket":
            w, h = dimensions(draft)
            for coord, limit in (("x", w), ("y", h)):
                if coord in values: require(number(values[coord], 0, limit), "Pocket centre must be within the zone.")
        draft[section].update(deepcopy(values))
    elif kind == "restore_densities":
        keys(command, {"kind"}, "density update")
        require(draft["area_density_update"] is not None, "No previous area density targets to restore.")
        for ident, density in draft["area_density_update"].items():
            if ident in before: draft["preferences"][ident].update(density=density, quantity=count_for(density, draft["physical"]["restoration_area"]))
        draft["area_density_update"] = None
    elif kind == "dimension":
        keys(command, {"kind", "id", "feature", "value"}, "dimension override command")
        require(command["id"] in draft["preferences"] and command["feature"] in {"root_ball", "crown"}, "Select a plant and dimension type first.")
        if command["id"] not in draft["dimensions"]: draft["dimensions"][command["id"]] = {"root_ball": None, "crown": None}
        draft["dimensions"][command["id"]][command["feature"]] = deepcopy(command["value"])
    elif kind == "position":
        keys(command, {"kind", "id", "x", "y"}, "position command")
        ident = command["id"]; w, h = dimensions(draft)
        allowed = {f"{r['id']}:{i}" for r in draft["selection"]["entries"] for i in range(min(r["quantity"], draft["bundle"]["defaults"]["max_instances"]))}
        require(ident in allowed and number(command["x"], 0, w) and number(command["y"], 0, h), "Select an existing instance and coordinates inside the zone.")
        draft["positions"][ident] = {"x": command["x"], "y": command["y"], "manual": True}
        draft["unplaced"] = [v for v in draft["unplaced"] if v != ident]; draft["displaced"].pop(ident, None)
    elif kind == "radius":
        keys(command, {"kind", "id", "radius"}, "layout clearance command")
        require(command["id"] in before and number(command["radius"], 0.01, 100), "Invalid layout clearance.")
        draft["radii"][command["id"]] = command["radius"]
    elif kind == "rearrange":
        keys(command, {"kind"}, "rearrange command")
        draft["positions"] = {k: v for k, v in draft["positions"].items() if v["manual"]}
    elif kind == "reset_exclusions":
        keys(command, {"kind"}, "reset exclusions")
        draft["exclusions"] = []; draft["legacy_exclusions"] = []
    elif kind == "upgrade_rules":
        keys(command, {"kind"}, "rules update")
        draft["bundle"] = load_bundle()
    elif kind == "existing":
        keys(command, {"kind", "plants"}, "existing vegetation command")
        draft["existing"] = deepcopy(command["plants"])
    else: raise Invalid("Unsupported designer command: " + str(kind))
    draft["overrides"].append(deepcopy(command))


@checked
def evaluate(original, project, command=None):
    validate_draft(original, project)
    if original["version"] == 1:
        if command is None: return legacy.evaluate(original, project)
        require(command == {"kind": "upgrade_rules"}, "Review and adopt the designer upgrade before editing this historical draft.")
        return evaluate(upgrade(original), project)
    draft = deepcopy(original)
    before = wanted_species(draft)
    before_sources = sources_for(draft)
    if command is not None: edit(draft, command, before)
    # Newly activated sources may offer a previously dismissed species again.
    after_sources = sources_for(draft)
    for ident, sources in after_sources.items():
        new_sources = set(sources) - set(before_sources[ident] if ident in before_sources else [])
        if ident in draft["dismissed"]:
            draft["dismissed"][ident] = [v for v in draft["dismissed"][ident] if v not in new_sources]
    demand = wanted_species(draft)
    for ident in demand:
        if ident not in draft["preferences"]: draft["preferences"][ident] = make_preference(draft, ident)
        elif ident not in before and draft["preferences"][ident]["density"] == 0:
            density = defaults_for(draft, ident)
            draft["preferences"][ident].update(density=density, quantity=count_for(density, draft["physical"]["restoration_area"]))
    pocket_species = draft["bundle"]["defaults"]["pocket_species"]
    if original["pocket"]["enabled"] and not draft["pocket"]["enabled"] and pocket_species in draft["manual_ids"]:
        for key, pos in list(draft["positions"].items()):
            if key.startswith(pocket_species + ":") and not pos["manual"]:
                draft["displaced"][key] = pos
                if key not in draft["unplaced"]: draft["unplaced"].append(key)
                del draft["positions"][key]
    rows = []
    for ident in demand:
        p = draft["preferences"][ident]
        if p["quantity"]: rows.append({**deepcopy(p["entry"]), "quantity": p["quantity"]})
    draft["selection"] = {"version": 2, "entries": rows}
    valid_keys = {f"{r['id']}:{i}" for r in rows for i in range(min(r["quantity"], draft["bundle"]["defaults"]["max_instances"]))}
    draft["positions"] = {k: v for k, v in draft["positions"].items() if k in valid_keys}
    draft["unplaced"] = [k for k in dict.fromkeys(draft["unplaced"]) if k in valid_keys]
    draft["displaced"] = {k: v for k, v in draft["displaced"].items() if k in draft["unplaced"]}
    base = base_draft(draft)
    positive_ids = {r["id"] for r in rows}
    base["manual_ids"] = [r["id"] for r in rows]
    base["exclusions"] = sorted({p["id"] for p in planting.catalogue()["plants"]} - positive_ids)
    base["radii"] = {k: v for k, v in draft["radii"].items() if k in positive_ids}
    # Reuse existing layout and pricing; v2 alone owns source/density reconciliation.
    result = legacy.evaluate(base, project)
    draft["positions"] = result["draft"]["positions"]
    draft["unplaced"] = result["draft"]["unplaced"]
    if draft["pocket"]["x"] is None and result["draft"]["pocket"]["x"] is not None:
        draft["pocket"].update(x=result["draft"]["pocket"]["x"], y=result["draft"]["pocket"]["y"])
    w, h = dimensions(draft)
    if draft["pocket"]["enabled"] and draft["pocket"]["x"] is not None and not (0 <= draft["pocket"]["x"] <= w and 0 <= draft["pocket"]["y"] <= h):
        key = pocket_species + ":0"
        if key in draft["positions"] and not draft["positions"][key]["manual"]:
            draft["displaced"][key] = draft["positions"].pop(key)
            if key not in draft["unplaced"]: draft["unplaced"].append(key)
        result["instances"] = [p for p in result["instances"] if p["id"] != key or p["manual"]]
    for inst in result["instances"]: inst["reasons"] = demand[inst["species"]]
    result.update(draft=draft, ruleset_hash=digest(draft["bundle"]))
    result["reasons"] = [{"species": ident, "reasons": reasons, "rules": [r["id"] for r in result["rules"] if r["condition"] == "always" or any(c["rule"] == r["id"] and "combination:" + c["id"] in reasons for c in draft["bundle"]["vegetation_combinations"]) or r["id"] in reasons]} for ident, reasons in demand.items()]
    result["overlays"] = {ident: {k: overlay_for(draft, ident, k) for k in ("root_ball", "crown")} for ident in demand}
    result["species"] = [{"id": ident, "requested_density": draft["preferences"][ident]["density"], "effective_density": draft["preferences"][ident]["quantity"] * 10000 / draft["physical"]["restoration_area"], "density_step": 10000 / draft["physical"]["restoration_area"], "quantity": draft["preferences"][ident]["quantity"], "entry": {**draft["preferences"][ident]["entry"], "quantity": draft["preferences"][ident]["quantity"]}} for ident in demand]
    labels = {p["id"]: p["label"] for p in planting.catalogue()["plants"]}
    for ident, pref in draft["preferences"].items():
        if ident not in labels: labels[ident] = pref["entry"]["label"]
    removed = before.keys() - demand.keys(); added = demand.keys() - before.keys()
    result["removed"] = [{"id": ident, "reason": "Removed from this draft; Undo restores the previous design."} for ident in sorted(removed)]
    changes = ["Removed " + labels[i] for i in sorted(removed)] + ["Added " + labels[i] for i in sorted(added)]
    if removed and command is not None:
        if command["kind"] == "toggle" and not command["enabled"]:
            collection = command["collection"]
            title = next((c["title"] for c in draft["bundle"]["vegetation_combinations"] if c["id"] == command["id"]), None)
            if collection == "approaches": title = next(r["title"] for r in draft["bundle"]["rules"] if r["id"] == command["id"])
            if title is not None: changes = ["Removed " + labels[i] + " because " + title + " was switched off" for i in sorted(removed)]
        elif command["kind"] == "patch" and command["section"] == "pocket" and not draft["pocket"]["enabled"]:
            changes = ["Removed " + labels[i] + " because the moisture pocket was switched off" for i in sorted(removed)]
    for ident in sorted(before.keys() & demand.keys()):
        old_quantity = original["preferences"][ident]["quantity"]
        new_quantity = draft["preferences"][ident]["quantity"]
        if old_quantity != new_quantity: changes.append(f"{labels[ident]}: {old_quantity} → {new_quantity} plants")
    result["message"] = "; ".join(changes) + (". Undo is available." if changes else "Design updated. Undo is available." if command else "")
    result["density_update"] = None if draft["area_density_update"] is None else [{"id": ident, "density": density, "quantity": count_for(density, draft["physical"]["restoration_area"])} for ident, density in draft["area_density_update"].items() if ident in demand]
    summary = result["summary"]; summary["placed"] = len(result["instances"]); summary["unplaced"] = summary["plants"] - summary["placed"]
    summary.update(shrub_density=summary["shrubs"] * 10000 / draft["physical"]["restoration_area"], overall_density=summary["plants"] * 10000 / draft["physical"]["restoration_area"])
    result["issues"] = [i for i in result["issues"] if "planning footprint" not in i.lower() and "plants are unplaced" not in i]
    if summary["unplaced"]: result["issues"].append(f"{summary['unplaced']} plants are unplaced and remain included in costs.")
    if draft["pocket"]["enabled"] and draft["pocket"]["x"] is not None:
        p = draft["pocket"]
        if p["x"] - p["radius"] < 0 or p["x"] + p["radius"] > w or p["y"] - p["radius"] < 0 or p["y"] + p["radius"] > h: result["issues"].append("The assumed moisture pocket extends outside the planting zone.")
    if any(not (0 <= p["x"] <= w and 0 <= p["y"] <= h) for p in draft["existing"]): result["issues"].append("Existing vegetation outside the resized zone remains recorded; edit its coordinates if required.")
    validate_draft(draft, project)
    return result


def import_plan(project):
    require(project["demonstrator"] is not None and not project["demonstrator"]["legacy"], "No current demonstrator plan to import.")
    draft = new_draft(project); plan = project["demonstrator"]["plan"]
    require("plant_selection" in plan, "This aggregate-only plan has no recorded species; choose them explicitly.")
    selection = planting.priced_selection(plan["plant_selection"], plant_prices.snapshot(), plan)
    for key in draft["physical"]: draft["physical"][key] = deepcopy(plan[key])
    draft["manual_ids"] = [p["id"] for p in selection["entries"]]
    draft["selection"] = deepcopy(selection)
    for row in selection["entries"]: draft["preferences"][row["id"]] = {"density": row["quantity"] * 10000 / draft["physical"]["restoration_area"], "quantity": row["quantity"], "entry": deepcopy(row)}
    draft["overrides"] = [{"kind": "imported_plan", "description": "Recorded counts and prices retained; coordinates are new assumptions."}]
    return evaluate(draft, project)
