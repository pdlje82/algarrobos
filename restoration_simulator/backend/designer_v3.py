"""Current designer-v3 policy. Earlier evaluators remain frozen for pinned snapshots."""
from copy import deepcopy
from decimal import Decimal, ROUND_HALF_UP
import math
import random
import hashlib
from contextvars import ContextVar
from functools import wraps
from pathlib import Path

from . import designer_v1 as legacy
from . import designer_v2 as previous
from . import planting, plant_prices
from .configuration import read_json, keys
from .engine import Invalid, require, number

DIRECTORY = legacy.DIRECTORY
checked = legacy.checked
digest = legacy.digest
dimensions = legacy.dimensions
V2_FIELDS = previous.V2_FIELDS
V3_FIELDS = {"associations", "placement_preferences", "placement_seed", "placement_seen", "placement_notes"}

# Request-scoped cache: read and validate the authoritative catalogue once, never
# retain stale configuration across previews or substitute for a failed read.
_catalogue = ContextVar("designer_v3_catalogue", default=None)


def catalogue_context(function):
    @wraps(function)
    def call(*args, **kwargs):
        if _catalogue.get() is not None:
            return function(*args, **kwargs)
        token = _catalogue.set({p["id"]: p for p in planting.catalogue()["plants"]})
        try:
            return function(*args, **kwargs)
        finally:
            _catalogue.reset(token)
    return call


def catalogue_rows():
    rows = _catalogue.get()
    if rows is None:
        # Direct helper calls outside a preview still require a validated read.
        return {p["id"]: p for p in planting.catalogue()["plants"]}
    return rows


def v2_bundle(bundle):
    """Explicit validation projection; never persisted or used to evaluate new layouts."""
    result = deepcopy(bundle)
    result["manifest"].update(version=2, engine="designer-v2")
    for key in ("mature_diameters", "custom_diameters", "placement"):
        result["defaults"].pop(key)
    density = result["defaults"]["density_defaults"]
    result["defaults"]["density_defaults"] = {"carob": density["carob"], "other": density["tree"]}
    result["plant_dimensions"]["version"] = 1
    for row in result["plant_dimensions"]["plants"]:
        row.pop("planning")
    return result


def v1_bundle(bundle):
    return previous.v1_bundle(v2_bundle(bundle))


@checked
def validate_bundle(bundle):
    version = bundle["manifest"]["version"]
    if version < 3:
        return previous.validate_bundle(bundle)
    require(type(version) is int and version == 3 and bundle["manifest"]["engine"] == "designer-v3", "Unsupported designer rules engine/version.")
    d = bundle["defaults"]
    keys(d["density_defaults"], {"carob", "tree", "shrub", "grass"}, "growth-form density defaults")
    require(all(number(v, 0, 1000000) for v in d["density_defaults"].values()), "Invalid growth-form density.")
    species = {p["id"] for p in planting.catalogue()["plants"]}
    keys(d["mature_diameters"], species, "catalogue diameter defaults")
    keys(d["custom_diameters"], {"tree", "shrub", "grass"}, "custom diameter defaults")
    require(all(number(v, .001, 200) for v in [*d["mature_diameters"].values(), *d["custom_diameters"].values()]), "Every plant needs a positive drawing diameter.")
    policy = d["placement"]
    keys(policy, {"minimum_clearance", "seed", "attempts_per_parent", "attempts_open", "categories", "custom_category", "by_species"}, "placement policy")
    require(number(policy["minimum_clearance"], .001, 100) and type(policy["seed"]) is int and 0 <= policy["seed"] <= 2**32-1, "Invalid placement clearance/seed.")
    require(all(type(policy[k]) is int and 1 <= policy[k] <= 10000 for k in ("attempts_per_parent", "attempts_open")), "Placement attempts must be bounded positive integers.")
    require(policy["categories"] == ["within_crowns", "open_ground", "independent"] and policy["custom_category"] in policy["categories"], "Unsupported placement categories.")
    keys(policy["by_species"], species, "species placement categories")
    require(all(v in policy["categories"] for v in policy["by_species"].values()), "Invalid species placement category.")
    require(all(policy["by_species"][ident] == "independent" for ident, row in catalogue_rows().items() if row["group"] == "tree"), "Planned trees must use the independent tree layout; companion categories apply to non-tree plants.")
    require(bundle["plant_dimensions"]["version"] == 2, "Unsupported v3 dimension reference version.")
    for row in bundle["plant_dimensions"]["plants"]:
        value = row["planning"]
        keys(value, {"method", "evidence", "basis"}, "drawing diameter selection")
        require(value["method"] in {"reference_midpoint", "project_estimate"} and value["evidence"] == "assumption" and isinstance(value["basis"], str) and value["basis"], "Missing drawing estimate rationale.")
        if value["method"] == "reference_midpoint":
            require(row["crown"] is not None, "A midpoint requires a published spread range.")
            lo, hi = row["crown"]["diameter_m"]
            midpoint = float(((Decimal(str(lo))+Decimal(str(hi)))/2).quantize(Decimal(".1"), rounding=ROUND_HALF_UP))
            require(d["mature_diameters"][row["id"]] == midpoint, "Drawing diameter disagrees with the declared reference midpoint.")
    require({"mature_diameters", "shrub_placement", "root_ball_default"} <= {r["id"] for r in bundle["rules"]}, "Missing registered v3 rules.")
    for rule in bundle["rules"]:
        if rule["id"] in {"mature_diameters", "shrub_placement", "root_ball_default"}:
            require(rule["effect"] == "advisory" and rule["condition"] == "always", "Registered v3 rule effect/condition changed; implement and version its handler explicitly.")
    previous.validate_bundle(v2_bundle(bundle))
    return bundle

