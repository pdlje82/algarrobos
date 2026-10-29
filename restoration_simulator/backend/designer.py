"""Designer facade: current commands, immutable historical snapshots and persistence integration."""
from copy import deepcopy
from . import designer_v1 as legacy
from . import designer_v2 as current
from . import planting, plant_prices
from .configuration import keys
from .engine import require, list_actions

DIRECTORY = legacy.DIRECTORY
LIBRARY = legacy.LIBRARY
PHYSICAL = legacy.PHYSICAL
EFFECTS = legacy.EFFECTS
EVIDENCE = legacy.EVIDENCE
checked = legacy.checked
digest = legacy.digest
source_file = legacy.source_file
plan_fields = legacy.plan_fields
references = legacy.references
dimensions = legacy.dimensions
validate_bundle = current.validate_bundle
load_bundle = current.load_bundle
new_draft = current.new_draft
validate_draft = current.validate_draft
evaluate = current.evaluate
import_plan = current.import_plan

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
