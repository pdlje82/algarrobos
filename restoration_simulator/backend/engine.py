"""Deterministic schema-2 simulator; contracts are explicit fictional assumptions."""

from copy import deepcopy
import json
from pathlib import Path
from uuid import uuid4
from . import legacy

Invalid = legacy.Invalid
require, number, text, same_json = (
    legacy.require,
    legacy.number,
    legacy.text,
    legacy.same_json,
)
SCENARIO_PATH = Path(__file__).resolve().parents[1] / "scenarios" / "default.json"
LAND_KINDS = {"land_access", "activate_access", "renew_access", "end_access"}
ROUTES = {
    "stewardship",
    "free_use",
    "lease",
    "usufruct",
    "public_management",
    "donation",
    "purchase",
    "existing",
}
PARTIES = [
    dict(id="individual", name="Individual", kind="individual"),
    dict(id="third-party", name="Third-party landowner", kind="private"),
    dict(id="municipality", name="Fictional municipality", kind="public"),
    dict(id="partner", name="Existing nonprofit partner", kind="nonprofit"),
]


def validate_scenario(scenario):
    try:
        require(
            isinstance(scenario, dict)
            and type(scenario.get("version")) is int
            and scenario["version"] == 2,
            "Unsupported scenario version.",
        )
        surrogate = deepcopy(scenario)
        surrogate["version"] = 1
        for a in surrogate.get("actions", []):
            if a.get("kind") in LAND_KINDS:
                require(a["effects"] == {}, "Land effects belong in route definitions.")
                a["kind"] = "advance"
        legacy.validate_scenario(surrogate)
        routes = scenario.get("land_routes")
        require(
            isinstance(routes, list)
            and len(routes) == 8
            and {r["id"] for r in routes} == ROUTES,
            "Invalid land route IDs.",
        )
        for r in routes:
            require(
                all(
                    text(r.get(k))
                    for k in (
                        "title",
                        "spanish",
                        "description",
                        "caveat",
                        "source",
                        "source_id",
                    )
                ),
                "Invalid route wording.",
            )
            require(
                type(r.get("ownership")) is bool
                and r["ownership"] == (r["id"] in {"purchase", "donation", "existing"}),
                "Invalid ownership effect.",
            )
            require(number(r.get("duration"), 0.1, 5), "Invalid setup duration.")
            for k in ("upfront", "annual_payment", "deposit", "annual_maintenance"):
                require(number(r.get(k), 0, 1000000), f"Invalid route parameter: {k}.")
            require(
                (r.get("term_years") is None)
                if r["ownership"]
                else type(r.get("term_years")) is int and 1 <= r["term_years"] <= 60,
                "Invalid access term.",
            )
            require(
                type(r.get("commitment_years")) is int
                and 0 <= r["commitment_years"] <= 60,
                "Invalid commitment term.",
            )
            require(
                r.get("holder_id") in {"individual", "partner"}
                and r.get("owner_id") in {p["id"] for p in PARTIES},
                "Invalid default parties.",
            )
        return deepcopy(scenario)
    except (KeyError, TypeError, OverflowError, RecursionError) as exc:
        raise Invalid("Malformed scenario fields.") from exc


def load_scenario():
    return validate_scenario(json.loads(SCENARIO_PATH.read_text(encoding="utf-8")))


def new_project(name, scenario=None, project_id=None):
    require(text(name, 80), "Enter a project name of 1–80 characters.")
    scenario = validate_scenario(scenario if scenario is not None else load_scenario())
    return dict(
        schema_version=2,
        id=project_id or str(uuid4()),
        name=name.strip(),
        scenario=scenario,
        revision=0,
        time=0,
        cash=scenario["initial_cash"],
        parcels=[],
        activities=[],
        organizations=[],
        parties=deepcopy(PARTIES),
        agreements=[],
        obligations=[],
        payments=[],
        legacy_origin=None,
        grant=dict(status="not_applied", amount=0),
        history=[],
    )


