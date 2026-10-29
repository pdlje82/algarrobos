"""Remove committed demonstrator choices, keeping independent land and drafts."""
from .engine import require
from .parcel_removal import rebuild


def result(state):
    require(state["schema_version"] == 4, "Upgrade the project before removing its demonstrator.")
    require(state["demonstrator"] is not None, "There is no committed demonstrator to remove.")
    require(not state["demonstrator"]["legacy"], "This earlier workflow retains its frozen history and cannot be removed independently. Start a new project to use the guided demonstrator workflow.")
    rebuilt, removed, missing = rebuild(state, [], remove_demonstrator=True)
    require(rebuilt["demonstrator"] is None, "The demonstrator could not be removed from this project's history.")
    return rebuilt, removed, missing


def plan(state):
    rebuilt, removed, missing = result(state)
    d = state["demonstrator"]
    name = next(p["name"] for p in state["parcels"] if p["id"] == d["plan"]["parcel_id"])
    blocked = None if not missing else "Removing this demonstrator would also remove dependent land records: " + ", ".join(p["name"] for p in missing) + ". Resolve those dependent choices first; parcels will not be removed by this button."
    return {"title": "Remove demonstrator", "name": name, "can_remove": not missing, "blocked_reason": blocked,
            "removed_actions": removed, "remaining_actions": len(rebuilt["history"]), "remaining_parcels": len(rebuilt["parcels"]),
            "cash_before": state["cash"], "cash_after": rebuilt["cash"], "cash_change": round(rebuilt["cash"] - state["cash"], 2),
            "year_before": state["time"], "year_after": rebuilt["time"],
            "explanation": "Remove the committed demonstrator and its dependent baseline, planting, funding and observation records from the simulation. Rebuild cash and time from the remaining choices; no removal event is added to history.",
            "undo_notice": "Undo deletion restores the committed records until another simulation change is saved. Saved site designs and an existing planning draft are kept. The deletion undo buffer is not included in JSON exports."}


def delete(state):
    rebuilt, _, missing = result(state)
    require(not missing, "The demonstrator cannot be removed while land records depend on it. Review the removal preview and resolve those choices first.")
    return rebuilt
