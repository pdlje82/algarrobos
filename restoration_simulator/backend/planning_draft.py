"""Editable demonstrator preparation, deliberately outside simulation history."""
from copy import deepcopy
from math import isfinite
from .engine import require
from .configuration import keys
from . import designer, planting, demonstrator


def initial(project):
    return {"version": 1, "inputs": {f["name"]: deepcopy(f["default"]) for f in designer.plan_fields(project)}, "source": None}


def validate(value, project):
    if value is None:
        return None  # No planning draft has been saved yet.
    keys(value, {"version", "inputs", "source"}, "demonstrator planning draft")
    require(type(value["version"]) is int and value["version"] == 1, "Unsupported demonstrator planning draft version.")
    fields = designer.plan_fields(project)
    keys(value["inputs"], {f["name"] for f in fields}, "demonstrator draft inputs")
    for field in fields:
        name, entry = field["name"], value["inputs"][field["name"]]
        if name == "plant_selection":
            keys(entry, {"version", "entries"}, "draft planting list")
            require(type(entry["version"]) is int and entry["version"] == 2 and isinstance(entry["entries"], list), "Draft requires an explicit priced planting list.")
            if entry["entries"]:
                planting.resolve(entry)
        else:
            require(entry is None or type(entry) in (str, bool, int, float), f"Invalid draft field {name}.")
            if type(entry) in (int, float):
                require(isfinite(entry), f"Draft field {name} must be finite.")
            if isinstance(entry, str):
                require(len(entry) <= 10000, f"Draft field {name} is too long.")
    source = value["source"]
    if source is not None:
        keys(source, {"draft", "ruleset_hash", "origin"}, "planning design source")
        designer.validate_draft(source["draft"])
        from .designer_library import identity, normalized_name
        keys(source["origin"], {"id", "name"}, "planning design origin")
        identity(source["origin"]["id"])
        require(normalized_name(source["origin"]["name"]) == source["origin"]["name"], "Invalid planning design name.")
        require(designer.digest(source["draft"]["bundle"]) == source["ruleset_hash"], "Planning rules snapshot checksum mismatch.")
        require(all(value["inputs"][k] == v for k, v in source["draft"]["physical"].items()) and value["inputs"]["plant_selection"] == source["draft"]["selection"], "Planning draft and its physical design disagree.")
    return value


def edit(value, project, administration):
    result = initial(project) if value is None else deepcopy(validate(value, project))
    keys(administration, set(result["inputs"]) - designer.PHYSICAL, "demonstrator planning fields")
    result["inputs"].update(deepcopy(administration))
    return validate(result, project)


def handoff(value, project, library):
    require(library is not None and library["active_id"] is not None, "Save the site design under a name first.")
    from .designer_library import find
    record = find(library, library["active_id"])
    draft = record["draft"]
    designer.validate_draft(draft, project)
    require(sum(p["quantity"] for p in draft["selection"]["entries"]) > 0, "Select at least one plant before transferring the design.")
    require(draft["physical"]["parcel_id"] is not None and any(p["id"] == draft["physical"]["parcel_id"] for p in project["parcels"]), "Link an existing parcel before using the design in planning.")
    result = initial(project) if value is None else deepcopy(validate(value, project))
    result["inputs"].update(deepcopy(draft["physical"]))
    result["inputs"]["plant_selection"] = deepcopy(draft["selection"])
    result["source"] = {"draft": deepcopy(draft), "ruleset_hash": designer.digest(draft["bundle"]), "origin": {"id": record["id"], "name": record["name"]}}
    return validate(result, project)


def workspace(project, value, revision):
    require(project is not None, "Create a project before opening demonstrator planning.")
    draft = initial(project) if value is None else deepcopy(validate(value, project))
    installed = project["demonstrator"]
    committed = installed is not None and not installed["legacy"] and all(k in installed["plan"] and installed["plan"][k] == v for k, v in draft["inputs"].items())
    selection = draft["inputs"]["plant_selection"]
    has_recorded_plants = installed is not None and not installed["legacy"] and "plant_selection" in installed["plan"]
    order = planting.resolve(selection) if selection["entries"] and (draft["source"] is not None or has_recorded_plants) else None
    status = demonstrator.availability(project, "demo_plan")
    return {"project_revision": project["revision"], "planning_revision": revision, "draft": draft, "saved": value is not None,
            "committed": committed, "planting": order, "available": status[0] == "available", "reason": status[1]}


def after_parcel_deletion(value, before, after, deleted):
    if value is None:
        return None
    from .parcel_removal import rebuild
    removed = {p["id"] for p in before["parcels"] if p["id"] == deleted or p.get("scenario_status")}
    _, _, missing, maps = rebuild(before, list(removed), with_mapping=True)
    if value["inputs"]["parcel_id"] in {p["id"] for p in missing}:
        return None
    result = deepcopy(value)
    ident = result["inputs"]["parcel_id"]
    if ident in maps["parcel_id"]:
        result["inputs"]["parcel_id"] = maps["parcel_id"][ident]
        if result["source"] is not None:
            result["source"]["draft"]["physical"]["parcel_id"] = maps["parcel_id"][ident]
    return validate(result, after)