def migrate_legacy(old, scenario=None):
    old = legacy.validate_state(old)
    configured = deepcopy(scenario) if scenario is not None else load_scenario()
    if scenario is None:
        configured["initial_cash"] = old["scenario"]["initial_cash"]
        old_actions = {a["id"]: a for a in old["scenario"]["actions"]}
        for i, a in enumerate(configured["actions"]):
            if a["id"] in old_actions:
                configured["actions"][i] = deepcopy(old_actions[a["id"]])
    new = new_project(old["name"], configured, old["id"])
    for k in (
        "revision",
        "time",
        "cash",
        "activities",
        "organizations",
        "grant",
        "history",
    ):
        new[k] = deepcopy(old[k])
    new["legacy_origin"] = old
    for org in old["organizations"]:
        new["parties"].append(
            dict(
                id=org.lower(),
                name=org,
                kind="nonprofit" if org == "Foundation" else "company",
            )
        )
    for p in old["parcels"]:
        owned, start = p["owner"] == "Individual", p["year"]
        parcel = dict(
            **deepcopy(p),
            owner_id="individual" if owned else "third-party",
            location="Unspecified legacy parcel",
            cadastral_reference="",
            current_use="Unspecified",
            restrictions="Legacy access assumption.",
            physical_access="yes",
        )
        new["parcels"].append(parcel)
        end = None if owned else 30
        new["agreements"].append(
            dict(
                id=f"agreement-{len(new['agreements']) + 1}",
                parcel_id=p["id"],
                route_id="existing" if owned else "free_use",
                status="active" if owned or old["time"] < 30 else "expired",
                owner_id=parcel["owner_id"],
                holder_id="individual",
                operator_id="individual",
                covered_area=p["area"],
                start=start,
                end=end,
                periods=[dict(start=start, end=end)],
                upfront=p["acquisition_cost"],
                annual_payment=0,
                deposit=0,
                deposit_held=0,
                annual_maintenance=0,
                commitment_years=0,
                term_years=None if owned else round(30 - start, 4),
                next_rent_due=round(start + 1, 4),
                allow_restoration="yes",
                allow_monitoring="yes",
                allow_public="unknown",
                physical_access="yes",
                permits="assumed_clear",
                evidence="legacy_assumption",
                instrument="Original MVP assumption",
                exit_terms="No retroactive charges. Temporary legacy access ends at year 30.",
                source="Schema-1 snapshot",
                renewals=0,
            )
        )
    return new


def party_name(state, identity):
    return next(p["name"] for p in state["parties"] if p["id"] == identity)


def route(state, identity):
    r = next((r for r in state["scenario"]["land_routes"] if r["id"] == identity), None)
    require(r is not None, "Unknown land-access route.")
    return r


def field(name, label, type="text", default="", **extra):
    return dict(name=name, label=label, type=type, default=default, **extra)


def options(rows):
    return [dict(value=a, label=b) for a, b in rows]


def land_catalog(state):
    rows = deepcopy(state["scenario"]["land_routes"])
    for r in rows:
        r["available"] = round(state["time"] + r["duration"], 4) <= 30
        r["reason"] = None if r["available"] else "Setup would finish beyond year 30."
        r["ownership_label"] = (
            "Existing ownership retained"
            if r["id"] == "existing"
            else "Ownership transfers on completion"
            if r["ownership"]
            else "Owner retains ownership"
        )
        r["term_label"] = (
            "No configured expiry"
            if r["ownership"]
            else f"{r['term_years']} years (editable assumption)"
        )
        r["annual_label"] = "Not applicable (ownership)" if r["ownership"] else f"€{r['annual_payment']:,.2f} / year"
    return dict(
        routes=rows,
        targets=options(
            [("new", "New candidate parcel")]
            + [(p["id"], p["name"]) for p in state["parcels"]]
        ),
        notice="Source documents explain the routes; they do not verify actual rights or grant eligibility. All configured terms are fictional.",
    )


