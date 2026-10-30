"""Single-process local JSON store. Publish in memory only after atomic persistence."""

from copy import deepcopy
import hashlib
import json
import os
from pathlib import Path
import tempfile
from threading import RLock

from .engine import Invalid, new_project, require, transition, validate_state, same_json
from . import parcel_removal, funding


class Conflict(Invalid):
    pass


def _validate_project_export(payload):
    require(
        isinstance(payload, dict)
        and {"format_version", "project", "undo"} <= set(payload)
        and set(payload) <= {"format_version", "project", "undo", "undo_edit"},
        "Invalid export envelope.",
    )
    require(
        type(payload["format_version"]) is int
        and payload["format_version"] in (1, 2, 3, 4),
        "Unsupported export version.",
    )
    require(
        isinstance(payload["project"], dict)
        and payload["project"].get("schema_version") == payload["format_version"],
        "Export and project schema versions do not match.",
    )
    project = validate_state(payload["project"])
    undo = payload["undo"]
    edit = payload.get("undo_edit")
    require(
        edit is None
        or (
            isinstance(edit, dict)
            and ((set(edit) == {"kind", "parcel_ids"} and edit["kind"] == "delete_parcels" and isinstance(edit["parcel_ids"], list))
                 or (set(edit) == {"kind"} and edit["kind"] == "delete_demonstrator"))
            and undo is not None
        ),
        "Invalid exploration undo metadata.",
    )
    if undo is not None:
        require(isinstance(undo, dict), "Invalid undo snapshot.")
        if undo.get("schema_version") in (1, 2, 3):
            from .engine import migrate_previous

            undo = migrate_previous(undo, project["scenario"])
        else:
            undo = validate_state(undo)
        require(
            undo["id"] == project["id"]
            and undo["name"] == project["name"]
            and undo["scenario"] == project["scenario"],
            "Undo belongs to a different project.",
        )
        if edit is not None:
            if edit["kind"] == "delete_demonstrator":
                from .demonstrator_removal import delete
                rebuilt = delete(undo)
            else:
                rebuilt = parcel_removal.delete(undo, edit["parcel_ids"])
            rebuilt["revision"] = project["revision"]
            require(
                same_json(rebuilt, project),
                "Deletion undo does not rebuild this project.",
            )
        else:
            require(
                len(project["history"]) > 0
                and undo["history"] == project["history"][:-1],
                "Invalid undo history.",
            )
        require(undo["revision"] < project["revision"], "Invalid undo revision.")
    result = {"format_version": 4, "project": project, "undo": undo}
    if "undo_edit" in payload:
        result["undo_edit"] = edit
    return result


