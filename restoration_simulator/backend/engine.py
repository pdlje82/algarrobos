"""Schema-4 planting demonstrator, with frozen replay of prior projects."""

from copy import deepcopy
import json
from pathlib import Path
from . import (
    engine_v3 as core,
    demonstrator as demo,
    planting,
    parcel_removal,
    parcel_removal_legacy,
)

Invalid = core.Invalid
require, number, text, same_json = core.require, core.number, core.text, core.same_json
ROUTES, LAND_KINDS = core.ROUTES, core.LAND_KINDS
route, field, options = core.route, core.field, core.options
parcel_options, payment, advance = (
    parcel_removal.plant_options,
    core.payment,
    core.advance,
)
SCENARIO_PATH = Path(__file__).resolve().parents[1] / "scenarios" / "default.json"


def land_catalog(state):
    return core.land_catalog(parcel_removal.working_state(state))


def land_form(state, route_id, parcel_id="new", agreement_id=None):
    if parcel_id != "new":
        parcel_removal.require_included(state, parcel_id)
    return core.land_form(state, route_id, parcel_id, agreement_id)


def validate_scenario(scenario):
    if isinstance(scenario, dict) and scenario.get("version") == 3:
        return core.validate_scenario(scenario)
    try:
        require(
            isinstance(scenario, dict)
            and type(scenario.get("version")) is int
            and scenario["version"] == 4,
            "Unsupported scenario version.",
        )
        surrogate = deepcopy(scenario)
        surrogate["version"] = 3
        for a in surrogate["actions"]:
            if a["kind"] in demo.KINDS:
                require(
                    a["effects"] == {}, "Demonstrator effects are calculated by Python."
                )
                a.update(kind="advance", effects={})
        core.validate_scenario(surrogate)
        c = scenario["demonstrator_config"]
        require(
            type(c["version"]) is int
            and c["version"] == 1
            and type(c["funding_cap"]) is int
            and c["funding_cap"] == 28000,
            "Unsupported demonstrator configuration.",
        )
        needed = {
            "vegetation_system",
            "plant_mix",
            "objective",
            "planting_method",
            "design",
            "novelty",
            "baseline_method",
            "water_plan",
            "public_participation",
            "dissemination",
            "publication_period",
            "purpose",
            "funding_route",
        }
        require(set(c["choices"]) == needed, "Invalid demonstrator choice catalogue.")
        for rows in c["choices"].values():
            require(
                isinstance(rows, list)
                and 1 <= len(rows) <= 50
                and all(
                    isinstance(r, list) and len(r) == 2 and all(text(v, 500) for v in r)
                    for r in rows
                ),
                "Invalid demonstrator options.",
            )
            require(
                len({r[0] for r in rows}) == len(rows), "Duplicate demonstrator option."
            )
        require(
            isinstance(c["municipalities"], list)
            and 1 <= len(c["municipalities"]) <= 100
            and all(text(v, 200) for v in c["municipalities"]),
            "Invalid municipality catalogue.",
        )
        require(
            isinstance(c["sources"], list)
            and len(c["sources"]) <= 20
            and all(
                text(v["label"], 500)
                and text(v["url"], 1000)
                and v["url"].startswith(("https://", "/api/sources/"))
                for v in c["sources"]
            ),
            "Invalid demonstrator sources.",
        )
        return deepcopy(scenario)
    except (KeyError, TypeError, OverflowError, RecursionError) as exc:
        raise Invalid("Malformed scenario fields.") from exc


def load_scenario():
    return validate_scenario(json.loads(SCENARIO_PATH.read_text(encoding="utf-8")))


def new_project(name, scenario=None, project_id=None):
    scenario = validate_scenario(scenario if scenario is not None else load_scenario())
    if scenario["version"] == 3:
        return core.new_project(name, scenario, project_id)
    # Reuse the stable parcel/cash/undo shape; the version-4 scenario is kept intact.
    surrogate = deepcopy(scenario)
    surrogate["version"] = 3
    for a in surrogate["actions"]:
        if a["kind"] in demo.KINDS:
            a.update(kind="advance", effects={})
    result = core.new_project(name, surrogate, project_id)
    result.update(
        schema_version=4, scenario=scenario, demonstrator=None, demonstrator_origin=None
    )
    return result