def land_form(state, route_id, parcel_id="new", agreement_id=None):
    r = route(state, route_id)
    a = (
        next((a for a in state["agreements"] if a["id"] == agreement_id), None)
        if agreement_id
        else None
    )
    if agreement_id:
        require(
            a is not None and a["status"] == "pending", "Select a pending proposal."
        )
        require(
            a["route_id"] == route_id and a["parcel_id"] == parcel_id,
            "Proposal, parcel and route do not match.",
        )
    p = next((p for p in state["parcels"] if p["id"] == parcel_id), None)
    require(parcel_id == "new" or p is not None, "Unknown parcel.")
    fields = []
    if parcel_id == "new":
        fields += [
            field(
                "parcel_name",
                "Parcel name",
                default=f"Parcel {len(state['parcels']) + 1}",
                maxLength=80,
            ),
            field(
                "parcel_area", "Total parcel area (ha)", "number", 2, min=0.1, max=10000
            ),
            field(
                "location",
                "Location / site description",
                default="Fictional dryland site",
                maxLength=200,
            ),
            field(
                "cadastral_reference",
                "Cadastral reference (optional; unverified)",
                maxLength=100,
            ),
            field(
                "current_use",
                "Current land use",
                default="Dryland / scrub mosaic",
                maxLength=200,
            ),
            field(
                "restrictions",
                "Known restrictions or unresolved site questions",
                "textarea",
                "Protected status and site-specific permits not independently verified.",
                maxLength=1000,
            ),
            field(
                "owner_id",
                "Current owner / seller / donor",
                "select",
                r["owner_id"],
                options=options([(x["id"], x["name"]) for x in state["parties"]]),
            ),
        ]
    holders = (
        [x for x in state["parties"] if x["kind"] == "nonprofit"]
        if route_id == "stewardship"
        else [
            x
            for x in state["parties"]
            if x["id"] not in {"third-party", "municipality"}
        ]
    )
    fields += [
        field(
            "holder_id",
            "Rights holder / buyer / recipient",
            "select",
            r["holder_id"],
            options=options([(x["id"], x["name"]) for x in holders]),
        ),
        field(
            "operator_id",
            "Restoration operator / manager",
            "select",
            r["holder_id"],
            options=options(
                [
                    (x["id"], x["name"])
                    for x in state["parties"]
                    if x["id"] not in {"third-party", "municipality"}
                ]
            ),
        ),
        field(
            "covered_area",
            "Area covered by this arrangement (ha)",
            "number",
            p["area"] if p else 2,
            min=0.1,
            max=p["area"] if p else 10000,
        ),
        field(
            "stage",
            "Agreement status in this scenario",
            "select",
            "active",
            options=options(
                [
                    ("active", "Assume concluded / approved (fictional)"),
                    ("pending", "Proposal only — no access or transfer yet"),
                ]
            ),
        ),
        field(
            "upfront",
            "One-off price / formalisation expenditure (€)",
            "number",
            r["upfront"],
            min=0,
            max=1000000,
            unknown_allowed=True,
        ),
        field(
            "annual_payment",
            "Annual rent / access fee (€; paid in advance)",
            "number",
            r["annual_payment"],
            min=0,
            max=1000000,
            unknown_allowed=True,
        ),
        field(
            "deposit",
            "Refundable deposit (€)",
            "number",
            r["deposit"],
            min=0,
            max=1000000,
            unknown_allowed=True,
        ),
    ]
    if not r["ownership"]:
        fields.append(
            field(
                "term_years",
                "Access duration (whole years)",
                "number",
                r["term_years"],
                min=1,
                max=60,
                step=1,
                unknown_allowed=True,
            )
        )
    fields += [
        field(
            "annual_maintenance",
            "Annual maintenance / monitoring budget (€; paid in arrears)",
            "number",
            r["annual_maintenance"],
            min=0,
            max=1000000,
            unknown_allowed=True,
        ),
        field(
            "commitment_years",
            "Maintenance commitment after access starts (years; may outlast access)",
            "number",
            r["commitment_years"],
            min=0,
            max=60,
            step=1,
            unknown_allowed=True,
        ),
    ]
    yes_no = options(
        [
            ("yes", "Yes — explicit scenario assumption"),
            ("no", "No"),
            ("unknown", "Unknown / needs confirmation"),
        ]
    )
    for key, label, default in [
        ("allow_restoration", "Permission for planting and soil works", "yes"),
        ("allow_monitoring", "Permission for monitoring / installations", "yes"),
        ("allow_public", "Permission for public visits", "unknown"),
        ("physical_access", "Physical access to the site", "yes"),
    ]:
        fields.append(field(key, label, "select", default, options=yes_no))
    fields += [
        field(
            "permits",
            "Site-specific permissions / protected-area review",
            "select",
            "assumed_clear",
            options=options(
                [
                    ("assumed_clear", "Assume sufficient for the fictional works"),
                    ("pending", "Pending verification"),
                    ("restricted", "Known restriction — restoration not allowed"),
                ]
            ),
        ),
        field(
            "evidence",
            "Basis of this record (not legal verification)",
            "select",
            "assumed",
            options=options(
                [
                    ("assumed", "Fictional scenario assumption"),
                    ("user_supplied", "User-supplied information — unverified"),
                    ("unverified", "Unresolved / not verified"),
                ]
            ),
        ),
        field(
            "instrument",
            "Underlying agreement / authorising instrument",
            default=r["title"] + " — illustrative terms",
            maxLength=500,
        ),
        field(
            "exit_terms",
            "Exit / handover notes (descriptive only)",
            "textarea",
            "No automatic renewal. Explicit renewal/end action; held deposit returned in full. No assumed tax benefit or grant entitlement.",
            maxLength=1000,
            help="Notes do not execute rules. This prototype always returns held deposits in full and requires explicit renewal; it does not model notice disputes, penalties or taxes.",
        ),
    ]
    for f in fields:
        f['hidden'] = (f['name'] == 'annual_payment' and (r['ownership'] or route_id == 'free_use')) or (f['name'] == 'deposit' and r['ownership']) or (f['name'] == 'upfront' and route_id == 'existing')
    if a:
        for f in fields:
            if f["name"] in a:
                f["default"] = a[f["name"]]
            if f["name"] == "stage":
                f["default"] = "active"
            if f["name"] == "physical_access":
                f["default"] = a["physical_access"]
    return dict(
        fields=fields,
        route_id=route_id,
        parcel_id=parcel_id,
        agreement_id=agreement_id,
        source=r["source"],
        source_url="/api/sources/" + r["source_id"],
        caveat=r["caveat"],
        notes=[
            "Terms are editable fictional assumptions, not market prices or legal conclusions.",
            "Blank amounts mean Unknown. Proposals may retain unknowns; active access requires calculable terms.",
            "One active arrangement per parcel; covered area is one assumed footprint. No GIS boundary verification.",
            "Rent is annual in advance; maintenance is annual in arrears and may continue after access ends.",
            "An existing nonprofit partner is available. Creating an organisation never transfers land.",
        ],
    )


