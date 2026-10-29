"""Delete exploration choices by replaying only retained actions.

No tombstone, deletion action or discarded project snapshot is embedded in the
rebuilt project. The store alone owns the explicit, single-level undo buffer.
"""

from copy import deepcopy
from . import engine_v3 as core, engine_v2, legacy
from .parcel_removal_legacy import (
    working_state as working_state,
    plant_options as plant_options,
    require_included as require_included,
    transition as old_removal,
)

ACTION = "remove_parcel"  # Frozen historical action ID; new edits use the API.


def rebuild(state, parcel_ids, with_mapping=False, *, remove_demonstrator=False):
    from . import engine

    core.require(type(remove_demonstrator) is bool, "Choose an explicit supported exploration removal.")
    core.require(
        isinstance(parcel_ids, list)
        and (0 if remove_demonstrator else 1) <= len(parcel_ids) <= 500
        and all(core.text(v, 80) for v in parcel_ids)
        and len(set(parcel_ids)) == len(parcel_ids),
        "Choose valid parcels to delete.",
    )
    targets = set(parcel_ids)
    core.require(not remove_demonstrator or not targets, "Remove a demonstrator separately from parcels.")
    core.require(targets <= {p["id"] for p in state["parcels"]}, "Unknown parcel.")
    maps = {"parcel_id": {}, "agreement_id": {}}
    removed, pilot = [], {"id": None}

    def sync(original, kept):
        # Migrations synthesize agreements; match through the surviving parcel.
        old_agreements = (
            [] if original["schema_version"] == 1 else original["agreements"]
        )
        new_agreements = [] if kept["schema_version"] == 1 else kept["agreements"]
        for old in old_agreements:
            if old["id"] in maps["agreement_id"]:
                continue
            parcel = maps["parcel_id"].get(old["parcel_id"])
            candidates = [
                a
                for a in new_agreements
                if a["parcel_id"] == parcel
                and a["route_id"] == old["route_id"]
                and a["id"] not in maps["agreement_id"].values()
            ]
            if candidates:
                maps["agreement_id"][old["id"]] = candidates[0]["id"]

    def walk(stage):
        version = stage["schema_version"]
        module = {1: legacy, 2: engine_v2, 3: core, 4: engine}[version]
        origin_key = {
            1: None,
            2: "legacy_origin",
            3: "previous_origin",
            4: "demonstrator_origin",
        }[version]
        origin = stage[origin_key] if origin_key is not None else None
        if origin is not None:
            kept_origin = walk(origin)
            migrate = module.migrate_legacy if version == 2 else module.migrate_previous
            original = migrate(origin, stage["scenario"])
            kept = migrate(kept_origin, stage["scenario"])
            sync(original, kept)
        else:
            original = module.new_project(stage["name"], stage["scenario"], stage["id"])
            kept = module.new_project(stage["name"], stage["scenario"], stage["id"])
        baseline = len(original["history"])
        for h in stage["history"][baseline:]:
            before = original
            original = (
                old_removal(before, h["inputs"])
                if version == 4 and h["action_id"] == ACTION
                else module.transition(before, h["action_id"], h["inputs"])
            )[0]
            created = [
                p
                for p in original["parcels"]
                if p["id"] not in {p["id"] for p in before["parcels"]}
            ]
            if h["action_id"] == ACTION:
                kind = "legacy_exploration_edit"
            else:
                definitions = {a["id"]: a for a in before["scenario"]["actions"]}
                core.require(
                    h["action_id"] in definitions,
                    "Unknown action during deletion replay: " + h["action_id"],
                )
                kind = definitions[h["action_id"]]["kind"]
            values = deepcopy(h["inputs"])
            affected = {p["id"] for p in created}
            if values.get("parcel_id") not in (None, "new"):
                affected.add(values["parcel_id"])
            if values.get("agreement_id"):
                affected.update(
                    a["parcel_id"]
                    for a in before["agreements"]
                    if a["id"] == values["agreement_id"]
                )
            if (kind.startswith("demo_") and kind != "demo_plan") or kind.startswith(
                "grant_"
            ):
                attached = before.get("demonstrator")
                affected.add(
                    attached["plan"]["parcel_id"]
                    if attached and not attached.get("legacy")
                    else pilot["id"]
                )
            reason = None
            if remove_demonstrator and (h["action_id"] == "demonstrator" or kind.startswith("demo_") or kind.startswith("grant_")):
                reason = "Belongs to the removed demonstrator."
            elif affected & targets:
                reason = "Belongs to a deleted parcel."
            elif h["action_id"] == ACTION:
                reason = "Old exploration-removal marker."
            else:
                for key, mapping in maps.items():
                    value = values.get(key)
                    if value not in (None, "new"):
                        if value not in mapping:
                            reason = "Depends on another deleted choice."
                            break
                        values[key] = mapping[value]
            if reason is None:
                previous = kept
                try:
                    candidate = module.transition(kept, h["action_id"], values)[0]
                except core.Invalid as exc:
                    reason = ("Depends on the removed demonstrator: " if remove_demonstrator else "Cannot be retained after deletion: ") + str(exc)
                else:
                    kept = candidate
                    new_parcels = [
                        p
                        for p in kept["parcels"]
                        if p["id"] not in {p["id"] for p in previous["parcels"]}
                    ]
                    for old, new in zip(created, new_parcels):
                        maps["parcel_id"][old["id"]] = new["id"]
                    sync(original, kept)
            if reason:
                removed.append(dict(title=h["title"], year=h["end"], reason=reason))
            if h["action_id"] == "demonstrator":
                pilot["id"] = h["inputs"].get("parcel_id")
        return kept

    rebuilt = walk(state)
    rebuilt["revision"] = state["revision"]
    engine.validate_state(rebuilt)
    missing = [p for p in state["parcels"] if p["id"] not in maps["parcel_id"]]
    return (rebuilt, removed, missing, maps) if with_mapping else (rebuilt, removed, missing)