def migrate_previous(old, scenario=None):
    old = core.validate_state(old)
    configured = deepcopy(old["scenario"])
    template = load_scenario()
    configured.update(
        version=4, demonstrator_config=deepcopy(template["demonstrator_config"])
    )
    historic = (
        any(h["action_id"] == "demonstrator" for h in old["history"])
        or old["grant"]["status"] != "not_applied"
    )
    legacy_workflow = (
        scenario.get("legacy_workflow", False) if scenario is not None else historic
    )
    require(
        type(legacy_workflow) is bool and (legacy_workflow or not historic),
        "Completed original demonstrators must retain their original workflow.",
    )
    configured["legacy_workflow"] = legacy_workflow
    originals = {a["id"]: a for a in configured["actions"]}
    rows = []
    for action in template["actions"]:
        identity = action["id"]
        if identity in originals and (
            action["kind"] not in demo.KINDS or legacy_workflow
        ):
            a = deepcopy(originals[identity])
            if not legacy_workflow and identity in {"company", "foundation", "expand"}:
                a["requires"] = ["evaluate_demonstrator"]
            rows.append(a)
        else:
            rows.append(deepcopy(action))
    configured["actions"] = rows
    if scenario is not None:
        require(
            same_json(configured, scenario),
            "Migrated scenario does not match its original snapshot.",
        )
    new = new_project(old["name"], configured, old["id"])
    for key in old:
        if key not in {"schema_version", "scenario"}:
            new[key] = deepcopy(old[key])
    new["demonstrator_origin"] = old
    if legacy_workflow:
        new["demonstrator"] = {"legacy": True, "status": "legacy_journey"}
    return new


def availability(state, a, checking=()):
    if state.get("schema_version") == 3:
        return core.availability(state, a, checking)
    if a["kind"] not in demo.KINDS:
        return core.availability(
            state if a["kind"] == "end_access" else parcel_removal.working_state(state),
            a,
            checking,
        )
    if len(state["history"]) >= 500:
        return "unavailable", "The MVP supports at most 500 decisions."
    kind = a["kind"]
    duration, cost = (
        demo.duration_and_cost(state, kind)
        if state["demonstrator"] and not state["demonstrator"].get("legacy")
        else (0, 0)
    )
    if state["time"] + duration > 30 or (
        state["time"] >= 30 and kind not in {"demo_monitor", "demo_evaluate"}
    ):
        return "unavailable", "This action would exceed the 30-year horizon."
    status, reason = demo.availability(state, kind)
    if status == "available" and state["cash"] < cost:
        return "future", "Insufficient available cash for this demonstrator stage."
    return status, reason


def unavailable(state, a):
    return availability(state, a)[1]


def list_actions(state):
    if state.get("schema_version") == 3:
        return core.list_actions(state)
    generic = {
        a["id"]: a for a in core.list_actions(parcel_removal.working_state(state))
    }
    # Ending an existing arrangement remains possible on excluded parcels.
    for a in core.list_actions(state):
        if a["kind"] == "end_access":
            generic[a["id"]] = a
    result = []
    for definition in state["scenario"]["actions"]:
        a = deepcopy(generic[definition["id"]])
        a["status"], a["reason"] = availability(state, a)
        a["available"] = a["status"] == "available"
        if a["kind"] in demo.KINDS:
            a["fields"] = (
                demo.fields(state, a["kind"])
                if a["kind"] == "demo_plan"
                or (state["demonstrator"] and not state["demonstrator"].get("legacy"))
                else []
            )
            a["terms_label"] = (
                "Configure pilot · no planting or spending"
                if a["kind"] == "demo_plan"
                else "Record this stage · inspect costs and timing in preview"
            )
        result.append(a)
    return result


