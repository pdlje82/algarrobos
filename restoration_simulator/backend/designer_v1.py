"""Document-backed planning only. Handler IDs and geometric inputs live in design_rules.

No ecological outcome, funding decision or water schedule is calculated here.
"""
from copy import deepcopy
import hashlib
import json
import math
from decimal import Decimal
from functools import wraps
from pathlib import Path

from .engine import Invalid, require, number, list_actions
from .configuration import read_json, keys
from . import planting, plant_prices, demonstrator

DIRECTORY = Path(__file__).resolve().parents[1] / "design_rules"
LIBRARY = DIRECTORY.parents[1] / "doc_library"
PHYSICAL = {"parcel_id", "restoration_area", "vegetation_system", "objective", "water_plan", "planting_method", "plant_selection"}
EFFECTS = {"group_layout", "island_layout", "include_species", "treatment", "advisory", "geometry"}
EVIDENCE = {"guidance", "observation", "assumption", "unresolved"}


def checked(function):
    @wraps(function)
    def call(*args,**kwargs):
        try:return function(*args,**kwargs)
        except Invalid:raise
        except (KeyError,TypeError,ValueError,OverflowError,RecursionError) as exc:
            raise Invalid(f"Malformed designer data in {function.__name__}: {exc}. Check the draft/rule contract; no substitute was used.") from exc
    return call


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False, allow_nan=False).encode()).hexdigest()


def references(refs, sources):
    require(isinstance(refs, list) and len(refs) > 0, "Rule has no source references.")
    for ref in refs:
        keys(ref, {"id", "pages"}, "source reference")
        require(ref["id"] in sources, "Unknown designer source: " + str(ref["id"]))
        require(isinstance(ref["pages"], list) and ref["pages"] and all(type(n) is int and 1 <= n <= sources[ref["id"]]["pages"] for n in ref["pages"]), "Invalid designer source pages.")