def validate_fields(fields, inputs, extra=()):
    require(
        isinstance(inputs, dict)
        and set(inputs) == {f["name"] for f in fields} | set(extra),
        "Provide exactly the fields shown for this action.",
    )
    for f in fields:
        v = inputs[f["name"]]
        if f["type"] == "number":
            if v is None and f.get("unknown_allowed"):
                continue
            require(
                number(v, f.get("min", 0), f.get("max", 1000000)),
                "Invalid value for " + f["label"] + ".",
            )
            if f["name"] in {
                "upfront",
                "annual_payment",
                "deposit",
                "annual_maintenance",
            }:
                require(
                    round(v, 2) == v,
                    f["label"] + " supports cents, not fractions of a cent.",
                )
            if f.get("step") == 1:
                require(float(v).is_integer(), f["label"] + " must be a whole number.")
        elif f["type"] == "select":
            require(
                isinstance(v, str) and v in [o["value"] for o in f["options"]],
                "Invalid choice for " + f["label"] + ".",
            )
        else:
            require(
                isinstance(v, str) and len(v) <= f.get("maxLength", 1000),
                "Invalid text for " + f["label"] + ".",
            )
            if f["name"] not in {"cadastral_reference", "restrictions"}:
                require(bool(v.strip()), f["label"] + " is required.")


def parcel_options(state, area, duration=0):
    result = []
    for p in state["parcels"]:
        a = next(
            (
                a
                for a in state["agreements"]
                if a["parcel_id"] == p["id"] and a["status"] == "active"
            ),
            None,
        )
        if (
            not a
            or a["allow_restoration"] != "yes"
            or a["permits"] != "assumed_clear"
            or p["physical_access"] != "yes"
        ):
            continue
        if a["end"] is not None and round(state["time"] + duration, 4) > a["end"]:
            continue
        remaining = round(
            a["covered_area"]
            - sum(x["area"] for x in state["activities"] if x["parcel_id"] == p["id"]),
            4,
        )
        if remaining >= area:
            result.append(
                dict(
                    value=p["id"],
                    label=f"{p['name']} · {a['route_id']}",
                    remaining_area=remaining,
                )
            )
    return result


def availability(state, a, checking=()):
    completed = {h["action_id"] for h in state["history"]}
    if not a["repeatable"] and a["id"] in completed:
        return "completed", "Already completed."
    if state["time"] >= 30:
        return (
            "unavailable",
            "The 30-year horizon is complete. Undo to revisit the last decision.",
        )
    if len(state["history"]) >= 500:
        return "unavailable", "The MVP supports at most 500 decisions."
    if round(state["time"] + a["duration"], 4) > 30:
        return "unavailable", "This action would finish beyond year 30."
    missing = [x for x in a["requires"] if x not in completed]
    definitions = {x["id"]: x for x in state["scenario"]["actions"]}
    for x in missing:
        if (
            x not in (*checking, a["id"])
            and availability(state, definitions[x], (*checking, a["id"]))[0]
            == "unavailable"
        ):
            return (
                "unavailable",
                "Required decision is no longer available: "
                + definitions[x]["title"]
                + ".",
            )
    if missing:
        return "future", "First complete: " + ", ".join(
            definitions[x]["title"] for x in missing
        ) + "."
    kind = a["kind"]
    if kind in {"restore", "restore_start"} and not parcel_options(
        state, a["effects"]["area"], a["duration"]
    ):
        return (
            "future",
            "Needs enough unrestored area, scenario permissions and access lasting through the work. Establish, finalise or renew access.",
        )
    if kind == "activate_access" and not any(
        x["status"] == "pending" for x in state["agreements"]
    ):
        return "future", "First record a land proposal."
    if kind == "renew_access" and not any(
        x["status"] in {"active", "expired"} and x["end"] is not None
        for x in state["agreements"]
    ):
        return "future", "First establish temporary access."
    if kind == "end_access" and not any(
        x["status"] in {"active", "pending"} for x in state["agreements"]
    ):
        return "future", "No active or pending arrangement to end."
    if (
        kind == "organization"
        and a["effects"]["organization"] in state["organizations"]
    ):
        return "completed", "This organisation already exists."
    expected = {
        "grant_apply": "not_applied",
        "grant_award": "applied",
        "grant_pay": "awarded",
    }
    if kind in expected and state["grant"]["status"] != expected[kind]:
        return "unavailable", "Grant stage unavailable; an award can be paid only once."
    if state["cash"] < a["cost"]:
        return "future", "Insufficient available cash."
    return "available", None


def unavailable(state, a):
    return availability(state, a)[1]