def validate_export(payload):
    """Explicit envelope migrations; simulation schema/replay remains version 4."""
    require(isinstance(payload, dict), "Invalid export envelope.")
    require("format_version" in payload and type(payload["format_version"]) is int, "Export version must be an integer supported by this application.")
    if payload.get("format_version") in (5, 6, 7, 8):
        required_keys = {"format_version", "project", "undo", "designer", "designer_revision", "designer_undo"}
        if payload["format_version"] in (7, 8):
            required_keys |= {"planning", "planning_revision", "planning_undo"}
        if payload["format_version"] == 8:
            required_keys |= {"funding", "funding_revision", "funding_undo"}
        require(required_keys <= set(payload) and set(payload) <= required_keys | {"undo_edit"}, "Invalid designer export envelope.")
        require(isinstance(payload["project"],dict) and payload["project"].get("schema_version") == 4, "Designer envelope requires simulation schema 4.")
        base = {k: payload[k] for k in ("project", "undo")}
        base["format_version"] = 4
        if "undo_edit" in payload: base["undo_edit"] = payload["undo_edit"]
        result = _validate_project_export(base)
        from .designer import validate_attachment
        from .designer_library import migrate_v5
        require(type(payload["designer_revision"]) is int and payload["designer_revision"] >= 0, "Invalid designer revision.")
        main = payload["designer"]
        prior = payload["designer_undo"]
        if payload["format_version"] == 5:
            main = migrate_v5(main, result["project"])
            if result["undo"] is not None: prior = migrate_v5(prior, result["undo"])
        result.update(designer=deepcopy(validate_attachment(main,result["project"])), designer_revision=payload["designer_revision"], designer_undo=deepcopy(validate_attachment(prior,result["undo"]) if result["undo"] is not None else None))
        require(result["undo"] is not None or payload["designer_undo"] is None, "Designer undo requires a project undo snapshot.")
    else:
        # Explicit envelope migration. Existing simulation migration/replay stays frozen.
        result = _validate_project_export(payload)
        result.update(designer=None, designer_revision=0, designer_undo=None)
    if payload["format_version"] in (7, 8):
        from .planning_draft import validate
        require(type(payload["planning_revision"]) is int and payload["planning_revision"] >= 0, "Invalid planning revision.")
        require(result["undo"] is not None or payload["planning_undo"] is None, "Planning undo requires a project undo snapshot.")
        result.update(planning=deepcopy(validate(payload["planning"], result["project"])), planning_revision=payload["planning_revision"],
                      planning_undo=deepcopy(validate(payload["planning_undo"], result["undo"]) if result["undo"] is not None else None))
    else:
        result.update(planning=None, planning_revision=0, planning_undo=None)
    if payload["format_version"] == 8:
        require(type(payload["funding_revision"]) is int and payload["funding_revision"] >= 0, "Invalid funding revision.")
        require(result["undo"] is not None or payload["funding_undo"] is None, "Funding undo requires a project undo snapshot.")
        result.update(funding=deepcopy(funding.validate_attachment(payload["funding"], result["project"])), funding_revision=payload["funding_revision"], funding_undo=deepcopy(funding.validate_attachment(payload["funding_undo"], result["undo"])))
    else:
        result.update(funding=None, funding_revision=0, funding_undo=None)
    result["format_version"] = 8
    return result


def clean_removed(data):
    """Upgrade earlier soft deletions without retaining them in project history."""
    cleaned, ids = parcel_removal.cleanup(data["project"])
    if ids:
        data["undo"] = deepcopy(data["project"])
        data["undo_edit"] = dict(kind="delete_parcels", parcel_ids=ids)
        data["revision"] += 1
        cleaned["revision"] = data["revision"]
        data["project"] = cleaned
    return bool(ids)