@checked
def validate_bundle(bundle):
    keys(bundle, {"manifest", "defaults", "sources", "rules", "vegetation_combinations", "treatments"}, "designer bundle")
    m = bundle["manifest"]
    keys(m, {"version", "ruleset_id", "files", "engine"}, "designer manifest")
    require(type(m["version"]) is int and m["version"] == 1 and m["engine"] == "designer-v1", "Unsupported designer rules engine/version.")
    require(isinstance(m["ruleset_id"], str) and m["ruleset_id"], "Missing ruleset ID.")
    require(set(m["files"]) == {"defaults.json", "sources.json", "rules.json", "vegetation_combinations.json", "treatments.json"}, "Unsupported rule-bundle files.")
    defaults = bundle["defaults"]
    keys(defaults, {"area", "aspect", "boundary_side", "boundary_type", "boundary_custom", "starter_quantity", "footprint_radius", "pocket_radius", "pocket_position", "mulch_radius", "collar_gap", "max_instances", "max_candidates", "placement_step", "placement_margin", "mr1_centres", "mr2_centres", "baseline_layout", "pocket_species", "mulch_type", "boundary_types", "boundary_sides"} | ({"rainfall_capture"} if "rainfall_capture" in defaults else set()) | ({"new_tree_price","new_shrub_price"} & set(defaults)), "designer defaults")
    # Earlier v1 snapshots retain these declared legacy metadata fields;
    # pricing always comes from explicit plant entries/current price JSON.
    for legacy_price in {"new_tree_price","new_shrub_price"} & set(defaults):
        require(number(defaults[legacy_price],0,1000000), "Invalid historical price metadata.")
    if "rainfall_capture" in defaults:
        capture=defaults["rainfall_capture"]
        keys(capture,{"donor","flow_start","island_width","island_depth","overflow","donor_label","overflow_label"},"rainfall capture assumptions")
        for key in ("donor","overflow","donor_label","overflow_label"):
            require(isinstance(capture[key],list) and len(capture[key])==(4 if key in {"donor","overflow"} else 2) and all(number(v,0,1) for v in capture[key]), "Invalid normalized rainfall capture geometry.")
        require(number(capture["flow_start"],0,1) and number(capture["island_width"],0.01,100) and number(capture["island_depth"],0.01,100), "Invalid rainfall capture geometry.")
    for key in ("area", "aspect", "starter_quantity", "footprint_radius", "pocket_radius", "mulch_radius", "max_instances", "max_candidates", "placement_step", "placement_margin"):
        require(number(defaults[key], 0.001, 1000000), "Invalid designer default: " + key)
    require(all(type(defaults[k]) is int for k in ("max_instances","max_candidates","starter_quantity")), "Designer count limits must be integers.")
    require(set(defaults["boundary_sides"])=={"bottom","top","left","right"} and defaults["boundary_side"] in defaults["boundary_sides"], "Unsupported reference boundary side.")
    require(defaults["boundary_type"] in defaults["boundary_types"] and number(defaults["collar_gap"],0,defaults["mulch_radius"]), "Invalid boundary or collar-gap default.")
    require(defaults["baseline_layout"] == "grid", "Unsupported baseline layout.")
    for key in ("pocket_position",):
        require(isinstance(defaults[key], list) and len(defaults[key]) == 2 and all(number(v, 0, 1) for v in defaults[key]), "Invalid normalized pocket position.")
    for key in ("mr1_centres", "mr2_centres"):
        require(isinstance(defaults[key], list) and defaults[key] and all(isinstance(row,list) and len(row)==2 and all(number(v,0,1) for v in row) for row in defaults[key]), "Invalid layout centres.")
    species = {p["id"] for p in planting.catalogue()["plants"]}
    require(defaults["pocket_species"] in species, "Unknown pocket example species.")
    require(isinstance(bundle["sources"], dict) and bundle["sources"], "Missing source register.")
    for ident, source in bundle["sources"].items():
        keys(source, {"filename", "sha256", "title", "pages"}, "designer source")
        require(Path(source["filename"]).name == source["filename"] and source["filename"] not in {".",".."}, "Unsafe or mismatched source filename.")
        require(type(source["pages"]) is int and source["pages"] > 0 and len(source["sha256"]) == 64, "Invalid source metadata.")
    require(isinstance(bundle["rules"], list) and bundle["rules"], "Missing rules.")
    ids = set()
    for rule in bundle["rules"]:
        keys(rule, {"id", "title", "effect", "condition", "description", "evidence", "sources", "limitations"}, "designer rule")
        require(rule["id"] not in ids and rule["effect"] in EFFECTS and rule["evidence"] in EVIDENCE and rule["condition"] in {"always","approach","feature"}, "Duplicate or unsupported designer rule.")
        require(all(isinstance(rule[k],str) and rule[k] for k in ("id","title","description","limitations")), "Empty designer rule wording.")
        ids.add(rule["id"])
        references(rule["sources"], bundle["sources"])
    handlers={"mr1":"group_layout","mr2":"island_layout","pocket":"include_species","stone_mulch":"treatment","layout":"geometry","density":"advisory","autumn":"advisory","survival":"advisory","care":"advisory"}
    for rule in bundle["rules"]:
        if rule["id"] in handlers: require(rule["effect"]==handlers[rule["id"]], "Registered rule effect changed; implement and version its handler explicitly.")
    require({"mr1", "mr2", "pocket", "stone_mulch", "layout", "density", "autumn", "survival", "care"} <= ids, "Missing registered designer handlers.")
    combos = set()
    for combo in bundle["vegetation_combinations"]:
        keys(combo, {"id", "title", "rule", "starter", "optional", "description", "sources"}, "vegetation combination")
        require(combo["id"] not in combos and combo["rule"] in ids, "Invalid combination ID/rule.")
        members = combo["starter"] + combo["optional"]
        require(combo["starter"] and len(members) == len(set(members)) and set(members) <= species, "Invalid combination members.")
        references(combo["sources"], bundle["sources"])
        combos.add(combo["id"])
    types = set()
    for treatment in bundle["treatments"]:
        keys(treatment, {"id","label","rule","pattern","description"}, "mulch type")
        require(treatment["id"] not in types and treatment["rule"] in ids and treatment["pattern"] in {"stones","organic"}, "Unsupported mulch type/rule/pattern.")
        types.add(treatment["id"])
    require(defaults["mulch_type"] in types, "Unknown default mulch type.")
    return bundle