def list_actions(state):
    result = []
    for definition in state["scenario"]["actions"]:
        a = deepcopy(definition)
        a["status"], a["reason"] = availability(state, a)
        a["available"], a["fields"] = a["status"] == "available", []
        kind = a["kind"]
        if kind in {"land_access", "activate_access"}:
            a["terms_label"] = "Choose terms · costs and duration shown in preview"
        elif kind == "advance":
            a["terms_label"] = "Choose year · scheduled payments shown in preview"
        if kind == "advance":
            a["fields"] = [
                field(
                    "target_year",
                    "Advance to year",
                    "number",
                    30,
                    min=round(state["time"] + 0.0001, 4),
                    max=30,
                )
            ]
        elif kind in {"restore", "restore_start"}:
            opts = parcel_options(state, a["effects"]["area"], a["duration"])
            a["fields"] = [
                field(
                    "parcel_id",
                    "Restoration parcel",
                    "select",
                    opts[0]["value"] if opts else "",
                    options=opts,
                )
            ]
        elif kind in {"activate_access", "renew_access", "end_access"}:
            eligible = [
                x
                for x in state["agreements"]
                if (
                    x["status"] == "pending"
                    if kind == "activate_access"
                    else x["status"] in {"active", "expired"} and x["end"] is not None
                    if kind == "renew_access"
                    else x["status"] in {"active", "pending"}
                )
            ]
            opts = options(
                [
                    (x["id"], f"{x['id']} · {x['route_id']} · {x['status']}")
                    for x in eligible
                ]
            )
            a["fields"] = [
                field(
                    "agreement_id",
                    "Agreement",
                    "select",
                    opts[0]["value"] if opts else "",
                    options=opts,
                )
            ]
            if kind == "renew_access":
                a["fields"] += [
                    field(
                        "term_years",
                        "Extend access by whole years",
                        "number",
                        5,
                        min=1,
                        max=60,
                        step=1,
                    ),
                    field(
                        "commitment_years",
                        "Maintenance coverage from now (years)",
                        "number",
                        5,
                        min=0,
                        max=60,
                        step=1,
                    ),
                ]
        result.append(a)
    return result


def payment(state, amount, at, kind, agreement_id=None):
    require(number(abs(amount)), "Invalid payment amount.")
    require(
        state["cash"] + amount >= 0,
        f"Insufficient cash for {kind} at year {at}. Choose an earlier advance, obtain funds or reduce future access commitments before payments fall due.",
    )
    state["cash"] = round(state["cash"] + amount, 2)
    if amount:
        state["payments"].append(
            dict(
                id=f"payment-{len(state['payments']) + 1}",
                year=at,
                kind=kind,
                agreement_id=agreement_id,
                cash_change=round(amount, 2),
            )
        )


def advance(state, target):
    events = []
    for a in state["agreements"]:
        if a["status"] != "active":
            continue
        if a["end"] is not None and a["end"] <= target:
            events.append((a["end"], 0, a["id"], "expiry"))
        due = a["next_rent_due"]
        while due <= target and (a["end"] is None or due < a["end"]):
            events.append((due, 1, a["id"], "rent"))
            due = round(due + 1, 4)
    for o in state["obligations"]:
        last = o["last_paid"]
        while last < o["end"]:
            due = round(min(last + 1, o["end"]), 4)
            if due > target:
                break
            events.append((due, 2, o["id"], "maintenance"))
            last = due
    notes = []
    for at, _, identity, kind in sorted(events):
        if kind == "maintenance":
            o = next(x for x in state["obligations"] if x["id"] == identity)
            payment(
                state,
                -round(o["annual_amount"] * (at - o["last_paid"]), 2),
                at,
                "Maintenance / monitoring",
                o["agreement_id"],
            )
            o["last_paid"] = at
            o["next_due"] = (
                round(min(at + 1, o["end"]), 4) if at < o["end"] else round(at + 1, 4)
            )
        else:
            a = next(x for x in state["agreements"] if x["id"] == identity)
            if kind == "expiry":
                a["status"] = "expired"
                payment(state, a["deposit_held"], at, "Deposit returned", a["id"])
                a["deposit_held"] = 0
                notes.append(
                    f"{a['id']} expired at year {at}; ownership and restoration history remain."
                )
            else:
                payment(
                    state, -a["annual_payment"], at, "Annual rent / access fee", a["id"]
                )
                a["next_rent_due"] = round(at + 1, 4)
    for o in state["obligations"]:
        o["status"] = "completed" if o["end"] <= target else "active"
    state["time"] = target
    return notes