class Store:
    def __init__(self, path):
        self.path = Path(path)
        self.lock = RLock()
        self.error = None
        self.data = {
            "format_version": 8,
            "funding": None,
            "funding_revision": 0,
            "funding_undo": None,
            "planning": None,
            "planning_revision": 0,
            "planning_undo": None,
            "designer": None,
            "designer_revision": 0,
            "designer_undo": None,
            "project": None,
            "undo": None,
            "undo_edit": None,
            "receipts": {},
            "revision": 0,
        }
        if self.path.exists():
            try:
                original = self.path.read_bytes()
                raw = json.loads(original.decode("utf-8"))
                require(
                    set(raw) in (set(self.data), set(self.data) - {"funding", "funding_revision", "funding_undo"}, set(self.data) - {"funding", "funding_revision", "funding_undo", "planning", "planning_revision", "planning_undo"}, set(self.data) - {"funding", "funding_revision", "funding_undo", "planning", "planning_revision", "planning_undo", "designer", "designer_revision", "designer_undo"}, set(self.data) - {"funding", "funding_revision", "funding_undo", "planning", "planning_revision", "planning_undo", "undo_edit", "designer", "designer_revision", "designer_undo"}),
                    "Invalid autosave envelope.",
                )
                validated = validate_export(
                    {
                        k: raw[k]
                        for k in ("format_version", "project", "undo", "undo_edit", "designer", "designer_revision", "designer_undo", "planning", "planning_revision", "planning_undo", "funding", "funding_revision", "funding_undo")
                        if k in raw
                    }
                )
                require(
                    type(raw["revision"]) is int
                    and raw["revision"] == validated["project"]["revision"],
                    "Invalid store revision.",
                )
                require(
                    isinstance(raw["receipts"], dict)
                    and all(
                        isinstance(k, str) and isinstance(v, str)
                        for k, v in raw["receipts"].items()
                    ),
                    "Invalid request receipts.",
                )
                candidate = {**self.data, **raw, **validated}
                cleaned = clean_removed(candidate)
                if raw["format_version"] in (1, 2, 3, 4, 5, 6, 7):
                    checksum = hashlib.sha256(original).hexdigest()[:12]
                    backup = self.path.with_name(
                        self.path.stem
                        + f".schema-v{raw['format_version']}-"
                        + checksum
                        + ".json"
                    )
                    if not backup.exists():
                        with backup.open("xb") as out:
                            out.write(original)
                    self.write(candidate)
                elif cleaned:
                    self.write(candidate)
                self.data = candidate
            except (ValueError, KeyError, TypeError, OSError, RecursionError) as exc:
                self.error = f"Cannot restore autosave at {self.path}: {exc}. Preserve or move that file before restarting."

    def check(self):
        if self.error:
            raise OSError(self.error)

    def snapshot(self):
        with self.lock:
            self.check()
            return deepcopy(self.data)

    def write(self, data):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        temp = None
        try:
            with tempfile.NamedTemporaryFile(
                mode="w",
                encoding="utf-8",
                dir=self.path.parent,
                prefix=".autosave-",
                suffix=".tmp",
                delete=False,
            ) as out:
                temp = out.name
                json.dump(data, out, ensure_ascii=False, allow_nan=False, indent=2)
                out.flush()
                os.fsync(out.fileno())
            os.replace(temp, self.path)
        finally:
            if temp and os.path.exists(temp):
                os.unlink(temp)

    def mutate(self, operation, revision, request_id, body):
        with self.lock:
            self.check()
            try:
                fingerprint = hashlib.sha256(
                    json.dumps(
                        [operation, revision, body], sort_keys=True, allow_nan=False
                    ).encode()
                ).hexdigest()
            except (ValueError, TypeError, RecursionError) as exc:
                raise Invalid(
                    "Request must contain finite, valid JSON values."
                ) from exc
            receipt = self.data["receipts"].get(request_id)
            if receipt:
                if receipt != fingerprint:
                    raise Conflict(
                        "This request identifier was already used for a different request."
                    )
                return (
                    self.snapshot(),
                    "Request already saved; no effects were repeated.",
                )
            if revision != self.data["revision"]:
                raise Conflict(
                    "This view is out of date. Reload the saved project before trying again."
                )
            candidate = deepcopy(self.data)
            candidate["undo_edit"] = None
            current = candidate["project"]
            if operation not in {"undo", "import"}:
                candidate["funding_undo"] = deepcopy(candidate["funding"])
                candidate["designer_undo"] = deepcopy(candidate["designer"])
                candidate["planning_undo"] = deepcopy(candidate["planning"])
            if operation == "new":
                require(
                    current is None or body["confirm_replace"],
                    "Confirm replacement of the current project.",
                )
                candidate["project"] = new_project(body["name"])
                candidate["undo"] = None
                candidate["designer"] = None
                candidate["designer_undo"] = None
                candidate["designer_revision"] += 1
                candidate.update(planning=None, planning_undo=None, planning_revision=candidate["planning_revision"] + 1)
                candidate.update(funding=None, funding_undo=None, funding_revision=candidate["funding_revision"] + 1)
                explanation = "New project created. Choose a starting land route."
            elif operation == "import":
                require(
                    current is None or body["confirm_replace"],
                    "Confirm replacement of the current project.",
                )
                imported = validate_export(body["save"])
                candidate.update(imported)
                clean_removed(candidate)
                explanation = "Project and undo snapshot imported. Its embedded scenario is preserved."
            elif operation == "apply_designer":
                raise Invalid("Designer application was retired. Refresh the app and use demonstrator planning in Project.")
            elif operation == "commit":
                require(current is not None, "Create a project first.")
                require(
                    body["action_id"] != parcel_removal.ACTION,
                    "Delete parcels with the exploration editing control, not a simulation action.",
                )
                if body["action_id"] == "demonstrator":
                    require(candidate["planning"] is not None and body.get("planning_revision") is not None, "Save and review a planning draft before committing the demonstrator.")
                    if body["planning_revision"] != candidate["planning_revision"]:
                        raise Conflict("Planning draft changed. Save and review the demonstrator plan again.")
                    require(candidate["planning"]["source"] is not None or current["demonstrator"] is not None, "Use a saved site design in demonstrator planning first.")
                    require(same_json(body["inputs"], candidate["planning"]["inputs"]), "Commit must use the reviewed saved planning draft.")
                candidate["project"], explanation = transition(
                    current, body["action_id"], body["inputs"]
                )
                candidate["undo"] = deepcopy(current)
                if body["action_id"] == "demonstrator" and candidate["planning"]["source"] is not None:
                    require(candidate["designer"] is not None, "The planning design library is missing; preserve the draft and reload the project.")
                    candidate["designer"]["applied"].append({**deepcopy(candidate["planning"]["source"]), "plan": deepcopy(candidate["project"]["demonstrator"]["plan"])})
            elif operation == "delete_demonstrator":
                from .demonstrator_removal import delete
                require(current is not None, "Create a project first.")
                require(body["confirm"] is True, "Review and confirm demonstrator removal first.")
                candidate["project"] = delete(current)
                if candidate["funding"] is not None:
                    for record in candidate["funding"]["plans"]:
                        if record["draft"]["baseline"]["target"] == "demonstrator": record["active"] = False
                candidate["funding_revision"] += 1
                candidate["undo"] = deepcopy(current)
                candidate["undo_edit"] = {"kind": "delete_demonstrator"}
                if candidate["designer"] is not None:
                    candidate["designer"]["applied"] = []
                candidate["designer_revision"] += 1
                candidate["planning_revision"] += 1
                explanation = "Demonstrator and dependent simulation records removed. Parcels, saved site designs and the planning draft were kept; cash and time were rebuilt."
            elif operation == "delete_parcel":
                require(current is not None, "Create a project first.")
                require(
                    body.get("confirm") is True,
                    "Review and confirm the deletion first.",
                )
                candidate["project"] = parcel_removal.delete(
                    current, [body["parcel_id"]]
                )
                candidate["funding"] = funding.after_delete(candidate["funding"], current, candidate["project"], [body["parcel_id"]])
                candidate["funding_revision"] += 1
                candidate["undo"] = deepcopy(current)
                candidate["undo_edit"] = dict(
                    kind="delete_parcels", parcel_ids=[body["parcel_id"]]
                )
                from .designer import after_parcel_deletion
                candidate["designer"] = after_parcel_deletion(candidate["designer"], current, candidate["project"], body["parcel_id"])
                candidate["designer_revision"] += 1
                from .planning_draft import after_parcel_deletion
                candidate["planning"] = after_parcel_deletion(candidate["planning"], current, candidate["project"], body["parcel_id"])
                candidate["planning_revision"] += 1
                explanation = "Parcel and dependent choices deleted. Cash and time were recalculated from the remaining choices."
            elif operation == "undo":
                require(candidate["undo"] is not None, "No saved action to undo.")
                candidate["project"] = deepcopy(candidate["undo"])
                if self.data["undo_edit"] is not None:
                    # Reconcile restored links while preserving later unrelated exploration edits.
                    prior = candidate["funding_undo"]
                    live = candidate["funding"]
                    if prior is not None and live is not None:
                        if self.data["undo_edit"]["kind"] == "delete_parcels":
                            _, _, _, maps = parcel_removal.rebuild(candidate["project"], self.data["undo_edit"]["parcel_ids"], with_mapping=True)
                            inverse = {v:k for k,v in maps["parcel_id"].items()}
                            live = deepcopy(live)
                            drafts = ([live["draft"]] if live["draft"] is not None else []) + [r["draft"] for r in live["scenarios"]+live["plans"]]
                            for d in drafts:
                                require(set(d["baseline"]["parcel_ids"]) <= set(inverse), "Cannot remap a later funding draft during deletion Undo.")
                                d["baseline"]["parcel_ids"] = [inverse[p] for p in d["baseline"]["parcel_ids"]]
                            for r in live["scenarios"]+live["plans"]: r["assessment"]["draft"] = deepcopy(r["draft"])
                        prior_scenarios = {r["id"] for r in prior["scenarios"]}
                        prior_plans = {r["id"] for r in prior["plans"]}
                        prior["scenarios"].extend(r for r in live["scenarios"] if r["id"] not in prior_scenarios)
                        newer_keys = {r["draft"]["activity_key"] for r in live["plans"] if r["active"] and r["id"] not in prior_plans}
                        for r in prior["plans"]:
                            if r["draft"]["activity_key"] in newer_keys: r["active"] = False
                        prior["plans"].extend(r for r in live["plans"] if r["id"] not in prior_plans)
                        if live["draft"] is not None: prior["draft"] = live["draft"]
                    candidate["funding"] = prior if prior is not None else live
                elif candidate["funding"] is not None:
                    missing = [p["id"] for p in current["parcels"] if p["id"] not in {q["id"] for q in candidate["project"]["parcels"]}]
                    if missing: candidate["funding"] = funding.after_delete(candidate["funding"], current, candidate["project"], missing)
                funding.validate_attachment(candidate["funding"], candidate["project"])
                candidate["funding_undo"] = None
                candidate["funding_revision"] += 1
                if self.data["undo_edit"] is not None and self.data["undo_edit"]["kind"] == "delete_parcels":
                    candidate["designer"] = deepcopy(candidate["designer_undo"])
                    candidate["planning"] = deepcopy(candidate["planning_undo"])
                elif candidate["designer"] is not None:
                    # Project undo must not discard a draft saved afterwards.
                    prior = candidate["designer_undo"]
                    candidate["designer"]["applied"] = [] if prior is None else deepcopy(prior["applied"])
                    from .designer import validate_attachment
                    validate_attachment(candidate["designer"], candidate["project"])
                candidate["designer_undo"] = None
                candidate["planning_undo"] = None
                candidate["planning_revision"] += 1
                candidate["designer_revision"] += 1
                candidate["undo"] = None
                explanation = (
                    "Deletion undone. The previous project was restored."
                    if self.data.get("undo_edit")
                    else "Last action undone. Its time, cash and state changes were restored."
                )
            else:
                raise Invalid("Unknown operation.")
            candidate["revision"] += 1
            candidate["project"]["revision"] = candidate["revision"]
            if operation == "import" and candidate["undo"] is not None:
                candidate["undo"]["revision"] = candidate["revision"] - 1
            candidate["receipts"][request_id] = fingerprint
            self.write(candidate)
            self.data = candidate
            return self.snapshot(), explanation

    def export(self):
        data = self.snapshot()
        require(data["project"] is not None, "Create a project first.")
        exported = {k: data[k] for k in ("format_version", "project", "undo", "designer", "designer_revision", "designer_undo", "planning", "planning_revision", "planning_undo", "funding", "funding_revision", "funding_undo")}
        if data.get("undo_edit"):
            exported["undo"] = None
            exported["designer_undo"] = None
            exported["planning_undo"] = None
            exported["funding_undo"] = None
        return exported

    def funding_mutation(self, operation, revision, funding_revision, planning_revision, design_revision, request_id, draft=None, record_id=None):
        with self.lock:
            self.check()
            fingerprint = funding.digest([operation, revision, funding_revision, planning_revision, design_revision, draft, record_id])
            if request_id in self.data["receipts"]:
                require(self.data["receipts"][request_id] == fingerprint, "Request ID was reused with different funding content.")
                return self.snapshot()
            if revision != self.data["revision"] or funding_revision != self.data["funding_revision"] or planning_revision != self.data["planning_revision"] or design_revision != self.data["designer_revision"]:
                raise Conflict("Project, funding or planning changed. Reload saved context; your entered exploration is retained.")
            require(self.data["project"] is not None, "Create a project before saving funding explorations.")
            candidate = deepcopy(self.data)
            candidate["funding"] = funding.operate(candidate["funding"], candidate["project"], candidate["planning"], operation, draft, record_id)
            candidate["funding_revision"] += 1
            candidate["receipts"][request_id] = fingerprint
            self.write(candidate)
            self.data = candidate
            return self.snapshot()


    def _designer_mutation(self, operation, payload, revision, design_revision, request_id, transform):
        from .designer_library import validate
        with self.lock:
            self.check()
            try:
                fingerprint = hashlib.sha256(json.dumps([operation, revision, design_revision, payload], sort_keys=True, allow_nan=False).encode()).hexdigest()
            except (ValueError, TypeError, RecursionError) as exc:
                raise Invalid("Designer changes must contain finite, valid JSON values.") from exc
            if request_id in self.data["receipts"]:
                require(self.data["receipts"][request_id] == fingerprint, "Request ID was reused with different designer content.")
                return self.snapshot()
            if revision != self.data["revision"] or design_revision != self.data["designer_revision"]:
                raise Conflict("Project or design library changed. Reload before saving; your working draft is retained.")
            require(self.data["project"] is not None, "Create a project first.")
            candidate = deepcopy(self.data)
            candidate["designer"] = validate(transform(candidate["designer"], candidate["project"]), candidate["project"])
            candidate["designer_revision"] += 1
            candidate["receipts"][request_id] = fingerprint
            self.write(candidate)
            self.data = candidate
            return self.snapshot()

    def save_designer(self, draft, revision, design_revision, request_id, *, mode, design_id, name):
        from .designer_library import save
        payload = dict(draft=draft, mode=mode, design_id=design_id, name=name)
        return self._designer_mutation("designer_save", payload, revision, design_revision, request_id,
            lambda value, project: save(value, project, draft, mode, design_id, name))

    def planning_mutation(self, operation, revision, planning_revision, request_id, administration=None, design_revision=None):
        from . import planning_draft
        with self.lock:
            self.check()
            try:
                fingerprint = hashlib.sha256(json.dumps([operation, revision, planning_revision, administration, design_revision], sort_keys=True, allow_nan=False).encode()).hexdigest()
            except (ValueError, TypeError, RecursionError) as exc:
                raise Invalid("Planning edits must contain finite, valid JSON values.") from exc
            if request_id in self.data["receipts"]:
                require(self.data["receipts"][request_id] == fingerprint, "Request ID was reused with different planning content.")
                return self.snapshot()
            if revision != self.data["revision"] or planning_revision != self.data["planning_revision"]:
                raise Conflict("Project or planning draft changed. Reload before retrying; your entered values are retained.")
            require(self.data["project"] is not None, "Create a project first.")
            candidate = deepcopy(self.data)
            if operation == "edit":
                candidate["planning"] = planning_draft.edit(candidate["planning"], candidate["project"], administration)
            elif operation == "handoff":
                if design_revision != candidate["designer_revision"]:
                    raise Conflict("Site design changed. Review the transfer again.")
                candidate["planning"] = planning_draft.handoff(candidate["planning"], candidate["project"], candidate["designer"])
            else:
                raise Invalid("Unsupported planning operation.")
            candidate["planning_revision"] += 1
            candidate["receipts"][request_id] = fingerprint
            self.write(candidate)
            self.data = candidate
            return self.snapshot()

    def designer_library(self, operation, revision, design_revision, request_id, *, design_id, name, confirm):
        from .designer_library import operate
        payload = dict(operation=operation, design_id=design_id, name=name, confirm=confirm)
        return self._designer_mutation("designer_library", payload, revision, design_revision, request_id,
            lambda value, project: operate(value, project, operation, design_id, name, confirm))