@checked
def load_bundle():
    manifest = read_json(DIRECTORY / "manifest.json")
    require(manifest["files"] == ["defaults.json", "sources.json", "rules.json", "vegetation_combinations.json", "treatments.json"], "Unsupported designer bundle file manifest.")
    return validate_bundle({"manifest": manifest, **{Path(f).stem: read_json(DIRECTORY / f) for f in manifest["files"]}})


def source_file(bundle, ident):
    require(ident in bundle["sources"], "Unknown designer source.")
    ref = bundle["sources"][ident]
    path = LIBRARY / ref["filename"]
    require(path.is_file(), "Designer source unavailable: " + ref["filename"])
    require(hashlib.sha256(path.read_bytes()).hexdigest() == ref["sha256"], "Designer source changed; review and register its new checksum.")
    return path


def plan_fields(project):
    return demonstrator.fields(project, "demo_plan")


def new_draft(project):
    b = load_bundle(); d = b["defaults"]
    values = {f["name"]: deepcopy(f["default"]) for f in plan_fields(project)}
    physical = {k:values[k] for k in PHYSICAL if k != "plant_selection"}
    physical["parcel_id"] = None
    physical["restoration_area"] = d["area"]
    return {"version":1, "bundle":b, "physical":physical,
        "zone":{"aspect":d["aspect"],"boundary_side":d["boundary_side"],"boundary_type":d["boundary_type"],"boundary_custom":d["boundary_custom"]},
        "site":{"rainfall":None,"soil":"unknown","notes":""},
        "approaches":[],"combinations":[],"optional_members":[],"manual_ids":[],"exclusions":[],
        "selection":{"version":2,"entries":[]},"positions":{},"radii":{},"overrides":[],
        "pocket":{"enabled":False,"x":None,"y":None,"radius":d["pocket_radius"]},
        "mulch":{"enabled":False,"type":d["mulch_type"],"radius":d["mulch_radius"],"plant_ids":[]},"existing":[],"unplaced":[]}


def dimensions(draft):
    a = draft["physical"]["restoration_area"]; aspect = draft["zone"]["aspect"]
    require(number(a,0.01,1000000) and number(aspect,0.05,20), "Enter a positive area and proportions from 0.05 to 20.")
    return math.sqrt(a*aspect), math.sqrt(a/aspect)


