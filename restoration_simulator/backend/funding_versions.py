"""Explicit version workspace conversion and atomic active-version updates."""
from copy import deepcopy
from uuid import uuid4
from .engine import require, same_json
from . import funding


def sync(value, project, planning):
    if value is None or value["version"] == 1:
        return value
    active = value["active_version_id"]
    if active is None:
        require(value["draft"] is None, "Choose or create a version before saving edits.")
        return value
    record = next((r for r in value["scenarios"] if r["id"] == active), None)
    require(record is not None and value["draft"] is not None, "The active funding version is missing. Reload versions; your draft is retained.")
    record.update(draft=deepcopy(value["draft"]), assessment=funding.evaluate(value["draft"], project, planning))
    return value


def preview(value, project, planning, draft, version_id):
    funding.identity(version_id)
    old = funding.initial() if value is None else funding.validate_attachment(value, project)
    require(old["version"] == 1, "This workspace already uses autosaved versions. Reload funding.")
    require(version_id not in {r["id"] for r in old["scenarios"] + old["plans"]}, "Choose a new version identity.")
    prepared = funding.prepare(draft, project, adopt_current_catalogue=True, planning=planning)
    require(prepared["applicant_review"] is None, "Review the applicant type before updating this workspace.")
    payload = [old, project["revision"], planning, draft, version_id, prepared["draft"]]
    return {"version": 1, "version_id": version_id, "draft": prepared["draft"], "catalogue_review": prepared["catalogue_review"],
            "messages": ["Create an independent active version from the current working draft. Existing saved alternatives and adopted history are retained.", "Every editable named version will autosave. Duplicate a version before trying a different approach."],
            "preview_hash": funding.digest(payload)}


def duplicate_draft(draft):
    result = deepcopy(draft)
    result["name"] = (draft["name"] + " copy")[:80]
    if "project_concepts" in result:
        for concept in result["project_concepts"].values():
            concept["id"] = str(uuid4())
            mapping = {a["id"]: str(uuid4()) for a in concept["activities"]}
            for activity in concept["activities"]: activity["id"] = mapping[activity["id"]]
            if "delivery_plan" in concept:
                for topic in concept["delivery_plan"]["topics"].values():
                    topic["activity_ids"] = [mapping[id] for id in topic["activity_ids"]]
    return result


def operate(value, project, planning, operation, draft, record_id, preview_hash, version_id):
    v = deepcopy(funding.initial() if value is None else funding.validate_attachment(value, project))
    if operation == "upgrade_workspace":
        review = preview(v, project, planning, draft, record_id)
        require(review["preview_hash"] == preview_hash, "The workspace comparison changed. Keep your draft and review the update again.")
        v.update(version=2, active_version_id=record_id, draft=deepcopy(review["draft"]))
        v["scenarios"].append({"id": record_id, "draft": deepcopy(v["draft"]), "assessment": funding.evaluate(v["draft"], project, planning), "active": True})
    else:
        require(v["version"] == 2, "Review the autosaved-version workspace update first.")
        if operation == "activate":
            funding.identity(record_id)
            record = next((r for r in v["scenarios"] if r["id"] == record_id), None)
            require(record is not None, "This version was removed. Reload versions; no other version was selected.")
            v.update(active_version_id=record_id, draft=deepcopy(record["draft"]))
        elif operation in {"duplicate", "create_version"}:
            if operation == "duplicate":
                require(v["draft"] is not None and record_id == v["active_version_id"], "The version to duplicate changed. Reload versions.")
                next_draft = duplicate_draft(v["draft"])
            else:
                next_draft = deepcopy(funding.validate_draft(draft, project))
            # The request identity is also the created version identity, so retries
            # and a changed active window can identify the exact created record.
            funding.identity(version_id)
            require(version_id not in {r["id"] for r in v["scenarios"] + v["plans"]}, "This version identity already exists. Use a new request identity.")
            vid = version_id
            v.update(active_version_id=vid, draft=next_draft)
            v["scenarios"].append({"id": vid, "draft": deepcopy(next_draft), "assessment": funding.evaluate(next_draft, project, planning), "active": True})
        elif operation in {"draft", "save", "adopt"}:
            require(v["active_version_id"] is not None, "Choose a version before saving edits.")
            require(record_id in {None, v["active_version_id"]}, "The edited version changed. Reload versions and retain your draft.")
            v["draft"] = deepcopy(funding.validate_draft(draft, project))
            sync(v, project, planning)
            if operation == "adopt":
                # Use the unchanged adoption checks and immutable plan snapshots.
                legacy = {k: deepcopy(v[k]) for k in ["draft", "scenarios", "plans"]}
                legacy["version"] = 1
                adopted = funding.operate(legacy, project, planning, "adopt", draft, None)
                v["plans"] = adopted["plans"]
        elif operation == "delete":
            funding.identity(record_id)
            require(any(r["id"] == record_id for r in v["scenarios"] + v["plans"]), "Funding version or plan was not found.")
            v["scenarios"] = [r for r in v["scenarios"] if r["id"] != record_id]
            v["plans"] = [r for r in v["plans"] if r["id"] != record_id]
            if v["active_version_id"] == record_id: v.update(active_version_id=None, draft=None)
        else:
            require(False, "Unsupported funding version operation.")
    return funding.validate_attachment(v, project)