def plan(state, parcel_id):
    core.require(
        state.get("schema_version") == 4, "Upgrade the project before deleting parcels."
    )
    core.require(core.text(parcel_id, 80), "Choose a valid parcel.")
    ids = list(
        dict.fromkeys(
            [parcel_id]
            + [p["id"] for p in state["parcels"] if p.get("scenario_status")]
        )
    )
    rebuilt, actions, missing = rebuild(state, ids)
    p = next(p for p in state["parcels"] if p["id"] == parcel_id)
    return dict(
        parcel_id=parcel_id,
        name=p["name"],
        area=p["area"],
        title="Delete parcel",
        removed_actions=actions,
        deleted_parcels=[dict(name=p["name"], area=p["area"]) for p in missing],
        remaining_actions=len(rebuilt["history"]),
        remaining_parcels=len(rebuilt["parcels"]),
        cash_before=state["cash"],
        cash_after=rebuilt["cash"],
        cash_change=round(rebuilt["cash"] - state["cash"], 2),
        year_before=state["time"],
        year_after=rebuilt["time"],
        explanation="Delete this parcel and its dependent choices, then rebuild the project from the choices that remain. Its access arrangements, payments, work, funding records and timeline/history entries will disappear. No deletion event is added to the simulation.",
        undo_notice="Undo deletion restores the previous project until another change is saved. JSON exports contain only the rebuilt project; the deletion undo buffer is not exported.",
    )


def delete(state, parcel_ids):
    core.require(
        isinstance(parcel_ids, list)
        and 1 <= len(parcel_ids) <= 500
        and all(core.text(v, 80) for v in parcel_ids)
        and len(set(parcel_ids)) == len(parcel_ids),
        "Choose valid parcels to delete.",
    )
    ids = list(
        dict.fromkeys(
            parcel_ids + [p["id"] for p in state["parcels"] if p.get("scenario_status")]
        )
    )
    rebuilt, _, _ = rebuild(state, ids)
    return rebuilt


def cleanup(state):
    ids = [p["id"] for p in state["parcels"] if p.get("scenario_status")]
    return (delete(state, ids), ids) if ids else (state, [])