@checked
def load_bundle():
    m = read_json(DIRECTORY / "manifest.json")
    require(m["version"] == 3 and m["engine"] == "designer-v3", "Current repository rules must use designer-v3. Restore the versioned manifest; saved older bundles are supported only as pinned snapshots.")
    require(m["files"] == ["defaults.json", "sources.json", "rules.json", "vegetation_combinations.json", "treatments.json", "plant_dimensions.json"], "Unsupported designer file manifest.")
    return validate_bundle({"manifest": m, **{Path(f).stem: read_json(DIRECTORY / f) for f in m["files"]}})


def count_for(density, area):
    require(number(density, 0, 1000000) and number(area, 0.01, 1000000), "Enter a non-negative density and a valid planting area.")
    result = int((Decimal(str(density)) * Decimal(str(area)) / Decimal(10000)).quantize(Decimal(1), rounding=ROUND_HALF_UP))
    require(result <= 1000000, "This density and area exceed one million plants per species; reduce either input.")
    return result


def group_for(draft, ident):
    catalogue = {ident: p["group"] for ident, p in catalogue_rows().items()}
    if ident in catalogue:
        return catalogue[ident]
    require(ident in draft["preferences"] and ident.startswith("custom-"), "Missing custom growth form.")
    return draft["preferences"][ident]["entry"]["group"]


def defaults_for(draft, ident):
    key = "carob" if ident == "carob" else group_for(draft, ident)
    return draft["bundle"]["defaults"]["density_defaults"][key]

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
    result["version"] = 3
    if draft["version"] == 1:
        area = draft["physical"]["restoration_area"]
        result.update(preferences={r["id"]: {"density": r["quantity"] * 10000 / area, "quantity": r["quantity"], "entry": deepcopy(r)} for r in draft["selection"]["entries"]}, dismissed={}, legacy_exclusions=deepcopy(draft["exclusions"]), dimensions={}, displaced={}, area_density_update=None)
    if draft["version"] < 3:
        # Preserve historical coordinates, quantities and evidence; invent no links.
        ids = [f"{r['id']}:{i}" for r in result["selection"]["entries"] for i in range(min(r["quantity"], result["bundle"]["defaults"]["max_instances"]))]
        result.update(associations={}, placement_preferences={}, placement_seed=result["bundle"]["defaults"]["placement"]["seed"], placement_seen=ids, placement_notes={k: "Imported position or unplaced instance; no historical tree association inferred." for k in ids})
    return result

