"""Project-local named design snapshots, separate from simulation and applied plans."""
from copy import deepcopy
from pathlib import Path
from uuid import UUID, uuid4, uuid5, NAMESPACE_URL

from .configuration import read_json, keys
from .engine import require, same_json
from .designer_v1 import checked

DEFAULTS_PATH = Path(__file__).resolve().parents[1] / "scenarios" / "designer-library-defaults.json"


@checked
def defaults():
    data = read_json(DEFAULTS_PATH)
    keys(data, {"version", "name_limit", "migrated_name", "name_prefix", "unnamed_label", "unlinked_label"}, "designer library defaults")
    require(type(data["version"]) is int and data["version"] == 1 and type(data["name_limit"]) is int and data["name_limit"] == 80, "Unsupported designer library name contract.")
    require(all(isinstance(data[k], str) and data[k].strip() == data[k] and data[k] for k in ("migrated_name", "name_prefix", "unnamed_label", "unlinked_label")), "Invalid library naming defaults.")
    return data


def normalized_name(value):
    limit = defaults()["name_limit"]
    require(isinstance(value, str), "Enter a design name.")
    result = value.strip()
    require(0 < len(result) <= limit, f"Use a design name between 1 and {limit} characters.")
    return result


def fresh(project, applied):
    from .designer import new_draft
    return {"version": 1, "active_id": None, "draft": new_draft(project), "designs": [], "applied": deepcopy(applied)}


def identity(value):
    require(isinstance(value, str), "Design identity must be a UUID.")
    try:
        parsed = UUID(value)
    except (ValueError, AttributeError) as exc:
        raise ValueError("Invalid design identity; use the ID returned by the library.") from exc
    require(str(parsed) == value, "Design identities must use canonical UUID strings.")


@checked
def migrate_v5(value, project):
    if value is None:
        return None
    from .designer import validate_legacy_attachment
    validate_legacy_attachment(value, project)
    ident = str(uuid5(NAMESPACE_URL, "algarroba:legacy-design:" + project["id"]))
    return {"version": 1, "active_id": ident, "draft": deepcopy(value["draft"]),
            "designs": [{"id": ident, "name": defaults()["migrated_name"], "draft": deepcopy(value["draft"])}],
            "applied": deepcopy(value["applied"])}


@checked
def validate(value, project):
    if value is None:
        return None
    from .designer import validate_draft, validate_legacy_attachment
    keys(value, {"version", "active_id", "draft", "designs", "applied"}, "designer library")
    require(type(value["version"]) is int and value["version"] == 1, "Unsupported designer library version.")
    require(isinstance(value["designs"], list) and isinstance(value["applied"], list), "Invalid designer library collections.")
    validate_draft(value["draft"], project)
    ids, names = set(), set()
    for record in value["designs"]:
        keys(record, {"id", "name", "draft"}, "named design")
        identity(record["id"])
        require(record["id"] not in ids, "Duplicate design identity.")
        name = normalized_name(record["name"])
        require(name == record["name"] and name.casefold() not in names, "Saved design names must be trimmed and unique ignoring case.")
        ids.add(record["id"]); names.add(name.casefold())
        validate_draft(record["draft"], project)
    if value["active_id"] is not None:
        require(value["active_id"] in ids, "Active design is absent from this project's library.")
        record = find(value, value["active_id"])
        require(same_json(record["draft"], value["draft"]), "Active persisted draft disagrees with its named snapshot.")
    # Earlier applied snapshots retain their exact historical shape. New snapshots
    # additionally carry immutable origin metadata, even if the alternative is deleted.
    legacy_applied = []
    for snapshot in value["applied"]:
        allowed = {"draft", "plan", "ruleset_hash"}
        require(set(snapshot) in (allowed, allowed | {"origin"}), "Invalid applied design snapshot.")
        if "origin" in snapshot:
            keys(snapshot["origin"], {"id", "name"}, "applied design origin")
            identity(snapshot["origin"]["id"])
            require(normalized_name(snapshot["origin"]["name"]) == snapshot["origin"]["name"], "Invalid applied design name.")
        legacy_applied.append({k: snapshot[k] for k in allowed})
    validate_legacy_attachment({"draft": value["draft"], "applied": legacy_applied}, project)
    return value


def find(value, ident):
    record = next((r for r in value["designs"] if r["id"] == ident), None)
    require(record is not None, "This saved design no longer exists. Reload the library; your working draft is retained.")
    return record