@checked
def validate_draft(draft, project=None):
    keys(draft, {"version","bundle","physical","zone","site","approaches","combinations","optional_members","manual_ids","exclusions","selection","positions","radii","overrides","pocket","mulch","existing","unplaced"}, "designer draft")
    require(draft["version"] == 1, "Unsupported designer draft version.")
    validate_bundle(draft["bundle"])
    keys(draft["physical"], PHYSICAL - {"plant_selection"}, "physical planting settings")
    keys(draft["zone"], {"aspect","boundary_side","boundary_type","boundary_custom"}, "zone")
    d = draft["bundle"]["defaults"]
    require(draft["zone"]["boundary_side"] in d["boundary_sides"] and draft["zone"]["boundary_type"] in d["boundary_types"], "Unknown reference boundary.")
    require(isinstance(draft["zone"]["boundary_custom"],str), "Invalid boundary description.")
    width, height = dimensions(draft)
    keys(draft["site"], {"rainfall","soil","notes"}, "assumed site context")
    require(draft["site"]["rainfall"] is None or number(draft["site"]["rainfall"],0,10000), "Invalid assumed annual rainfall.")
    require(all(isinstance(draft["site"][k],str) for k in ("soil","notes")), "Invalid site context.")
    species = {p["id"] for p in planting.catalogue()["plants"]}
    combo_ids = {c["id"] for c in draft["bundle"]["vegetation_combinations"]}
    for key, allowed in (("approaches",{"mr1","mr2"}),("combinations",combo_ids),("optional_members",species),("manual_ids",species | {e["id"] for e in draft["selection"]["entries"]}),("exclusions",species | {e["id"] for e in draft["selection"]["entries"]})):
        require(isinstance(draft[key],list) and len(draft[key])==len(set(draft[key])) and all(v in allowed or (key in {"manual_ids","exclusions"} and isinstance(v,str) and v.startswith("custom-") and len(v)<=80) for v in draft[key]), "Unknown or duplicate designer " + key)
    keys(draft["selection"], {"version","entries"}, "designer selection")
    require(draft["selection"]["version"] == 2 and isinstance(draft["selection"]["entries"],list), "Invalid designer selection version/entries.")
    if draft["selection"]["entries"]: planting.resolve(draft["selection"])
    allowed_positions={f"{row['id']}:{i}" for row in draft["selection"]["entries"] for i in range(min(row["quantity"],d["max_instances"]))}
    require(set(draft["positions"]) <= allowed_positions and isinstance(draft["unplaced"],list) and set(draft["unplaced"]) <= allowed_positions, "Unknown plant position or unplaced reference.")
    require(isinstance(draft["positions"],dict) and isinstance(draft["radii"],dict) and isinstance(draft["overrides"],list), "Invalid layout overrides.")
    for key, pos in draft["positions"].items():
        keys(pos,{"x","y","manual"}, "plant position")
        require(number(pos["x"],0,width) and number(pos["y"],0,height) and type(pos["manual"]) is bool, "Plant position outside assumed zone; resize or reposition explicitly.")
    for radius in draft["radii"].values(): require(number(radius,0.01,100), "Invalid assumed planning radius.")
    keys(draft["pocket"],{"enabled","x","y","radius"},"moisture pocket")
    keys(draft["mulch"],{"enabled","type","radius","plant_ids"},"mulch treatment")
    for feature in (draft["pocket"],draft["mulch"]):
        require(type(feature["enabled"]) is bool and number(feature["radius"],0.01,100), "Invalid feature dimensions.")
    require(draft["mulch"]["type"] in {t["id"] for t in draft["bundle"]["treatments"]}, "Unknown mulch type.")
    require(isinstance(draft["mulch"]["plant_ids"],list) and len(draft["mulch"]["plant_ids"])==len(set(draft["mulch"]["plant_ids"])) and set(draft["mulch"]["plant_ids"])<=species, "Invalid mulch plant selection.")
    require(draft["mulch"]["radius"]>d["collar_gap"], "Mulch radius must exceed the configured collar gap.")
    for coord, limit in (("x",width),("y",height)):
        require(draft["pocket"][coord] is None or number(draft["pocket"][coord],0,limit), "Pocket centre outside assumed zone.")
    require(isinstance(draft["existing"],list), "Invalid existing vegetation.")
    for plant in draft["existing"]:
        keys(plant,{"id","species","x","y","radius"},"existing vegetation")
        require(plant["species"] in species and number(plant["x"],0,width) and number(plant["y"],0,height) and number(plant["radius"],0.01,100), "Invalid existing vegetation position/species.")
    if project is not None:
        from .engine import validate_fields
        defs=[f for f in plan_fields(project) if f["name"] in PHYSICAL-{ "plant_selection", "parcel_id" }]
        validate_fields(defs,{f["name"]:draft["physical"][f["name"]] for f in defs})
    if project is not None and draft["physical"]["parcel_id"] is not None:
        require(draft["physical"]["parcel_id"] in {p["id"] for p in project["parcels"]}, "The design references a missing parcel.")
    return draft


