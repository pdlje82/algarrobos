"""Frozen validation/replay of earlier v4 soft deletions; never a new UI action."""

from copy import deepcopy
from . import engine_v3 as core

ACTION = "remove_parcel"


def working_state(state):
    """Only parcels still included may be selected for new work/arrangements."""
    allowed = {p["id"] for p in state["parcels"] if not p.get("scenario_status")}
    return {
        **state,
        "parcels": [p for p in state["parcels"] if p["id"] in allowed],
        "agreements": [a for a in state["agreements"] if a["parcel_id"] in allowed],
    }


def plant_options(state, area, duration=0):
    return core.parcel_options(working_state(state), area, duration)


def require_included(state, parcel_id):
    p = next((p for p in state["parcels"] if p["id"] == parcel_id), None)
    core.require(
        p is not None and not p.get("scenario_status"),
        "This parcel is removed or excluded from new work. Undo its removal to restore it.",
    )


def plan(state, parcel_id):
    core.require(
        state.get("schema_version") == 4, "Upgrade the project before removing parcels."
    )
    core.require(len(state["history"]) < 500, "The MVP supports at most 500 decisions.")
    require_included(state, parcel_id)
    p = next(p for p in state["parcels"] if p["id"] == parcel_id)
    agreements = [a for a in state["agreements"] if a["parcel_id"] == parcel_id]
    ids = {a["id"] for a in agreements}
    obligations = [o for o in state["obligations"] if o["agreement_id"] in ids]
    payments = [x for x in state["payments"] if x["agreement_id"] in ids]
    work = [a for a in state["activities"] if a["parcel_id"] == parcel_id]
    d = state.get("demonstrator")
    attached = bool(d and not d.get("legacy") and d["plan"]["parcel_id"] == parcel_id)
    pilot, funding_history = None, False
    for h in state["history"]:
        if h["action_id"] == "demonstrator":
            pilot = h["inputs"].get("parcel_id")
        if pilot == parcel_id and h["action_id"] in {
            "apply_grant",
            "award_grant",
            "receive_payment",
        }:
            funding_history = True
    if attached and state["grant"]["status"] != "not_applied":
        funding_history = True
    reasons = []
    if work:
        reasons.append(f"{len(work)} completed work record(s) belong to this parcel.")
    if payments or p.get("acquisition_cost", 0):
        reasons.append(
            "Past land payments or acquisition expenditure must remain in the record."
        )
    if funding_history:
        reasons.append(
            "A funding application or decision has been recorded for this parcel."
        )
    mode = "exclude" if reasons else "remove"
    maintenance = round(
        sum(
            max(0, o["end"] - o["last_paid"]) * o["annual_amount"] for o in obligations
        ),
        2,
    )
    # Reuse the existing rent forecast without attributing another parcel's costs.
    costs = core.summary(
        {
            **state,
            "agreements": agreements,
            "obligations": obligations,
            "grant": {"status": "not_applied", "amount": 0},
        }
    )
    return dict(
        parcel_id=parcel_id,
        name=p["name"],
        area=p["area"],
        mode=mode,
        title="Exclude from future work"
        if mode == "exclude"
        else "Remove parcel from scenario",
        reasons=reasons,
        plan_removed=attached and mode == "remove",
        plan_retained=attached and mode == "exclude",
        agreements_affected=len(agreements),
        maintenance=maintenance,
        access_fees=costs["future_rent_to_horizon"],
        access_fees_after_horizon=costs["future_rent_after_horizon"],
        commitments="retained" if mode == "exclude" else "cancelled",
        cash_change=0,
        duration=0,
        explanation=(
            "New planting, expansion and new land arrangements will be blocked. Ownership, existing access, past payments, completed work and funding records remain. Existing monitoring, evaluation and funding close-out records remain available; scheduled access and maintenance costs continue."
            if mode == "exclude"
            else "This parcel and its arrangements will leave the current scenario. Future access and maintenance costs for it will be cancelled. Its addition and this removal remain in action history."
        ),
        ownership_notice="This changes the simulation only. It does not represent selling land, transferring ownership or terminating a real agreement. No cash is refunded or received.",
        undo_notice="Undo last action restores the parcel and all affected plans and commitments, until another action is committed.",
    )


def transition(state, inputs):
    core.require(
        isinstance(inputs, dict)
        and set(inputs) == {"parcel_id", "mode", "confirm"}
        and core.text(inputs["parcel_id"], 80)
        and inputs["confirm"] is True,
        "Review and confirm the parcel removal first.",
    )
    impact = plan(state, inputs["parcel_id"])
    core.require(
        inputs["mode"] == impact["mode"],
        "Parcel dependencies changed. Review its removal again.",
    )
    new = deepcopy(state)
    p = next(p for p in new["parcels"] if p["id"] == inputs["parcel_id"])
    p.update(
        scenario_status="excluded" if impact["mode"] == "exclude" else "removed",
        scenario_changed_year=state["time"],
    )
    if impact["mode"] == "remove":
        ids = set()
        for a in new["agreements"]:
            if a["parcel_id"] != p["id"]:
                continue
            ids.add(a["id"])
            if a["status"] == "active":
                a["periods"][-1]["end"] = state["time"]
                a["end"] = state["time"]
            if a["status"] in {"active", "pending"}:
                a["status"] = "ended"
        for o in new["obligations"]:
            if o["agreement_id"] in ids:
                o.update(
                    scenario_original_end=o["end"],
                    end=o["last_paid"],
                    status="completed",
                    scenario_cancelled_year=state["time"],
                )
        if impact["plan_removed"]:
            new["demonstrator"] = None
            new["grant"] = dict(status="not_applied", amount=0)
    explanation = f"{impact['title']}: {p['name']}. {impact['explanation']} {impact['ownership_notice']}"
    if impact["plan_removed"]:
        explanation += " The uninstalled demonstrator plan, baseline and preliminary feedback were removed from current state; their history remains."
    new["revision"] += 1
    new["history"].append(
        dict(
            action_id=ACTION,
            title=impact["title"],
            inputs=deepcopy(inputs),
            area_unit="m2",
            start=state["time"],
            end=state["time"],
            cost=0,
            cash_change=0,
            explanation=explanation,
            payments=[],
            events=[],
        )
    )
    return new, explanation