def new_draft(project):
    b = load_bundle()
    values = {f["name"]: deepcopy(f["default"]) for f in legacy.plan_fields(project)}
    physical = {k: values[k] for k in legacy.PHYSICAL if k != "plant_selection"}
    physical.update(parcel_id=None, restoration_area=b["defaults"]["area"])
    d = b["defaults"]
    return {"version": 3, "bundle": b, "physical": physical,
        "zone": {k: d[k] for k in ("aspect", "boundary_side", "boundary_type", "boundary_custom")},
        "site": {"rainfall": None, "soil": "unknown", "notes": ""},
        "approaches": [], "combinations": [], "optional_members": [], "manual_ids": [], "exclusions": [],
        "selection": {"version": 2, "entries": []}, "positions": {}, "radii": {}, "overrides": [],
        "pocket": {"enabled": False, "x": None, "y": None, "radius": d["pocket_radius"]},
        "mulch": {"enabled": False, "type": d["mulch_type"], "radius": d["mulch_radius"], "plant_ids": []},
        "existing": [], "unplaced": [], "preferences": {}, "dismissed": {}, "legacy_exclusions": [], "dimensions": {}, "displaced": {}, "area_density_update": None, "associations": {}, "placement_preferences": {}, "placement_seed": d["placement"]["seed"], "placement_seen": [], "placement_notes": {}}


def base_draft(draft):
    result = {k: deepcopy(v) for k, v in draft.items() if k not in V2_FIELDS | V3_FIELDS}
    result["version"] = 1
    result["bundle"] = v1_bundle(draft["bundle"])
    width, height = dimensions(draft)
    # Out-of-zone features remain in v2; the historical geometry evaluator receives
    # only its supported in-zone subset. The response explicitly reports omissions.
    result["existing"] = [p for p in result["existing"] if 0 <= p["x"] <= width and 0 <= p["y"] <= height]
    if draft["pocket"]["x"] is not None and not (0 <= draft["pocket"]["x"] <= width and 0 <= draft["pocket"]["y"] <= height):
        result["pocket"].update(enabled=False, x=None, y=None)
    return result


def v2_draft(draft):
    result = {k: deepcopy(v) for k, v in draft.items() if k not in V3_FIELDS}
    result.update(version=2, bundle=v2_bundle(draft["bundle"]))
    return result