def validate_fields(fields, inputs):
    # Optional references/notes stay empty in saved data. The frozen validator
    # already handles all type/range checks; these fields have optional text.
    prepared = deepcopy(inputs)
    if isinstance(prepared, dict):
        for f in fields:
            if f["name"] in {"reference", "notes"} and prepared.get(f["name"]) == "":
                prepared[f["name"]] = "Not supplied"
    core.validate_fields(fields, prepared)
    quantities = {
        "trees",
        "shrubs",
        "restoration_area",
        "labour_days",
        "installation_years",
        "followup_years",
        "cover_percent",
        "surviving_trees",
        "surviving_shrubs",
    }
    for f in fields:
        v = inputs[f["name"]]
        if f["type"] == "number" and v is not None and f["name"] not in quantities:
            require(
                round(v, 2) == v,
                f["label"] + " supports cents, not fractions of a cent.",
            )


def transition(state, action_id, inputs=None):
    if state.get("schema_version") == 3:
        return core.transition(state, action_id, inputs)
    require(
        state.get("schema_version") == 4,
        "Upgrade the saved project before taking new actions.",
    )
    if action_id == parcel_removal.ACTION:
        raise Invalid(
            "Parcel deletion is an exploration edit, not a simulation action."
        )
    definition = next(
        (a for a in state["scenario"]["actions"] if a["id"] == action_id), None
    )
    require(definition is not None, "Unknown action.")
    status, reason = availability(state, definition)
    require(status == "available", reason)
    if definition["kind"] not in demo.KINDS:
        if isinstance(inputs, dict):
            if inputs.get("parcel_id") not in (None, "new"):
                parcel_removal.require_included(state, inputs["parcel_id"])
            if inputs.get("agreement_id") and definition["kind"] != "end_access":
                agreement = next(
                    (
                        a
                        for a in state["agreements"]
                        if a["id"] == inputs["agreement_id"]
                    ),
                    None,
                )
                if agreement:
                    parcel_removal.require_included(state, agreement["parcel_id"])
        # The frozen transition only uses this discriminator as an entry guard.
        # All version-4-only actions are handled below, never by the old engine.
        temporary = deepcopy(state)
        temporary["schema_version"] = 3
        new, explanation = core.transition(temporary, action_id, inputs)
        new["schema_version"] = 4
        return new, explanation
    inputs = {} if inputs is None else inputs
    kind = definition["kind"]
    # Old v4 histories retain their original aggregate mix and totals. New
    # checklist inputs are validated separately, then Python derives totals.
    checklist = (
        kind == "demo_plan" and isinstance(inputs, dict) and "plant_selection" in inputs
    )
    definitions = demo.fields(state, kind, legacy=kind == "demo_plan" and not checklist)
    if checklist:
        values = {k: v for k, v in inputs.items() if k != "plant_selection"}
        validate_fields(
            [f for f in definitions if f["name"] != "plant_selection"], values
        )
        counts = planting.resolve(inputs["plant_selection"])
        values.update(
            plant_selection=deepcopy(inputs["plant_selection"]),
            plant_mix="selected_species",
            trees=counts["trees"],
            shrubs=counts["shrubs"],
        )
    else:
        validate_fields(definitions, inputs)
        values = inputs
    duration, cost = demo.duration_and_cost(state, kind)
    target = round(state["time"] + duration, 4)
    require(target <= 30, "This action would exceed year 30.")
    new = deepcopy(state)
    events = advance(new, target)
    payment(new, -cost, target, definition["title"])
    explanation = demo.apply(new, kind, values, target, payment)
    if events:
        explanation += " " + " ".join(events)
    receipts = new["payments"][len(state["payments"]) :]
    new["revision"] += 1
    new["history"].append(
        dict(
            action_id=action_id,
            title=definition["title"],
            inputs=deepcopy(inputs),
            area_unit="m2",
            start=state["time"],
            end=target,
            cost=round(
                sum(-p["cash_change"] for p in receipts if p["cash_change"] < 0), 2
            ),
            cash_change=round(new["cash"] - state["cash"], 2),
            explanation=explanation,
            payments=deepcopy(receipts),
            events=events,
        )
    )
    return new, explanation