def activate(state, a, at):
    r = route(state, a["route_id"])
    require(
        all(
            a.get(k) is not None
            for k in (
                "upfront",
                "annual_payment",
                "deposit",
                "annual_maintenance",
                "commitment_years",
            )
        )
        and (r["ownership"] or a.get("term_years") is not None),
        "Active access needs known amounts and duration. Keep unknown terms as a proposal.",
    )
    require(
        not any(
            x["id"] != a["id"]
            and x["parcel_id"] == a["parcel_id"]
            and x["status"] == "active"
            for x in state["agreements"]
        ),
        "This parcel already has active access. Renew or end it first; area cannot be counted twice.",
    )
    p = next(p for p in state["parcels"] if p["id"] == a["parcel_id"])
    require(
        a["owner_id"] == p["owner_id"],
        "The parcel owner changed after this proposal. Record a new proposal with the current owner.",
    )
    if a["route_id"] == "public_management":
        require(
            p["owner_id"] == "municipality",
            "This fictional route requires a public owner.",
        )
    if a["route_id"] == "existing":
        require(
            p["owner_id"] == a["holder_id"],
            "Existing ownership must match the named owner.",
        )
    if a["route_id"] == "existing":
        require(
            a["upfront"] == 0,
            "Recording existing ownership has no acquisition expenditure in this fixture.",
        )
    if a["route_id"] == "free_use":
        require(
            a["annual_payment"] == 0,
            "The free-use scenario has no rent. Use the lease route for recurring access payments.",
        )
    if a["route_id"] == "lease":
        require(
            a["annual_payment"] > 0,
            "The lease scenario needs positive rent; use free use for rent-free access.",
        )
    if r["ownership"]:
        if a["route_id"] != "existing":
            require(
                p["owner_id"] != a["holder_id"],
                "Buyer/recipient must differ from the current owner.",
            )
        require(
            a["annual_payment"] == 0 and a["deposit"] == 0,
            "Ownership routes have no rent/deposit in this fixture.",
        )
        p["owner_id"], p["owner"] = a["holder_id"], party_name(state, a["holder_id"])
        p["acquisition_cost"] = round(p["acquisition_cost"] + a["upfront"], 2)
    payment(state, -a["upfront"], at, "Price / formalisation expenditure", a["id"])
    payment(state, -a["deposit"], at, "Deposit held", a["id"])
    payment(state, -a["annual_payment"], at, "First annual rent / access fee", a["id"])
    a.update(
        status="active",
        start=at,
        end=None if r["ownership"] else round(at + a["term_years"], 4),
        deposit_held=a["deposit"],
        next_rent_due=round(at + 1, 4),
    )
    a["periods"] = [dict(start=at, end=a["end"])]
    p["physical_access"] = a["physical_access"]
    p["access"] = r["title"]
    if a["commitment_years"]:
        state["obligations"].append(
            dict(
                id=f"obligation-{len(state['obligations']) + 1}",
                agreement_id=a["id"],
                party_id=a["operator_id"],
                start=at,
                end=round(at + a["commitment_years"], 4),
                annual_amount=a["annual_maintenance"],
                last_paid=at,
                next_due=round(at + 1, 4),
                status="active",
                basis=a["evidence"],
            )
        )