@checked
def evaluate(original, project, command=None):
    draft = deepcopy(validate_draft(original, project))
    before = {e["id"]:e for e in draft["selection"]["entries"]}
    if command is not None:
        require(isinstance(command,dict) and "kind" in command, "Missing designer command.")
        kind = command["kind"]
        if kind == "toggle":
            keys(command,{"kind","collection","id","enabled"},"toggle command")
            require(command["collection"] in {"approaches","combinations","optional_members","manual_ids"} and type(command["enabled"]) is bool, "Invalid toggle.")
            values = draft[command["collection"]]
            if command["enabled"] and command["id"] not in values: values.append(command["id"])
            if not command["enabled"]: values[:] = [v for v in values if v != command["id"]]
        elif kind == "selection":
            keys(command,{"kind","selection"},"selection command")
            keys(command["selection"], {"version","entries"}, "selection command value")
            require(command["selection"]["version"] == 2 and isinstance(command["selection"]["entries"],list), "Invalid selection command.")
            if command["selection"]["entries"]: planting.resolve(command["selection"])
            after = {e["id"]:e for e in command["selection"]["entries"]}
            for ident in after.keys() - before.keys():
                if ident not in draft["manual_ids"]: draft["manual_ids"].append(ident)
                draft["exclusions"] = [v for v in draft["exclusions"] if v != ident]
            for ident in before.keys() - after.keys():
                if ident not in draft["exclusions"]: draft["exclusions"].append(ident)
                draft["manual_ids"] = [v for v in draft["manual_ids"] if v != ident]
            draft["selection"] = deepcopy(command["selection"])
        elif kind == "patch":
            keys(command,{"kind","section","values"},"designer patch")
            require(command["section"] in {"physical","zone","site","pocket","mulch"} and isinstance(command["values"],dict), "Unknown designer settings section.")
            require(set(command["values"]) <= set(draft[command["section"]]), "Unknown designer setting.")
            draft[command["section"]].update(deepcopy(command["values"]))
        elif kind == "position":
            keys(command,{"kind","id","x","y"},"position command")
            allowed={f"{row['id']}:{i}" for row in draft["selection"]["entries"] for i in range(min(row["quantity"],draft["bundle"]["defaults"]["max_instances"]))}
            require(command["id"] in allowed, "Select a supported plant instance first.")
            draft["unplaced"] = [v for v in draft["unplaced"] if v != command["id"]]
            draft["positions"][command["id"]] = {"x":command["x"],"y":command["y"],"manual":True}
        elif kind == "radius":
            keys(command,{"kind","id","radius"},"radius command")
            require(command["id"] in before, "Unknown plant footprint.")
            draft["radii"][command["id"]] = command["radius"]
        elif kind == "rearrange":
            keys(command,{"kind"},"rearrange command")
            draft["positions"] = {k:v for k,v in draft["positions"].items() if v["manual"]}
        elif kind == "reset_exclusions":
            keys(command,{"kind"},"reset command"); draft["exclusions"] = []
        elif kind == "upgrade_rules":
            keys(command,{"kind"},"rules review"); draft["bundle"] = load_bundle()
        elif kind == "existing":
            keys(command,{"kind","plants"},"existing vegetation command"); draft["existing"] = deepcopy(command["plants"])
        else: raise Invalid("Unsupported designer command: " + str(kind))
        draft["overrides"].append(deepcopy(command))
    b = draft["bundle"]; d = b["defaults"]
    if original["pocket"]["enabled"] and not draft["pocket"]["enabled"] and d["pocket_species"] in draft["manual_ids"]:
        for key,pos in list(draft["positions"].items()):
            if key.startswith(d["pocket_species"]+":") and not pos["manual"]:
                if key not in draft["unplaced"]: draft["unplaced"].append(key)
                del draft["positions"][key]
    width,height = dimensions(draft)
    demand = {}
    def want(ident, reason): demand.setdefault(ident,[]).append(reason)
    active = set(draft["combinations"]) | {v+"_mix" for v in draft["approaches"]}
    for combo in b["vegetation_combinations"]:
        if combo["id"] in active:
            for ident in combo["starter"] + [i for i in combo["optional"] if i in draft["optional_members"]]: want(ident,"combination:"+combo["id"])
    if draft["pocket"]["enabled"]:
        want(d["pocket_species"],"pocket")
        for n,limit,fraction in zip(("x","y"),(width,height),d["pocket_position"]):
            if draft["pocket"][n] is None: draft["pocket"][n] = limit*fraction
    for ident in draft["manual_ids"]: want(ident,"manual")
    demand = {k:v for k,v in demand.items() if k not in draft["exclusions"]}
    current = {e["id"]:e for e in draft["selection"]["entries"]}
    prices = plant_prices.snapshot()["unit_costs"]
    rows = []
    for ident in demand:
        if ident in current: rows.append(current[ident])
        else:
            require(ident in prices, "Missing explicit price default for " + ident)
            rows.append({"id":ident,"quantity":d["starter_quantity"],"unit_cost":prices[ident],"price_confirmed":False})
    draft["selection"] = {"version":2,"entries":rows}
    valid_keys = {f"{row['id']}:{i}" for row in rows for i in range(min(row["quantity"],d["max_instances"]))}
    draft["positions"] = {k:v for k,v in draft["positions"].items() if k in valid_keys}
    draft["radii"] = {k:v for k,v in draft["radii"].items() if k in demand}
    draft["unplaced"] = [k for k in draft["unplaced"] if k in valid_keys]
    instances = []
    centres = d["mr2_centres"] if "mr2" in draft["approaches"] else d["mr1_centres"] if "mr1" in draft["approaches"] else None
    # Generic geometry operation; all layout parameters are registered in defaults.json.
    step=max(d["placement_step"],math.sqrt(width*height/d["max_candidates"]))
    points=[(x*step+d["placement_margin"],y*step+d["placement_margin"]) for y in range(min(math.ceil(height/step),d["max_candidates"])) for x in range(min(math.ceil(width/step),d["max_candidates"]))]
    points=[v for v in points if v[0]<=width-d["placement_margin"] and v[1]<=height-d["placement_margin"]][:d["max_candidates"]]
    side=draft["zone"]["boundary_side"]
    def orient(x,y):
        if side=="bottom":return x,height-y
        if side=="left":return y/height*width,x/width*height
        if side=="right":return width-y/height*width,x/width*height
        return x,y
    points=[orient(*v) for v in points]
    if centres is not None:centres=[(orient(c[0]*width,c[1]*height)[0]/width,orient(c[0]*width,c[1]*height)[1]/height) for c in centres]
    if centres is not None: points.sort(key=lambda v:(min((v[0]-c[0]*width)**2+(v[1]-c[1]*height)**2 for c in centres),v[1],v[0]))
    used = [(v["x"],v["y"]) for v in draft["positions"].values()]
    remaining = [v for v in points if all(math.dist(v,p)>=d["placement_step"] for p in used)]
    total = 0
    for row in rows:
        radius = draft["radii"][row["id"]] if row["id"] in draft["radii"] else d["footprint_radius"]
        for index in range(min(row["quantity"],d["max_instances"]-total)):
            ident = f"{row['id']}:{index}"; total += 1
            if ident in draft["unplaced"]: continue
            if row["id"]==d["pocket_species"] and draft["pocket"]["enabled"] and index==0 and ident in draft["positions"] and not draft["positions"][ident]["manual"]:
                draft["positions"][ident].update(x=draft["pocket"]["x"],y=draft["pocket"]["y"])
            if ident not in draft["positions"]:
                if row["id"] == d["pocket_species"] and draft["pocket"]["enabled"] and index == 0:
                    draft["positions"][ident] = {"x":draft["pocket"]["x"],"y":draft["pocket"]["y"],"manual":False}
                elif remaining:
                    x,y = remaining.pop(0); draft["positions"][ident] = {"x":x,"y":y,"manual":False}
            if ident in draft["positions"]:
                instances.append({"id":ident,"species":row["id"],"radius":radius,**draft["positions"][ident],"reasons":demand[row["id"]]})
    validate_draft(draft,project)
    resolved = planting.resolve(draft["selection"]) if rows else {"entries":[]}
    count = sum(row["quantity"] for row in rows)
    trees = sum(r["quantity"] for r in resolved["entries"] if r["group"]=="tree")
    carob = sum(r["quantity"] for r in rows if r["id"]=="carob")
    issues = []
    if draft["physical"]["parcel_id"] is None: issues.append("Link a parcel before applying this design.")
    if count > len(instances): issues.append(f"{count-len(instances)} plants are unplaced; all remain included in quantities and costs.")
    if draft["pocket"]["enabled"]: issues.append("The moisture pocket and its encina are assumptions; available soil water and suitability remain unresolved.")
    if count == 0: issues.append("Choose at least one plant before applying.")
    if any(not r["price_confirmed"] for r in rows): issues.append("Some plant prices are illustrative or unconfirmed.")
    for inst in instances:
        if inst["x"]-inst["radius"] < 0 or inst["y"]-inst["radius"] < 0 or inst["x"]+inst["radius"]>width or inst["y"]+inst["radius"]>height:
            issues.append("A planning footprint extends beyond the zone; its radius or position needs review."); break
    capture=None
    if "mr2" in draft["approaches"]:
        if "rainfall_capture" not in d:
            issues.append("This saved bundle has no registered rainfall-capture drawing geometry. Review updated rules to enable that overlay; no dimensions were inferred.")
        else:
            c=d["rainfall_capture"]
            capture={"donor":[c["donor"][0]*width,c["donor"][1]*height,c["donor"][2]*width,c["donor"][3]*height],
                "islands":[{"x":x*width,"y":y*height,"width":c["island_width"],"depth":c["island_depth"],"flow_start":c["flow_start"]*height} for x,y in d["mr2_centres"]],
                "overflow":[c["overflow"][0]*width,c["overflow"][1]*height,c["overflow"][2]*width,c["overflow"][3]*height],
                "donor_label":[c["donor_label"][0]*width,c["donor_label"][1]*height],"overflow_label":[c["overflow_label"][0]*width,c["overflow_label"][1]*height],"rule":"mr2"}
    rules = [r for r in b["rules"] if r["condition"]=="always" or r["id"] in draft["approaches"] or (r["id"]=="pocket" and draft["pocket"]["enabled"]) or (draft["mulch"]["enabled"] and any(t["id"]==draft["mulch"]["type"] and t["rule"]==r["id"] for t in b["treatments"]))]
    trace = [{"species":ident,"reasons":reasons,"rules":[r["id"] for r in rules if r["condition"]=="always" or r["id"] in reasons or any(c["rule"]==r["id"] and "combination:"+c["id"] in reasons for c in b["vegetation_combinations"])]} for ident,reasons in demand.items()]
    return {"draft":draft,"features":{"catchment":capture},"width":width,"height":height,"instances":instances,"reasons":trace,"rules":rules,"issues":issues,
        "removed":[{"id":ident,"reason":"No remaining generating source or manual retention."} for ident in before.keys()-demand.keys()]+[{"id":key,"reason":"This plotted instance exceeds the new quantity."} for key in original["positions"] if key not in valid_keys and key.rsplit(":",1)[0] in demand],
        "summary":{"plants":count,"trees":trees,"shrubs":count-trees,"placed":len(instances),"unplaced":count-len(instances),"tree_density":trees*10000/draft["physical"]["restoration_area"],"carob_density":carob*10000/draft["physical"]["restoration_area"],"plant_cost":float(sum((Decimal(str(r["line_total"])) for r in resolved["entries"]),Decimal(0)))},"ruleset_hash":digest(b)}