def validate_state(state):
    if isinstance(state, dict) and state.get("schema_version") in (1, 2, 3):
        return migrate_previous(state)
    try:
        require(
            isinstance(state, dict)
            and type(state.get("schema_version")) is int
            and state["schema_version"] == 4
            and state.get("area_unit") == "m2",
            "Unsupported save schema.",
        )
        require(
            text(state.get("id"), 80) and text(state.get("name"), 80),
            "Invalid project identity.",
        )
        require(
            type(state.get("revision")) is int and 0 <= state["revision"] <= 1000000000,
            "Invalid revision.",
        )
        require(
            number(state.get("time"), 0, 30) and number(state.get("cash")),
            "Invalid time/cash.",
        )
        require(
            isinstance(state.get("history"), list) and len(state["history"]) <= 500,
            "Invalid history.",
        )
        scenario = validate_scenario(state["scenario"])
        replay = (
            migrate_previous(state["demonstrator_origin"], scenario)
            if state.get("demonstrator_origin") is not None
            else new_project(state["name"], scenario, state["id"])
        )
        baseline = len(replay["history"])
        require(
            same_json(replay["history"], state["history"][:baseline]),
            "Original history was changed.",
        )
        for h in state["history"][baseline:]:
            replay, _ = (
                parcel_removal_legacy.transition(replay, h["inputs"])
                if h["action_id"] == parcel_removal.ACTION
                else transition(replay, h["action_id"], h["inputs"])
            )
            require(
                same_json(replay["history"][-1], h),
                "History does not match configured results.",
            )
        replay["revision"] = state["revision"]
        require(
            same_json(replay, state),
            "Saved state does not match its history or field types.",
        )
        return deepcopy(state)
    except (KeyError, TypeError, OverflowError, RecursionError) as exc:
        raise Invalid("Malformed saved fields.") from exc


def summary(state):
    if state.get("schema_version") == 3:
        return core.summary(state)
    prepared = {
        **state,
        "parcels": [
            p for p in state["parcels"] if p.get("scenario_status") != "removed"
        ],
        "grant": {
            **state["grant"],
            "status": "not_applied"
            if state["grant"]["status"] == "declined"
            else state["grant"]["status"],
        },
    }
    result = core.summary(prepared)
    result["parcel_records"] = len(prepared["parcels"])
    if any(p.get("scenario_status") == "excluded" for p in state["parcels"]):
        result["asset_explanation"] += (
            " Excluded parcels retain ownership, access and existing costs, but cannot be selected for new planting or land arrangements."
        )
    if state["grant"]["status"] == "declined":
        result["grant_explanation"] = (
            "Application declined. No funding received; revise the uninstalled plan to choose other financing."
        )
    elif state["grant"]["status"] == "awarded":
        result["grant_explanation"] = (
            "Award recorded, reimbursement not received. Planting and follow-up must be paid from available cash first."
        )
    elif state["grant"]["status"] == "paid" and "received_amount" in state["grant"]:
        result["grant_explanation"] = (
            f"Reimbursement recorded: €{state['grant']['received_amount']:,.2f} of a €{state['grant']['amount']:,.2f} award. This playtest records one payment only."
        )
    result["pending"] = (
        f"{sum(a['status'] == 'pending' for a in state['agreements'])} land proposals pending. "
        + result["grant_explanation"]
    )
    result["asset_explanation"] += (
        " Installed work area is separate from observed plant establishment or verified ecological recovery."
    )
    if state["demonstrator_origin"] is not None:
        result["migration_notice"] = (
            "Upgraded to the guided demonstrator: original history, cash, land, measurements and prior grant stages are retained. Earlier demonstrators are not relabelled as AL20 projects."
        )
    result["demonstrator"] = demo.view(state)
    return result


def preview(state, action_id, inputs):
    if state.get("schema_version") == 3:
        return core.preview(state, action_id, inputs)
    new, explanation = transition(state, action_id, inputs)
    h = new["history"][-1]
    return dict(
        revision=state["revision"],
        explanation=explanation,
        cost=h["cost"],
        cash_change=h["cash_change"],
        duration=round(h["end"] - h["start"], 4),
        end_year=new["time"],
        area_unit="m2",
        recorded_ownership=inputs.get("route_id") == "existing",
        cash_after=new["cash"],
        payments=h["payments"],
        events=h["events"],
        agreements=[a for a in new["agreements"] if a not in state["agreements"]],
        timeline_agreements=new["agreements"],
        obligations=new["obligations"],
        summary=summary(new),
        parties=new["parties"],
        parcels=new["parcels"],
        demonstrator=demo.view(new),
    )
