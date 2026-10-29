"""Designer facade: current commands, immutable historical snapshots and persistence integration."""
from copy import deepcopy
from . import designer_v1 as legacy
from . import designer_v3 as current
from . import planting, plant_prices
from .configuration import keys
from .engine import require

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
@checked
def evaluate(original, project, command=None):
    from .designer_display import describe
    result = current.evaluate(original, project, command)
    result["display"] = describe(result)
    return result


@checked
def import_plan(project):
    from .designer_display import describe
    result = current.import_plan(project)
    result["display"] = describe(result)
    return result

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
    from . import designer_library as library
    current = load_bundle()
    draft = new_draft(project) if attachment is None else attachment["draft"]
    result = evaluate(draft,project)
    return {"design_revision":revision,"project_revision":project["revision"],"saved":attachment is not None and attachment["active_id"] is not None,
        "evaluation":result,"catalogue":planting.catalogue(),"price_defaults":plant_prices.snapshot(),
        "fields":workspace_fields(project), "library":library.summaries(attachment), "active_design_id":None if attachment is None else attachment["active_id"],
        "library_defaults":library.defaults(), "suggested_name":library.available_name(attachment),"available":True,"reason":None,
        "rules_update_available":digest(current)!=digest(draft["bundle"]),"can_import":project["demonstrator"] is not None and not project["demonstrator"]["legacy"]}


@checked
def validate_legacy_attachment(value, project):
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


def validate_attachment(value, project):
    from .designer_library import validate
    return validate(value, project)


def after_parcel_deletion(attachment, before, after, deleted):
    from .designer_library import after_parcel_deletion as remove
    return remove(attachment, before, after, deleted)


def workspace_fields(project):
    from .designer_library import defaults
    fields = deepcopy(plan_fields(project))
    # A fresh designer is deliberately unlinked, including projects without land.
    for field in fields:
        if field["name"] == "parcel_id":
            field["default"] = ""
            field["options"] = [{"value": "", "label": defaults()["unlinked_label"]}] + field["options"]
    return fields



if __name__ == "__main__":
    bundle = load_bundle()
    for ident in bundle["sources"]: source_file(bundle,ident)
    print("Validated",bundle["manifest"]["ruleset_id"],digest(bundle))