@catalogue_context
@checked
def validate_draft(draft, project=None):
    if draft["version"] < 3:
        return previous.validate_draft(draft, project)
    require(type(draft["version"]) is int and draft["version"] == 3 and draft["bundle"]["manifest"]["version"] == 3, "Unsupported designer draft version/bundle.")
    validate_bundle(draft["bundle"])
    previous.validate_draft(v2_draft(draft), project)
    require(set(draft) == set(v2_draft(draft)) | V3_FIELDS, "Unknown or missing designer-v3 fields.")
    require(type(draft["placement_seed"]) is int and 0 <= draft["placement_seed"] <= 2**32-1, "Invalid saved placement seed.")
    require(isinstance(draft["associations"], dict) and isinstance(draft["placement_preferences"], dict) and isinstance(draft["placement_notes"], dict), "Invalid placement/association data.")
    valid = instance_ids(draft)
    require(isinstance(draft["placement_seen"], list) and len(draft["placement_seen"]) == len(set(draft["placement_seen"])) and set(draft["placement_seen"]) <= valid, "Invalid seen placement identities.")
    require(set(draft["placement_notes"]) == set(draft["placement_seen"]) and all(isinstance(v, str) and v for v in draft["placement_notes"].values()), "Missing saved placement explanations.")
    require(set(draft["positions"]) <= set(draft["placement_seen"]) and set(draft["unplaced"]) <= set(draft["placement_seen"]), "Positions require explicit placement history.")
    for ident, category in draft["placement_preferences"].items():
        require(ident in draft["preferences"] and category in draft["bundle"]["defaults"]["placement"]["categories"], "Invalid species placement preference.")
        require(group_for(draft, ident) != "tree", "Tree placement preferences cannot override the registered tree layout.")
    for child, link in draft["associations"].items():
        keys(link, {"parent_id", "dx", "dy"}, "tree association")
        require(child in valid and link["parent_id"] in valid and child != link["parent_id"], "Association references an absent plant.")
        require(group_for(draft, child.rsplit(":", 1)[0]) != "tree" and group_for(draft, link["parent_id"].rsplit(":", 1)[0]) == "tree", "Only non-tree plants can follow planned trees.")
        require(number(link["dx"], -1000000, 1000000) and number(link["dy"], -1000000, 1000000), "Invalid association offset.")
        require(child not in draft["positions"] or not draft["positions"][child]["manual"], "A manually moved shrub must be detached.")
        parent = retained_position(draft, link["parent_id"])
        child_pos = retained_position(draft, child)
        require(parent is not None and child_pos is not None, "Associated plants need recoverable coordinates.")
        require(math.isclose(child_pos["x"], parent["x"]+link["dx"], abs_tol=1e-8) and math.isclose(child_pos["y"], parent["y"]+link["dy"], abs_tol=1e-8), "Association offset and coordinates disagree.")
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
    if kind == "root_ball":
        return deepcopy(draft["bundle"]["defaults"]["root_ball_default"])
    records = {p["id"]: p for p in draft["bundle"]["plant_dimensions"]["plants"]}
    if ident in records:
        diameter = draft["bundle"]["defaults"]["mature_diameters"][ident]
        row = records[ident]
        context = row["planning"]["basis"]
        source = row["crown"]["source"] if row["crown"] is not None else row["references"][0]
    else:
        diameter = draft["bundle"]["defaults"]["custom_diameters"][group_for(draft, ident)]
        context = "Illustrative custom growth-form drawing default; no botanical measurement."
        source = None
    return {"diameter_m": [diameter, diameter], "kind": "typical", "evidence": "assumption", "source": source, "section": "Representative drawing diameter", "context": context}

def instance_ids(draft):
    limit = draft["bundle"]["defaults"]["max_instances"]
    return {f"{r['id']}:{i}" for r in draft["selection"]["entries"] for i in range(min(r["quantity"], limit))}


def retained_position(draft, ident):
    if ident in draft["positions"]: return draft["positions"][ident]
    if ident in draft["displaced"]: return draft["displaced"][ident]
    return None  # Explicitly unplaced with no previous coordinates.


def placement_category(draft, species):
    if species in draft["placement_preferences"]: return draft["placement_preferences"][species]
    policy = draft["bundle"]["defaults"]["placement"]
    if species.startswith("custom-"): return policy["custom_category"]
    return policy["by_species"][species]


def store_position(draft, ident, pos):
    width, height = dimensions(draft)
    if 0 <= pos["x"] <= width and 0 <= pos["y"] <= height:
        draft["positions"][ident] = pos
        draft["displaced"].pop(ident, None)
        draft["unplaced"] = [v for v in draft["unplaced"] if v != ident]
    else:
        draft["displaced"][ident] = pos
        draft["positions"].pop(ident, None)
        if ident not in draft["unplaced"]: draft["unplaced"].append(ident)


def reconcile_positions(draft, original, command, valid):
    draft["placement_seen"] = [v for v in draft["placement_seen"] if v in valid]
    draft["placement_notes"] = {k: v for k, v in draft["placement_notes"].items() if k in valid}
    for child, link in list(draft["associations"].items()):
        if child not in valid:
            del draft["associations"][child]
        elif link["parent_id"] not in valid:
            del draft["associations"][child]
            draft["placement_notes"][child] = "Tree removed; shrub detached and its last coordinates retained."
    if command is not None and command["kind"] == "position":
        ident = command["id"]
        draft["associations"].pop(ident, None)
        if ident not in draft["placement_seen"]: draft["placement_seen"].append(ident)
        draft["placement_notes"][ident] = "Manually positioned; independent of tree movement."
    pocket = draft["pocket"]
    if pocket["enabled"]:
        width, height = dimensions(draft)
        for coord, limit, fraction in zip(("x", "y"), (width, height), draft["bundle"]["defaults"]["pocket_position"]):
            if pocket[coord] is None: pocket[coord] = limit * fraction
        ident = draft["bundle"]["defaults"]["pocket_species"] + ":0"
        pos = retained_position(draft, ident)
        if ident in valid and pos is not None and not pos["manual"]:
            store_position(draft, ident, {"x": pocket["x"], "y": pocket["y"], "manual": False})
    # Translating a parent (including the pocket encina) retains child offsets.
    for child, link in draft["associations"].items():
        parent = retained_position(draft, link["parent_id"])
        require(parent is not None, "An associated shrub lost its parent coordinates.")
        store_position(draft, child, {"x": parent["x"] + link["dx"], "y": parent["y"] + link["dy"], "manual": False})