def import_plan(project):
    require(project["demonstrator"] is not None and not project["demonstrator"]["legacy"], "No current demonstrator plan to import.")
    draft = new_draft(project); plan = project["demonstrator"]["plan"]
    require("plant_selection" in plan, "This aggregate-only plan has no recorded species. Select plants explicitly in a new draft.")
    selection = planting.priced_selection(plan["plant_selection"],plant_prices.snapshot(),plan)
    for key in draft["physical"]: draft["physical"][key] = deepcopy(plan[key])
    draft["selection"] = deepcopy(selection); draft["manual_ids"] = [e["id"] for e in selection["entries"]]
    draft["overrides"] = [{"kind":"imported_plan","description":"Species and prices imported; all generated coordinates are new assumptions, not historical measurements."}]
    return evaluate(draft,project)


@checked
def apply_inputs(project, draft, administration):
    validate_draft(draft,project)
    definitions = plan_fields(project)
    nonphysical = {f["name"] for f in definitions} - PHYSICAL
    keys(administration, nonphysical, "remaining demonstrator settings")
    values = {**deepcopy(administration),**deepcopy(draft["physical"]),"plant_selection":deepcopy(draft["selection"])}
    require(values["parcel_id"] is not None, "Link a parcel before applying.")
    return values


@checked
def workspace(project, attachment, revision):
    require(project is not None, "Create a project before opening the designer.")
    current = load_bundle()
    draft = new_draft(project) if attachment is None else attachment["draft"]
    result = evaluate(draft,project)
    action = next(a for a in list_actions(project) if a["kind"]=="demo_plan")
    return {"design_revision":revision,"project_revision":project["revision"],"saved":attachment is not None,
        "evaluation":result,"catalogue":planting.catalogue(),"price_defaults":plant_prices.snapshot(),
        "fields":plan_fields(project),"available":action["available"],"reason":action["reason"],
        "rules_update_available":digest(current)!=digest(draft["bundle"]),"can_import":project["demonstrator"] is not None and not project["demonstrator"]["legacy"]}