def available_name(value):
    prefix = defaults()["name_prefix"]
    names = set() if value is None else {r["name"].casefold() for r in value["designs"]}
    index = 1
    while f"{prefix} {index}".casefold() in names:
        index += 1
    return f"{prefix} {index}"


def check_name(value, name, except_id=None):
    name = normalized_name(name)
    require(not any(r["id"] != except_id and r["name"].casefold() == name.casefold() for r in value["designs"]), "A design with this name already exists. Choose another name.")
    return name


def summaries(value):
    if value is None: return []
    return [{"id": r["id"], "name": r["name"], "area": r["draft"]["physical"]["restoration_area"],
             "plants": sum(p["quantity"] for p in r["draft"]["selection"]["entries"])}
            for r in sorted(value["designs"], key=lambda r: r["name"].casefold())]


@checked
def save(value, project, draft, mode, design_id, name):
    from .designer import evaluate
    require(mode in {"create", "update"}, "Choose an explicit create or update save mode.")
    result = fresh(project, []) if value is None else deepcopy(validate(value, project))
    if mode == "create":
        require(design_id is None, "A new named design must not overwrite an existing ID.")
        clean_name = check_name(result, name)
        record = {"id": str(uuid4()), "name": clean_name, "draft": None}
        result["designs"].append(record)
    else:
        require(name is None and design_id is not None, "An update requires a design ID; use Rename to change its name.")
        require(design_id == result["active_id"], "Only the active saved design can be updated. Load the intended design first.")
        record = find(result, design_id)
    evaluated = evaluate(draft, project)["draft"]
    record["draft"] = deepcopy(evaluated)
    result.update(active_id=record["id"], draft=deepcopy(evaluated))
    return validate(result, project)


@checked
def operate(value, project, operation, design_id, name, confirm):
    result = fresh(project, []) if value is None else deepcopy(validate(value, project))
    require(operation in {"new", "load", "rename", "delete"}, "Unsupported design-library operation.")
    require(type(confirm) is bool, "Invalid design deletion confirmation.")
    if operation == "new":
        require(design_id is None and name is None and not confirm, "New design accepts no saved-design identity or name.")
        result = fresh(project, result["applied"])
        result["designs"] = [] if value is None else deepcopy(value["designs"])
    else:
        record = find(result, design_id)
        if operation == "load":
            require(name is None and not confirm, "Loading accepts only the saved-design identity.")
            result.update(active_id=record["id"], draft=deepcopy(record["draft"]))
        elif operation == "rename":
            require(not confirm, "Unexpected deletion confirmation for Rename.")
            record["name"] = check_name(result, name, record["id"])
        else:
            require(confirm and name is None, "Confirm deletion of the named saved design.")
            result["designs"] = [r for r in result["designs"] if r["id"] != design_id]
            if result["active_id"] == design_id:
                remaining = result["designs"]
                result = fresh(project, result["applied"])
                result["designs"] = remaining
    return validate(result, project)


@checked
def after_parcel_deletion(value, before, after, deleted):
    if value is None: return None
    from .parcel_removal import rebuild
    from .designer import new_draft
    removed = {p["id"] for p in before["parcels"] if p["id"] == deleted or p.get("scenario_status")}
    _, _, missing, maps = rebuild(before, list(removed), with_mapping=True)
    removed = {p["id"] for p in missing}
    mapping = maps["parcel_id"]
    result = deepcopy(value)
    result["designs"] = [r for r in result["designs"] if r["draft"]["physical"]["parcel_id"] not in removed]
    result["applied"] = [s for s in result["applied"] if s["plan"]["parcel_id"] not in removed]
    active_removed = result["draft"]["physical"]["parcel_id"] in removed
    if active_removed:
        result.update(active_id=None, draft=new_draft(after))
    if active_removed and not result["designs"] and not result["applied"]:
        return None
    for draft in [result["draft"]] + [r["draft"] for r in result["designs"]] + [s["draft"] for s in result["applied"]]:
        old = draft["physical"]["parcel_id"]
        if old is not None:
            require(old in mapping, "A dependent designer snapshot must be explicitly removed.")
            draft["physical"]["parcel_id"] = mapping[old]
    for snapshot in result["applied"]:
        snapshot["plan"]["parcel_id"] = mapping[snapshot["plan"]["parcel_id"]]
    return validate(result, after)