def tree_candidates(draft):
    """Registered MR/grid templates remain illustrative tree placement."""
    width, height = dimensions(draft)
    d = draft["bundle"]["defaults"]
    step = max(d["placement_step"], math.sqrt(width*height/d["max_candidates"]))
    points = [(x*step+d["placement_margin"], y*step+d["placement_margin"])
              for y in range(min(math.ceil(height/step), d["max_candidates"]))
              for x in range(min(math.ceil(width/step), d["max_candidates"]))]
    points = [p for p in points if p[0] <= width-d["placement_margin"] and p[1] <= height-d["placement_margin"]][:d["max_candidates"]]
    side = draft["zone"]["boundary_side"]
    def orient(x, y):
        if side == "bottom": return x, height-y
        if side == "left": return y/height*width, x/width*height
        if side == "right": return width-y/height*width, x/width*height
        return x, y
    points = [orient(*p) for p in points]
    centres = d["mr2_centres"] if "mr2" in draft["approaches"] else d["mr1_centres"] if "mr1" in draft["approaches"] else None
    if centres is not None:
        targets = [orient(c[0]*width, c[1]*height) for c in centres]
        points.sort(key=lambda p: (min(math.dist(p, c)**2 for c in targets), p[1], p[0]))
    return points


def plant_name(draft, ident):
    species, index = ident.rsplit(":", 1)
    catalogue = {ident: p["label"] for ident, p in catalogue_rows().items()}
    label = catalogue[species] if species in catalogue else draft["preferences"][species]["entry"]["label"]
    return f"{label} {int(index)+1}"