@checked
def validate_attachment(value, project):
    if value is None: return None  # Explicitly no saved designer draft.
    keys(value,{"draft","applied"},"designer attachment")
    validate_draft(value["draft"],project)
    require(isinstance(value["applied"],list), "Invalid applied design snapshots.")
    for snapshot in value["applied"]:
        keys(snapshot,{"draft","plan","ruleset_hash"},"applied design")
        validate_draft(snapshot["draft"])
        require(digest(snapshot["draft"]["bundle"])==snapshot["ruleset_hash"], "Applied rules snapshot checksum mismatch.")
        require(isinstance(snapshot["plan"],dict), "Invalid applied planting plan.")
        require(all(snapshot["plan"][k]==v for k,v in snapshot["draft"]["physical"].items()), "Applied plan and designer physical settings disagree.")
        require(snapshot["plan"]["plant_selection"]==snapshot["draft"]["selection"], "Applied plan and designer plant selection disagree.")
    return value


def after_parcel_deletion(attachment, before, after, deleted):
    if attachment is None: return None
    if attachment["draft"]["physical"]["parcel_id"] == deleted: return None
    from .parcel_removal import rebuild
    removed = {p["id"] for p in before["parcels"] if p["id"] == deleted or p.get("scenario_status")}
    _, _, missing, maps = rebuild(before,list(removed),with_mapping=True)
    mapping = maps["parcel_id"]
    removed = {p["id"] for p in missing}
    result = deepcopy(attachment)
    if result["draft"]["physical"]["parcel_id"] in removed: return None
    result["applied"] = [v for v in result["applied"] if v["plan"]["parcel_id"] not in removed]
    for draft in [result["draft"]]+[v["draft"] for v in result["applied"]]:
        old = draft["physical"]["parcel_id"]
        if old is not None:
            require(old in mapping, "A dependent designer snapshot must be explicitly removed.")
            draft["physical"]["parcel_id"] = mapping[old]
    for snapshot in result["applied"]: snapshot["plan"]["parcel_id"] = mapping[snapshot["plan"]["parcel_id"]]
    return result


if __name__ == "__main__":
    bundle = load_bundle()
    for ident in bundle["sources"]: source_file(bundle,ident)
    print("Validated",bundle["manifest"]["ruleset_id"],digest(bundle))