def transition(state, action_id, inputs=None):
    require(
        state.get("schema_version") == 2, "Upgrade the legacy save before new actions."
    )
    adef = next((a for a in state["scenario"]["actions"] if a["id"] == action_id), None)
    require(adef is not None, "Unknown action.")
    require(unavailable(state, adef) is None, unavailable(state, adef))
    inputs = {} if inputs is None else inputs
    require(isinstance(inputs, dict), "Inputs must be an object.")
    kind, r = adef["kind"], None
    if kind in {"land_access", "activate_access"}:
        require(
            text(inputs.get("route_id"), 80) and text(inputs.get("parcel_id"), 80),
            "Choose route and parcel.",
        )
        r = route(state, inputs["route_id"])
        require(
            kind != "activate_access" or text(inputs.get("agreement_id"), 80),
            "Select a pending proposal.",
        )
        form = land_form(
            state,
            inputs["route_id"],
            inputs["parcel_id"],
            inputs.get("agreement_id") if kind == "activate_access" else None,
        )
        validate_fields(
            form["fields"],
            inputs,
            ("route_id", "parcel_id", "agreement_id")
            if kind == "activate_access"
            else ("route_id", "parcel_id"),
        )
        require(
            kind != "activate_access" or inputs["stage"] == "active",
            "Finalisation must explicitly assume conclusion.",
        )
    else:
        validate_fields(
            next(a["fields"] for a in list_actions(state) if a["id"] == action_id),
            inputs,
        )
    duration = r["duration"] if r else adef["duration"]
    if kind == "advance":
        require(
            inputs["target_year"] > state["time"]
            and round(inputs["target_year"], 4) == inputs["target_year"],
            "Choose a later year up to 30, with at most four decimal places.",
        )
        duration = round(inputs["target_year"] - state["time"], 4)
    target = round(state["time"] + duration, 4)
    require(target <= 30, "This action would finish beyond year 30.")
    if kind in {"restore", "restore_start"}:
        require(
            inputs["parcel_id"]
            in [
                p["value"]
                for p in parcel_options(state, adef["effects"]["area"], duration)
            ],
            "Access/permission must cover the full work duration and enough unrestored area.",
        )
    new = deepcopy(state)
    if kind == "end_access":
        a = next(a for a in new["agreements"] if a["id"] == inputs["agreement_id"])
        if a["status"] == "active":
            payment(new, a["deposit_held"], state["time"], "Deposit returned", a["id"])
            a["deposit_held"] = 0
            a["periods"][-1]["end"], a["end"] = state["time"], state["time"]
        a["status"] = "ended"
    events = advance(new, target)
    payment(new, -adef["cost"], target, adef["title"])
    explanation, effects = adef["outcome"], adef["effects"]
    if kind in {"land_access", "activate_access"}:
        if kind == "activate_access":
            a = next(a for a in new["agreements"] if a["id"] == inputs["agreement_id"])
            p = next(p for p in new["parcels"] if p["id"] == a["parcel_id"])
        else:
            if inputs["parcel_id"] == "new":
                p = dict(
                    id=f"parcel-{len(new['parcels']) + 1}",
                    name=inputs["parcel_name"].strip(),
                    area=inputs["parcel_area"],
                    owner_id=inputs["owner_id"],
                    owner=party_name(new, inputs["owner_id"]),
                    access="Proposal only",
                    acquired_by=action_id,
                    acquisition_cost=0,
                    year=target,
                    **{
                        k: inputs[k]
                        for k in (
                            "location",
                            "cadastral_reference",
                            "current_use",
                            "restrictions",
                            "physical_access",
                        )
                    },
                )
                new["parcels"].append(p)
            else:
                p = next(p for p in new["parcels"] if p["id"] == inputs["parcel_id"])
            a = dict(
                id=f"agreement-{len(new['agreements']) + 1}",
                parcel_id=p["id"],
                owner_id=p["owner_id"],
                route_id=inputs["route_id"],
                status="pending",
                start=None,
                end=None,
                periods=[],
                deposit_held=0,
                next_rent_due=None,
                source=r["source"],
                renewals=0,
            )
            new["agreements"].append(a)
        require(
            inputs["covered_area"] <= p["area"],
            "Covered area cannot exceed the parcel area.",
        )
        for k in (
            "holder_id",
            "operator_id",
            "covered_area",
            "upfront",
            "annual_payment",
            "deposit",
            "annual_maintenance",
            "commitment_years",
            "allow_restoration",
            "allow_monitoring",
            "allow_public",
            "physical_access",
            "permits",
            "evidence",
            "instrument",
            "exit_terms",
        ):
            a[k] = inputs[k]
        a["term_years"] = inputs.get("term_years")
        if inputs["stage"] == "active":
            activate(new, a, target)
            explanation = f"{r['title']} active on {p['name']}: {a['covered_area']} ha. Owner: {p['owner']}; holder: {party_name(new, a['holder_id'])}; operator: {party_name(new, a['operator_id'])}. "
            explanation += (
                "No configured access expiry."
                if a["end"] is None
                else f"Access ends in year {a['end']}; renewal is not automatic."
            )
        else:
            explanation = f"Proposal recorded for {p['name']}. No access, ownership transfer, deposit or rent applied for this proposal. Other agreements retain their scheduled costs. Unknown terms remain unresolved."
    elif kind == "renew_access":
        a = next(a for a in new["agreements"] if a["id"] == inputs["agreement_id"])
        require(
            not any(
                x["id"] != a["id"]
                and x["parcel_id"] == a["parcel_id"]
                and x["status"] == "active"
                for x in new["agreements"]
            ),
            "Another arrangement already provides active access to this parcel. End it first to avoid double counting.",
        )
        if a["status"] == "expired":
            a["start"], a["end"] = target, round(target + inputs["term_years"], 4)
            a["periods"].append(dict(start=target, end=a["end"]))
            a["next_rent_due"] = round(target + 1, 4)
            payment(new, -a["deposit"], target, "Renewal deposit held", a["id"])
            payment(
                new, -a["annual_payment"], target, "First renewed annual rent", a["id"]
            )
            a["deposit_held"] = a["deposit"]
        else:
            a["end"] = round(a["end"] + inputs["term_years"], 4)
            a["periods"][-1]["end"] = a["end"]
        a["status"], a["renewals"] = "active", a["renewals"] + 1
        obligations = [o for o in new["obligations"] if o["agreement_id"] == a["id"]]
        if inputs["commitment_years"]:
            end = round(target + inputs["commitment_years"], 4)
            if obligations and obligations[-1]["end"] >= target:
                o = obligations[-1]
                o["end"], o["status"] = max(o["end"], end), "active"
            else:
                new["obligations"].append(
                    dict(
                        id=f"obligation-{len(new['obligations']) + 1}",
                        agreement_id=a["id"],
                        party_id=a["operator_id"],
                        start=target,
                        end=end,
                        annual_amount=a["annual_maintenance"],
                        last_paid=target,
                        next_due=round(target + 1, 4),
                        status="active",
                        basis=a["evidence"],
                    )
                )
        explanation = f"{a['id']} explicitly renewed until year {a['end']}. Ownership unchanged; previous maintenance commitments remain."
    elif kind == "end_access":
        explanation = "Access ended and held deposit returned. Ownership, past restoration and independently continuing maintenance remain."
    elif kind in {"restore", "restore_start"}:
        new["activities"].append(
            dict(
                id=f"activity-{len(new['activities']) + 1}",
                title=adef["title"],
                parcel_id=inputs["parcel_id"],
                area=effects["area"],
                year=target,
                action_id=action_id,
            )
        )
    elif kind == "organization":
        org = effects["organization"]
        new["organizations"].append(org)
        new["parties"].append(
            dict(
                id=org.lower(),
                name=org,
                kind="nonprofit" if org == "Foundation" else "company",
            )
        )
    elif kind == "grant_apply":
        new["grant"]["status"] = "applied"
    elif kind == "grant_award":
        new["grant"] = dict(status="awarded", amount=effects["award"])
    elif kind == "grant_pay":
        payment(new, new["grant"]["amount"], target, "Grant payment")
        new["grant"]["status"] = "paid"
    receipts = new["payments"][len(state["payments"]) :]
    if events:
        explanation += " " + " ".join(events)
    new["revision"] += 1
    new["history"].append(
        dict(
            action_id=action_id,
            title=adef["title"],
            inputs=deepcopy(inputs),
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
    if isinstance(state, dict) and state.get("schema_version") == 1:
        return migrate_legacy(state)
    try:
        require(
            isinstance(state, dict)
            and type(state.get("schema_version")) is int
            and state["schema_version"] == 2,
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
        scenario = validate_scenario(state.get("scenario"))
        replay = (
            migrate_legacy(state["legacy_origin"], scenario)
            if state.get("legacy_origin") is not None
            else new_project(state["name"], scenario, state["id"])
        )
        baseline = len(replay["history"])
        require(
            same_json(replay["history"], state["history"][:baseline]),
            "Legacy history was changed.",
        )
        for h in state["history"][baseline:]:
            require(
                isinstance(h, dict) and text(h.get("action_id"), 80),
                "Invalid history entry.",
            )
            replay, _ = transition(replay, h["action_id"], h.get("inputs"))
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
    grant_text = {
        "not_applied": "No grant application.",
        "applied": "Application pending decision; no cash received.",
        "awarded": "Award pending payment; not available cash.",
        "paid": "Award paid once.",
    }[state["grant"]["status"]]
    active = [a for a in state["agreements"] if a["status"] == "active"]
    owned = [
        p
        for p in state["parcels"]
        if p["owner_id"] in {"individual", "company", "foundation"}
    ]
    maintenance = sum(
        max(0, o["end"] - o["last_paid"]) * o["annual_amount"]
        for o in state["obligations"]
    )
    rent = 0
    rent_after_horizon = 0
    for a in active:
        due = a["next_rent_due"]
        while due <= 30 and (a["end"] is None or due < a["end"]):
            rent += a["annual_payment"]
            due = round(due + 1, 4)
        if a["end"] is not None:
            while due < a["end"]:
                rent_after_horizon += a["annual_payment"]
                due = round(due + 1, 4)
    return dict(
        complete=state["time"] == 30,
        area=sum(p["area"] for p in state["parcels"]),
        active_area=sum(a["covered_area"] for a in active),
        owned_area=sum(p["area"] for p in owned),
        ownership=[
            dict(
                party=p["name"],
                area=sum(
                    x["area"] for x in state["parcels"] if x["owner_id"] == p["id"]
                ),
            )
            for p in state["parties"]
        ],
        restored_area=sum(a["area"] for a in state["activities"]),
        completed_activities=len(state["activities"]),
        grant_explanation=grant_text,
        pending=f"{sum(a['status'] == 'pending' for a in state['agreements'])} land proposals pending. "
        + grant_text,
        asset_explanation="Ownership, active access and historical work are separate. Expiry does not erase restoration history. No market valuation or legal/grant eligibility is inferred.",
        future_rent_to_horizon=round(rent, 2),
        future_rent_after_horizon=round(rent_after_horizon, 2),
        remaining_maintenance_commitment=round(maintenance, 2),
        beyond_horizon=[o for o in state["obligations"] if o["end"] > 30],
        migration_notice="Upgraded from schema 1: historic results retained; old access is a legacy assumption with no retroactive rent."
        if state["legacy_origin"]
        else None,
    )


def preview(state, action_id, inputs):
    new, explanation = transition(state, action_id, inputs)
    h = new["history"][-1]
    return dict(
        revision=state["revision"],
        explanation=explanation,
        cost=h["cost"],
        cash_change=h["cash_change"],
        duration=round(h["end"] - h["start"], 4),
        end_year=new["time"],
        cash_after=new["cash"],
        payments=h["payments"],
        events=h["events"],
        agreements=[a for a in new["agreements"] if a not in state["agreements"]],
        obligations=new["obligations"],
        summary=summary(new),
        parties=new["parties"],
        parcels=new["parcels"],
    )