def place_new(draft, valid):
    """Only unseen instances are generated. Failed/old unplaced plants never retry."""
    width, height = dimensions(draft)
    policy = draft["bundle"]["defaults"]["placement"]
    clearance = policy["minimum_clearance"]
    limit = draft["bundle"]["defaults"]["max_instances"]
    def clear(x, y):
        return (0 <= x <= width and 0 <= y <= height and
                all(math.hypot(x-p["x"], y-p["y"]) >= clearance-1e-9 for p in [*draft["positions"].values(), *draft["existing"]]))
    def trees():
        return sorted(k for k in draft["positions"] if group_for(draft, k.rsplit(":", 1)[0]) == "tree")
    def circle(parent):
        pos = draft["positions"][parent]
        radius = overlay_for(draft, parent.rsplit(":", 1)[0], "crown")["diameter_m"][0]/2
        return pos["x"], pos["y"], radius
    def random_for(ident):
        key = f'{draft["placement_seed"]}:{ident}'
        return random.Random(int.from_bytes(hashlib.sha256(key.encode()).digest(), "big"))
    new = sorted(valid - set(draft["placement_seen"]), key=lambda k: (group_for(draft, k.rsplit(":", 1)[0]) != "tree", k))
    grid = tree_candidates(draft)
    for ident in new:
        species = ident.rsplit(":", 1)[0]
        category = placement_category(draft, species)
        draft["placement_seen"].append(ident)
        note = "No available position; place manually or change the design."
        chosen = None
        parent_id = None
        if len(draft["positions"]) >= limit:
            note = "Drawing capacity reached; plant retained in counts and costs."
        elif group_for(draft, species) == "tree":
            pocket = draft["pocket"]
            if species == draft["bundle"]["defaults"]["pocket_species"] and ident.endswith(":0") and pocket["enabled"]:
                if clear(pocket["x"], pocket["y"]): chosen = (pocket["x"], pocket["y"])
                note = "Conditional moisture-pocket example; pocket position is a project assumption."
            else:
                chosen = next((p for p in grid if clear(*p)), None)
                note = "Illustrative tree position from the registered zone/MR layout template."
        elif category == "within_crowns":
            parents = trees()
            counts = {p: sum(link["parent_id"] == p for link in draft["associations"].values()) for p in parents}
            parents.sort(key=lambda p: (counts[p], p))
            rng = random_for(ident)
            for parent in parents:
                x, y, radius = circle(parent)
                if radius <= clearance: continue
                for _ in range(policy["attempts_per_parent"]):
                    # Uniform area over the annulus outside the trunk clearance.
                    distance = math.sqrt(clearance**2 + rng.random()*(radius**2-clearance**2))
                    angle = rng.random()*math.tau
                    candidate = (x+math.cos(angle)*distance, y+math.sin(angle)*distance)
                    if clear(*candidate):
                        chosen, parent_id = candidate, parent
                        break
                if chosen is not None: break
            note = ("Placed within " + plant_name(draft, parent_id) + "’s indicative crown using the woodland-companion assumption.") if parent_id is not None else "Unplaced: no planned tree crown with available space beyond the trunk clearance."
        else:
            rng = random_for(ident)
            crowns = [circle(p) for p in trees()]
            for _ in range(policy["attempts_open"]):
                x, y = rng.random()*width, rng.random()*height
                if category == "open_ground" and any(math.hypot(x-cx, y-cy) <= radius for cx, cy, radius in crowns): continue
                if clear(x, y):
                    chosen = (x, y)
                    break
            note = ("Placed in open ground outside current planned-tree crowns." if category == "open_ground" else "Independent illustrative position within the planting zone.") if chosen is not None else "Unplaced: no space found within the zone and automatic placement preference."
        draft["placement_notes"][ident] = note
        if chosen is None:
            if ident not in draft["unplaced"]: draft["unplaced"].append(ident)
        else:
            draft["positions"][ident] = {"x": chosen[0], "y": chosen[1], "manual": False}
            if parent_id is not None:
                pos = draft["positions"][parent_id]
                draft["associations"][ident] = {"parent_id": parent_id, "dx": chosen[0]-pos["x"], "dy": chosen[1]-pos["y"]}


