"""Single-process local JSON store. Publish in memory only after atomic persistence."""

from copy import deepcopy
import hashlib
import json
import os
from pathlib import Path
import tempfile
from threading import RLock

from .engine import Invalid, new_project, require, transition, validate_state, same_json
from . import parcel_removal


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
            and set(edit) == {"kind", "parcel_ids"}
            and edit["kind"] == "delete_parcels"
            and isinstance(edit["parcel_ids"], list)
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
    """Envelope 5 adds designer attachments; the simulation remains schema 4."""
    require(isinstance(payload, dict), "Invalid export envelope.")
    if payload.get("format_version") == 5:
        required_keys = {"format_version", "project", "undo", "designer", "designer_revision", "designer_undo"}
        require(required_keys <= set(payload) and set(payload) <= required_keys | {"undo_edit"}, "Invalid designer export envelope.")
        require(isinstance(payload["project"],dict) and payload["project"].get("schema_version") == 4, "Designer envelope requires simulation schema 4.")
        base = {k: payload[k] for k in ("project", "undo")}
        base["format_version"] = 4
        if "undo_edit" in payload: base["undo_edit"] = payload["undo_edit"]
        result = _validate_project_export(base)
        from .designer import validate_attachment
        require(type(payload["designer_revision"]) is int and payload["designer_revision"] >= 0, "Invalid designer revision.")
        result.update(designer=deepcopy(validate_attachment(payload["designer"],result["project"])), designer_revision=payload["designer_revision"], designer_undo=deepcopy(validate_attachment(payload["designer_undo"],result["undo"]) if result["undo"] is not None else None))
        require(result["undo"] is not None or payload["designer_undo"] is None, "Designer undo requires a project undo snapshot.")
    else:
        # Explicit envelope migration. Existing simulation migration/replay stays frozen.
        result = _validate_project_export(payload)
        result.update(designer=None, designer_revision=0, designer_undo=None)
    result["format_version"] = 5
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
            "format_version": 5,
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
                    set(raw) in (set(self.data), set(self.data) - {"designer", "designer_revision", "designer_undo"}, set(self.data) - {"undo_edit", "designer", "designer_revision", "designer_undo"}),
                    "Invalid autosave envelope.",
                )
                validated = validate_export(
                    {
                        k: raw[k]
                        for k in ("format_version", "project", "undo", "undo_edit", "designer", "designer_revision", "designer_undo")
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
                if raw["format_version"] in (1, 2, 3, 4):
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
                candidate["designer_undo"] = deepcopy(candidate["designer"])
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
                from .designer import apply_inputs, evaluate, digest
                require(current is not None and candidate["designer"] is not None, "Save a designer draft first.")
                require(body["design_revision"] == candidate["designer_revision"], "Designer draft changed; review it again.")
                draft = candidate["designer"]["draft"]
                values = apply_inputs(current, draft, body["administration"])
                candidate["project"], explanation = transition(current, "demonstrator", values)
                candidate["undo"] = deepcopy(current)
                candidate["designer"]["applied"].append(dict(draft=deepcopy(draft), plan=deepcopy(candidate["project"]["demonstrator"]["plan"]), ruleset_hash=digest(draft["bundle"])))
            elif operation == "commit":
                require(current is not None, "Create a project first.")
                require(
                    body["action_id"] != parcel_removal.ACTION,
                    "Delete parcels with the exploration editing control, not a simulation action.",
                )
                candidate["project"], explanation = transition(
                    current, body["action_id"], body["inputs"]
                )
                candidate["undo"] = deepcopy(current)
            elif operation == "delete_parcel":
                require(current is not None, "Create a project first.")
                require(
                    body.get("confirm") is True,
                    "Review and confirm the deletion first.",
                )
                candidate["project"] = parcel_removal.delete(
                    current, [body["parcel_id"]]
                )
                candidate["undo"] = deepcopy(current)
                candidate["undo_edit"] = dict(
                    kind="delete_parcels", parcel_ids=[body["parcel_id"]]
                )
                from .designer import after_parcel_deletion
                candidate["designer"] = after_parcel_deletion(candidate["designer"], current, candidate["project"], body["parcel_id"])
                candidate["designer_revision"] += 1
                explanation = "Parcel and dependent choices deleted. Cash and time were recalculated from the remaining choices."
            elif operation == "undo":
                require(candidate["undo"] is not None, "No saved action to undo.")
                candidate["project"] = deepcopy(candidate["undo"])
                if self.data["undo_edit"] is not None:
                    candidate["designer"] = deepcopy(candidate["designer_undo"])
                elif candidate["designer"] is not None:
                    # Project undo must not discard a draft saved afterwards.
                    prior = candidate["designer_undo"]
                    candidate["designer"]["applied"] = [] if prior is None else deepcopy(prior["applied"])
                    from .designer import validate_attachment
                    validate_attachment(candidate["designer"], candidate["project"])
                candidate["designer_undo"] = None
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
        exported = {k: data[k] for k in ("format_version", "project", "undo", "designer", "designer_revision", "designer_undo")}
        if data.get("undo_edit"):
            exported["undo"] = None
            exported["designer_undo"] = None
        return exported


    def save_designer(self, draft, revision, design_revision, request_id):
        from .designer import evaluate
        with self.lock:
            self.check()
            try:
                fingerprint = hashlib.sha256(json.dumps(["designer", revision, design_revision, draft], sort_keys=True, allow_nan=False).encode()).hexdigest()
            except (ValueError,TypeError,RecursionError) as exc:
                raise Invalid("Designer save must contain finite, valid JSON values.") from exc
            if request_id in self.data["receipts"]:
                require(self.data["receipts"][request_id] == fingerprint, "Request ID was reused with different designer content.")
                return self.snapshot()
            if revision != self.data["revision"] or design_revision != self.data["designer_revision"]:
                raise Conflict("Project or designer changed. Reload before saving; your draft is retained.")
            require(self.data["project"] is not None, "Create a project first.")
            result = evaluate(draft,self.data["project"])
            candidate = deepcopy(self.data)
            applied = [] if candidate["designer"] is None else candidate["designer"]["applied"]
            candidate["designer"] = dict(draft=result["draft"],applied=applied)
            candidate["designer_revision"] += 1
            candidate["receipts"][request_id] = fingerprint
            self.write(candidate)
            self.data = candidate
            return self.snapshot()