def placement_output(draft, result):
    policy = draft["bundle"]["defaults"]["placement"]
    warnings = []
    positions = draft["positions"]
    ids = sorted(positions)
    for i, ident in enumerate(ids):
        p = positions[ident]
        for other in ids[i+1:]:
            q = positions[other]
            if math.hypot(p["x"]-q["x"], p["y"]-q["y"]) < policy["minimum_clearance"]-1e-9:
                warnings.append(f'{plant_name(draft, ident)} and {plant_name(draft, other)} are closer than {policy["minimum_clearance"]} m. Positions retained; adjust manually.')
        if any(math.hypot(p["x"]-q["x"], p["y"]-q["y"]) < policy["minimum_clearance"]-1e-9 for q in draft["existing"]):
            warnings.append(f'{plant_name(draft, ident)} is closer than {policy["minimum_clearance"]} m to existing vegetation.')
        species = ident.rsplit(":", 1)[0]
        if ident in draft["associations"]:
            link = draft["associations"][ident]
            radius = overlay_for(draft, link["parent_id"].rsplit(":", 1)[0], "crown")["diameter_m"][0]/2
            if math.hypot(link["dx"], link["dy"]) > radius:
                warnings.append(f'{plant_name(draft, ident)} is outside its associated tree’s edited crown; position and association retained.')
        elif group_for(draft, species) != "tree":
            inside = any(math.hypot(p["x"]-q["x"], p["y"]-q["y"]) <= overlay_for(draft, key.rsplit(":", 1)[0], "crown")["diameter_m"][0]/2 for key, q in positions.items() if group_for(draft, key.rsplit(":", 1)[0]) == "tree")
            category = placement_category(draft, species)
            if (category == "open_ground" and inside) or (category == "within_crowns" and not inside):
                warnings.append(f'{plant_name(draft, ident)} is outside its automatic placement preference; manual position retained.')
    for ident in draft["unplaced"]:
        if ident in draft["associations"]:
            warnings.append(f'{plant_name(draft, ident)} is unplaced after tree movement or resizing; its tree offset is retained.')
    for inst in result["instances"]:
        inst["parent_id"] = draft["associations"][inst["id"]]["parent_id"] if inst["id"] in draft["associations"] else None
        inst["placement_explanation"] = draft["placement_notes"][inst["id"]]
    return {"categories": {r["id"]: placement_category(draft, r["id"]) for r in result["species"]},
            "associations": deepcopy(draft["associations"]), "warnings": warnings,
            "unplaced": [{"id": ident, "reason": "Moved outside the zone with its associated tree; offset retained for recovery." if ident in draft["associations"] else "Outside the zone; previous coordinates retained for manual recovery." if ident in draft["displaced"] else draft["placement_notes"][ident], "position": deepcopy(draft["displaced"][ident]) if ident in draft["displaced"] else None} for ident in draft["unplaced"]],
            "minimum_clearance": policy["minimum_clearance"]}



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
    elif kind == "placement":
        keys(command, {"kind", "id", "category"}, "placement category")
        require(command["id"] in draft["preferences"] and command["category"] in draft["bundle"]["defaults"]["placement"]["categories"], "Select a plant and a valid placement category.")
        require(group_for(draft, command["id"]) != "tree", "Placement preferences apply to shrubs and grasses. Planned trees use the registered tree layout.")
        draft["placement_preferences"][command["id"]] = command["category"]
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


@catalogue_context
@checked
def evaluate(original, project, command=None):
    validate_draft(original, project)
    if original["version"] < 3:
        if command is None: return previous.evaluate(original, project)
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
    reconcile_positions(draft, original, command, valid_keys)
    place_new(draft, valid_keys)
    base = base_draft(draft)
    positive_ids = {r["id"] for r in rows}
    base["manual_ids"] = [r["id"] for r in rows]
    base["exclusions"] = sorted({p["id"] for p in planting.catalogue()["plants"]} - positive_ids)
    base["radii"] = {k: v for k, v in draft["radii"].items() if k in positive_ids}
    # Historical evaluator supplies the existing integer-price calculation and
    # conceptual MR overlays only. All new placement decisions are owned here.
    base["unplaced"] = sorted(valid_keys - set(draft["positions"]))
    for pos in base["positions"].values(): pos["manual"] = True
    result = legacy.evaluate(base, project)
    result["instances"] = [{"id": key, "species": key.rsplit(":", 1)[0],
        "radius": draft["radii"][key.rsplit(":", 1)[0]] if key.rsplit(":", 1)[0] in draft["radii"] else draft["bundle"]["defaults"]["footprint_radius"],
        **pos} for key, pos in draft["positions"].items()]
    w, h = dimensions(draft)
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
    if summary["plants"] > draft["bundle"]["defaults"]["max_instances"]:
        result["issues"].append(f'Drawing capacity is {draft["bundle"]["defaults"]["max_instances"]} instances; excess plants remain unplaced and included in counts and costs.')
    if draft["pocket"]["enabled"] and draft["pocket"]["x"] is not None:
        p = draft["pocket"]
        if p["x"] - p["radius"] < 0 or p["x"] + p["radius"] > w or p["y"] - p["radius"] < 0 or p["y"] + p["radius"] > h: result["issues"].append("The assumed moisture pocket extends outside the planting zone.")
    if any(not (0 <= p["x"] <= w and 0 <= p["y"] <= h) for p in draft["existing"]): result["issues"].append("Existing vegetation outside the resized zone remains recorded; edit its coordinates if required.")
    result["placement"] = placement_output(draft, result)
    result["issues"].extend(result["placement"]["warnings"])
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


