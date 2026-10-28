"""Planting pilot workflow. All choices and consequences are supplied by Python."""

from copy import deepcopy
from decimal import Decimal
from . import engine_v3 as core
from . import planting
from .configuration import forms_for
from .parcel_removal import plant_options

KINDS = {
    "demo_plan",
    "demo_baseline",
    "demo_funding",
    "demo_apply",
    "demo_award",
    "demo_install",
    "demo_monitor",
    "demo_evaluate",
    "demo_pay",
}
RULES_URL = "https://www.juntadeandalucia.es/boja/2026/29/1"


def cfg(state):
    return state["scenario"]["demonstrator_config"]


def choice(state, name, label, default, section, help="", **extra):
    return core.field(
        name,
        label,
        "category",
        default,
        section=section,
        help=help,
        custom_label="Custom option…",
        options=core.options(cfg(state)["choices"][name]),
        maxLength=300,
        **extra,
    )


def select(name, label, rows, default, section="Record", **extra):
    return core.field(
        name,
        label,
        "select",
        default,
        section=section,
        options=core.options(rows),
        **extra,
    )


def numeric(name, label, default, section="Budget", **extra):
    return core.field(
        name,
        label,
        "number",
        default,
        section=section,
        min=0,
        max=100 if name == "cover_percent" else 1000000,
        unknown_help="Leave blank if this measurement is unknown; no value is inferred.",
        **extra,
    )


def label(state, key, value):
    if key == "municipality":
        return value  # Municipality categories also permit user-defined names.
    core.require(key in cfg(state)["choices"], "Missing choice catalogue: " + key)
    for code, title in cfg(state)["choices"][key]:
        if code == value:
            return title
    return value  # A validated category may explicitly contain custom text.


def detail_value(state, definition, value):
    if definition["type"] == "category":
        return label(state, definition["name"], value)
    if definition["type"] == "select":
        if definition["name"] == "parcel_id":
            return next(p["name"] for p in state["parcels"] if p["id"] == value)
        for option in definition["options"]:
            if option["value"] == value:
                return option["label"]
        raise core.Invalid("Saved selection has no label: " + definition["name"])
    return value


def fields(state, kind, legacy=False, priced=True):
    core.require(kind in KINDS, "Unknown demonstrator form kind.")
    settings = forms_for(state["scenario"])
    defaults = (
        settings["demonstrator"]["plan"]
        if kind == "demo_plan"
        else settings["demonstrator"]["records"][kind]
    )
    d = state["demonstrator"]
    if kind == "demo_plan":
        opts = plant_options(state, 0.01)
        for o in opts:
            o["default_area"] = min(defaults["restoration_area"], o["remaining_area"])
        f = [
            core.field(
                "parcel_id",
                "Pilot parcel",
                "select",
                opts[0]["value"] if opts else "",
                options=opts,
                section="Site and planting",
            ),
            numeric(
                "restoration_area",
                "Pilot work area (m²)",
                opts[0]["default_area"] if opts else None,
                section="Site and planting",
                help="The pilot must fit inside the remaining included area. Planning does not reserve area or carry out work.",
            ),
            choice(
                state,
                "vegetation_system",
                "Target vegetation system",
                defaults["vegetation_system"],
                "Site and planting",
                "The picture supplies illustrative systems, not site prescriptions. Suitability is reviewed before planting.",
            ),
            choice(
                state,
                "plant_mix",
                "Candidate planting mix",
                defaults["plant_mix"],
                "Site and planting",
                "Examples include species in the picture and Níjar procurement. Check soils, water, native provenance and permissions for this specific site.",
            ),
            choice(
                state,
                "objective",
                "Restoration objective",
                defaults["objective"],
                "Site and planting",
            ),
            choice(
                state,
                "water_plan",
                "Establishment water plan",
                defaults["water_plan"],
                "Site and planting",
            ),
            numeric(
                "trees",
                "Trees to plant",
                defaults["trees"],
                "Site and planting",
                step=1,
            ),
            numeric(
                "shrubs",
                "Shrubs / grasses to plant",
                defaults["shrubs"],
                "Site and planting",
                step=1,
            ),
            choice(
                state,
                "planting_method",
                "Method to demonstrate",
                defaults["planting_method"],
                "Demonstration design",
            ),
            choice(
                state,
                "design",
                "Comparison design",
                defaults["design"],
                "Demonstration design",
            ),
            choice(
                state,
                "novelty",
                "Local novelty of the method",
                defaults["novelty"],
                "Demonstration design",
                "AL20 3.4 concerns testing an approach new or unfamiliar in the area. A preset or ordinary planting does not establish eligibility.",
            ),
            choice(
                state,
                "baseline_method",
                "Baseline and follow-up method",
                defaults["baseline_method"],
                "Demonstration design",
            ),
            choice(
                state,
                "public_participation",
                "Participation / demonstration access",
                defaults["public_participation"],
                "Demonstration design",
            ),
            choice(
                state,
                "dissemination",
                "Results-sharing plan",
                defaults["dissemination"],
                "Demonstration design",
            ),
            choice(
                state,
                "publication_period",
                "Online publication commitment",
                defaults["publication_period"],
                "Demonstration design",
                "Category 3.4 requires online activity/results information to remain available for at least 3 years after final payment. This app does not publish it.",
            ),
            choice(
                state,
                "funding_route",
                "Planned funding route",
                defaults["funding_route"],
                "Funding route",
            ),
            core.field(
                "applicant_id",
                "Applicant / project fund administrator",
                "select",
                defaults["applicant_id"],
                section="Funding route",
                options=core.options([(p["id"], p["name"]) for p in state["parties"]]),
                help="AL20 3.4 lists public/nonprofit legal entities and certain publicly participated companies. A private individual or ordinary company is not an eligible applicant for this category. An existing nonprofit partner is available; ownership stays unchanged.",
            ),
            core.field(
                "municipality",
                "Pilot municipality",
                "category",
                defaults["municipality"],
                section="Funding route",
                maxLength=200,
                options=core.options(
                    [
                        ("unknown", "Municipality not yet specified"),
                        ("outside", "Outside the AL20 territory"),
                    ]
                    + [(x, x) for x in cfg(state)["municipalities"]]
                ),
                help="AL20 membership is a preliminary territory check, not parcel-level verification. Add a custom location if needed; it requires review.",
            ),
            choice(
                state,
                "purpose",
                "Economic character of the project",
                defaults["purpose"],
                "Funding route",
            ),
            numeric(
                "tree_unit_cost",
                "Assumed price per tree (€)",
                defaults["tree_unit_cost"],
            ),
            numeric(
                "shrub_unit_cost",
                "Assumed price per shrub / grass (€)",
                defaults["shrub_unit_cost"],
            ),
            numeric(
                "protection_unit_cost",
                "Protection / mulch per planted unit (€)",
                defaults["protection_unit_cost"],
            ),
            numeric("labour_days", "Planting labour (days)", defaults["labour_days"]),
            numeric(
                "labour_day_rate",
                "Assumed labour day rate (€)",
                defaults["labour_day_rate"],
            ),
            numeric(
                "site_preparation",
                "Site preparation budget (€)",
                defaults["site_preparation"],
            ),
            numeric(
                "establishment_water",
                "Establishment watering budget (€)",
                defaults["establishment_water"],
            ),
            numeric(
                "monitoring_budget",
                "Follow-up monitoring budget (€)",
                defaults["monitoring_budget"],
            ),
            numeric(
                "reporting_budget",
                "Evaluation / dissemination budget (€)",
                defaults["reporting_budget"],
            ),
            numeric(
                "installation_years",
                "Planting duration (years)",
                defaults["installation_years"],
                "Timing",
            ),
            numeric(
                "followup_years",
                "Follow-up after planting finishes (years)",
                defaults["followup_years"],
                "Timing",
            ),
            core.field(
                "notes",
                "Additional site / custom-method notes (optional)",
                "textarea",
                defaults["notes"],
                section="Timing",
                maxLength=1000,
            ),
        ]
        for v in f:
            if v["name"] == "restoration_area":
                v.update(min=0.01, max=100000000)
            if v["name"] in {"installation_years", "followup_years"}:
                v.update(min=0.1, max=10)
            if v["section"] == "Budget":
                v["help"] = (
                    "Editable playtest assumption, not a quote or an approved eligible expense. Installation, monitoring and reporting are paid in separate stages. Existing land rent/maintenance remains separate."
                )
        if priced and not legacy:
            f = [v for v in f if v["name"] not in {"tree_unit_cost", "shrub_unit_cost"}]
        if d and not d["legacy"]:
            for v in f:
                core.require(
                    v["name"] in d["plan"],
                    "Saved demonstrator plan is missing " + v["name"] + ".",
                )
                v["default"] = d["plan"][v["name"]]
        if not legacy:
            f = [v for v in f if v["name"] not in {"plant_mix", "trees", "shrubs"}]
            previous = d["plan"] if d and not d["legacy"] else None
            if previous is None:
                selection = deepcopy(defaults["plant_selection"])
            elif "plant_selection" in previous:
                selection = previous["plant_selection"]
            else:
                # Explicit adapter for the older aggregate-only plan format.
                # The visible notice requires the user to choose species.
                selection = {"version": planting.catalogue()["version"], "entries": []}
            catalogue = {
                **planting.catalogue(),
                "custom_defaults": settings["planting"],
            }
            notice = (
                f"This saved plan records {previous['trees']:g} trees and {previous['shrubs']:g} shrubs / grasses as a general mix. No species quantities were recorded. Choose plants explicitly to revise it."
                if previous and "plant_selection" not in previous
                else ""
            )
            if priced:
                from .plant_prices import snapshot

                prices = snapshot()
                if selection["entries"]:
                    if previous is not None and selection["version"] == 1:
                        notice = "This earlier checklist uses shared tree/shrub rates. Its editing draft converts those recorded rates to individual plant prices; history is unchanged until you commit."
                    selection = planting.priced_selection(selection, prices, previous)
                else:
                    selection = {"version": 2, "entries": []}
                catalogue.update(
                    selection_version=2,
                    price_defaults=prices,
                    plants=[
                        {**p, "default_unit_cost": prices["unit_costs"][p["id"]]}
                        for p in catalogue["plants"]
                    ],
                    custom_defaults={
                        **settings["planting"],
                        "unit_costs": prices["custom_unit_costs"],
                    },
                )
            f.insert(
                3,
                core.field(
                    "plant_selection",
                    "Choose the plants",
                    "plant_selection",
                    deepcopy(selection),
                    section="Plant checklist",
                    catalogue=catalogue,
                    legacy_notice=notice,
                ),
            )
        return f
    basis = [
        ("unknown", "Choose a basis"),
        ("observed", "User-reported observation / document"),
        ("illustrative", "Explicit illustrative playtest assumption"),
    ]
    if kind == "demo_baseline":
        return [
            select(
                "site_ready",
                "Site suitability, plants, water and permissions review",
                [
                    ("pending", "Needs review"),
                    ("ready", "Ready for this planting plan — reported / assumed"),
                    ("unsuitable", "Not suitable for the current plan"),
                ],
                defaults["site_ready"],
            ),
            select("basis", "Basis of baseline record", basis, defaults["basis"]),
            select(
                "photo_points",
                "Repeatable photo points",
                [
                    ("planned", "Planned"),
                    ("recorded", "Locations and starting photos recorded"),
                    ("not_used", "Not used"),
                ],
                defaults["photo_points"],
            ),
            numeric(
                "cover_percent",
                "Starting vegetation cover (%)",
                defaults["cover_percent"],
                "Record",
                unknown_allowed=True,
            ),
            select(
                "erosion",
                "Starting erosion condition",
                [
                    ("unknown", "Unknown"),
                    ("none", "No visible erosion reported"),
                    ("low", "Low"),
                    ("moderate", "Moderate"),
                    ("high", "High"),
                ],
                defaults["erosion"],
            ),
            core.field(
                "reference",
                "Baseline / photo reference (optional)",
                default=defaults["reference"],
                section="Record",
                maxLength=500,
            ),
        ]
    if kind == "demo_funding":
        return [
            select(
                "feedback",
                "Funding eligibility feedback",
                [
                    ("pending", "Not checked / feedback pending"),
                    (
                        "positive",
                        "Suitable in principle — reported or explicitly assumed",
                    ),
                    ("negative", "Not eligible / negative feedback"),
                ],
                defaults["feedback"],
            ),
            select("basis", "Basis of funding feedback", basis, defaults["basis"]),
            core.field(
                "reference",
                "Feedback reference / explanation",
                default=defaults["reference"],
                section="Record",
                maxLength=500,
                help="A reported positive response needs a reference. An illustrative assumption is labelled separately and is not real approval.",
            ),
        ]
    if kind == "demo_apply":
        return [
            select(
                "not_started",
                "Physical works and applicable start-date rules",
                [
                    ("unknown", "Not confirmed"),
                    (
                        "confirmed",
                        "No physical work begun; start-date requirements checked — reported / assumed",
                    ),
                    ("started", "Works already begun"),
                ],
                defaults["not_started"],
            ),
            numeric(
                "requested_amount",
                "Requested reimbursement (€)",
                min(cfg(state)["funding_cap"], d["budget"]["total"]),
                "Record",
            ),
            select("basis", "Application basis", basis, defaults["basis"]),
        ]
    if kind == "demo_award":
        return [
            select(
                "decision",
                "Decision",
                [
                    ("pending", "Still pending — no award"),
                    ("awarded", "Award recorded"),
                    ("declined", "Application declined"),
                ],
                defaults["decision"],
            ),
            numeric(
                "award_amount",
                "Reported / illustrative award (€)",
                defaults["award_amount"],
                "Record",
            ),
            select("basis", "Decision basis", basis, defaults["basis"]),
            core.field(
                "reference",
                "Decision reference (optional for an illustrative decision)",
                default=defaults["reference"],
                section="Record",
                maxLength=500,
            ),
        ]
    if kind == "demo_install":
        return [
            select(
                "confirmation",
                "Planting and spending confirmation",
                [
                    ("pending", "Review plan first"),
                    ("confirmed", "Proceed with the recorded plan and budget"),
                ],
                defaults["confirmation"],
            )
        ]
    if kind == "demo_monitor":
        return [
            select("basis", "Observation basis", basis, defaults["basis"]),
            numeric(
                "surviving_trees",
                "Surviving trees",
                0 if d["plan"]["trees"] == 0 else None,
                "Record",
                step=1,
            ),
            numeric(
                "surviving_shrubs",
                "Surviving shrubs / grasses",
                0 if d["plan"]["shrubs"] == 0 else None,
                "Record",
                step=1,
            ),
            numeric(
                "cover_percent",
                "Follow-up vegetation cover (%)",
                defaults["cover_percent"],
                "Record",
                unknown_allowed=True,
            ),
            select(
                "erosion",
                "Follow-up erosion condition",
                [
                    ("unknown", "Unknown"),
                    ("none", "No visible erosion reported"),
                    ("low", "Low"),
                    ("moderate", "Moderate"),
                    ("high", "High"),
                ],
                defaults["erosion"],
            ),
            core.field(
                "reference",
                "Follow-up observations / photo reference (optional)",
                default=defaults["reference"],
                section="Record",
                maxLength=500,
            ),
        ]
    if kind == "demo_evaluate":
        return [
            select(
                "conclusion",
                "Reported interpretation",
                [
                    ("inconclusive", "Inconclusive / more observation needed"),
                    ("encouraging", "Encouraging establishment"),
                    ("mixed", "Mixed results"),
                    ("poor", "Poor establishment / adapt the method"),
                ],
                defaults["conclusion"],
            ),
            select(
                "next_step",
                "Next step",
                [
                    ("maintain", "Maintain and keep observing"),
                    ("adapt", "Adapt the planting / establishment method"),
                    ("expand", "Consider a separate expansion"),
                ],
                defaults["next_step"],
            ),
            select(
                "shared",
                "Results dissemination",
                [
                    ("pending", "Not yet shared"),
                    (
                        "published",
                        "Activity and results published / shared — reported or assumed",
                    ),
                ],
                defaults["shared"],
            ),
            select(
                "basis", "Evaluation and dissemination basis", basis, defaults["basis"]
            ),
            core.field(
                "reference",
                "Results report / publication reference",
                default=defaults["reference"],
                section="Record",
                maxLength=500,
            ),
        ]
    if kind == "demo_pay":
        return [
            numeric(
                "received_amount",
                "Reimbursement received (€)",
                min(state["grant"]["amount"], d["spent"]),
                "Record",
            ),
            select(
                "eligibility_confirmed",
                "Expenses and payment record",
                [
                    ("pending", "Not checked / payment not received"),
                    (
                        "confirmed",
                        "Eligible expenditure justified and payment received — reported / assumed",
                    ),
                ],
                defaults["eligibility_confirmed"],
            ),
            select("basis", "Reimbursement basis", basis, defaults["basis"]),
        ]
    raise core.Invalid("No form implementation for demonstrator kind: " + kind)


def budget(plan):
    if "plant_selection" in plan and plan["plant_selection"]["version"] == 2:
        entries = planting.resolve(plan["plant_selection"])["entries"]
        tree_cost = float(
            sum(
                (
                    Decimal(str(p["unit_cost"])) * int(p["quantity"])
                    for p in entries
                    if p["group"] == "tree"
                ),
                Decimal(0),
            )
        )
        shrub_cost = float(
            sum(
                (
                    Decimal(str(p["unit_cost"])) * int(p["quantity"])
                    for p in entries
                    if p["group"] != "tree"
                ),
                Decimal(0),
            )
        )
    else:
        # Frozen aggregate/v1 checklist pricing for deterministic history replay.
        tree_cost = round(plan["trees"] * plan["tree_unit_cost"], 2)
        shrub_cost = round(plan["shrubs"] * plan["shrub_unit_cost"], 2)
    rows = [
        dict(label="Trees", amount=tree_cost),
        dict(
            label="Shrubs / grasses",
            amount=shrub_cost,
        ),
        dict(
            label="Protection / mulch",
            amount=round(
                (plan["trees"] + plan["shrubs"]) * plan["protection_unit_cost"], 2
            ),
        ),
        dict(
            label="Planting labour",
            amount=round(plan["labour_days"] * plan["labour_day_rate"], 2),
        ),
        dict(label="Site preparation", amount=plan["site_preparation"]),
        dict(label="Establishment water", amount=plan["establishment_water"]),
    ]
    installation = round(sum(r["amount"] for r in rows), 2)
    return dict(
        rows=rows,
        installation=installation,
        monitoring=plan["monitoring_budget"],
        reporting=plan["reporting_budget"],
        total=round(
            installation + plan["monitoring_budget"] + plan["reporting_budget"], 2
        ),
    )


def funding_fit(state, plan):
    if plan["funding_route"] != "al20_34":
        return dict(
            status="Other financing",
            issues=[],
            unknowns=[],
            cap=None,
            explanation="No AL20 eligibility or incoming grant is assumed. Installation uses available project cash.",
        )
    issues, unknowns = [], []
    applicant = next(p for p in state["parties"] if p["id"] == plan["applicant_id"])
    if applicant["kind"] not in {"public", "nonprofit"}:
        issues.append(
            "Select an eligible public/nonprofit applicant; a private individual or ordinary company does not qualify under category 3.4."
        )
    for key, bad, message in [
        ("municipality", "outside", "The pilot is outside AL20."),
        (
            "purpose",
            "commercial",
            "Commercial production does not match this nonproductive demonstration category.",
        ),
        (
            "novelty",
            "established",
            "A standard locally established method needs a different funding classification.",
        ),
        (
            "public_participation",
            "private",
            "Private-only activity does not meet the participation requirement.",
        ),
        ("dissemination", "none", "Public online dissemination is required."),
    ]:
        if plan[key] == bad:
            issues.append(message)
    if (
        plan["municipality"] not in cfg(state)["municipalities"]
        and plan["municipality"] != "outside"
    ):
        unknowns.append("Verify the municipality / territorial link with AL20.")
    for key, accepted, message in [
        (
            "purpose",
            {"conservation"},
            "Confirm the nonproductive conservation/public-benefit purpose.",
        ),
        (
            "novelty",
            {"new_locally"},
            "Establish that the method is new or unfamiliar locally.",
        ),
        (
            "public_participation",
            {"open_demo", "open_days"},
            "Define open participation in the demonstration.",
        ),
        (
            "dissemination",
            {"web_report", "web_workshop"},
            "Arrange public online activity and results information.",
        ),
        (
            "publication_period",
            {"three_years"},
            "Arrange online availability for at least 3 years after final payment.",
        ),
        (
            "design",
            {"comparison", "before_after"},
            "Define a testable and transferable demonstration design.",
        ),
    ]:
        if plan[key] not in accepted and not any(
            (key == k and plan[key] == bad)
            for k, bad, _ in [
                ("purpose", "commercial", ""),
                ("novelty", "established", ""),
                ("public_participation", "private", ""),
                ("dissemination", "none", ""),
            ]
        ):
            unknowns.append(message)
    return dict(
        status="Does not match listed requirements"
        if issues
        else "Needs review"
        if unknowns
        else "Potential fit — not verified eligibility",
        issues=issues,
        unknowns=unknowns,
        cap=cfg(state)["funding_cap"],
        explanation="Choices are examples, not pre-approved funded options. AL20 must confirm the applicant, project, costs and start-date conditions. Up to 100% of eligible costs, capped at €28,000; reimbursement follows paid expenditure.",
    )


def availability(state, kind):
    d = state["demonstrator"]
    if kind == "demo_plan":
        if d and d["legacy"]:
            return (
                "completed",
                "An earlier demonstrator is retained as a legacy record; it is not relabelled as AL20 3.4.",
            )
        if d and d["status"] not in {"planned", "baselined"}:
            return (
                "completed",
                "The planting plan is already installed. Review its observations and results.",
            )
        if state["grant"]["status"] in {"applied", "awarded", "paid"}:
            return (
                "future",
                "The submitted plan is locked. Only the last decision can be undone; application amendments are not modelled.",
            )
        if not plant_options(state, 0.01):
            return (
                "future",
                "First establish suitable land access and planting permissions.",
            )
        return "available", None
    if d and d["legacy"]:
        return (
            "completed",
            "This earlier project retains its original workflow. Start a new project for the guided planting demonstrator.",
        )
    if not d:
        return "future", "First configure a new demonstrator plan."
    parcel = next(p for p in state["parcels"] if p["id"] == d["plan"]["parcel_id"])
    if parcel.get("scenario_status") and kind in {
        "demo_baseline",
        "demo_funding",
        "demo_apply",
        "demo_install",
    }:
        return (
            "future",
            "This parcel is excluded from new work. Undo the exclusion or plan on another parcel.",
        )
    stage = d["status"]
    if kind in {"demo_baseline", "demo_funding"}:
        if stage not in {"planned", "baselined"}:
            return "completed", "This record is locked after planting."
        if kind == "demo_funding" and d["plan"]["funding_route"] != "al20_34":
            return (
                "unavailable",
                "This plan uses other financing; no AL20 application is configured.",
            )
        if kind == "demo_funding" and state["grant"]["status"] in {
            "applied",
            "awarded",
            "paid",
        }:
            return (
                "completed",
                "Funding feedback is already attached to the submitted application.",
            )
    elif kind == "demo_apply":
        if d["plan"]["funding_route"] != "al20_34":
            return "unavailable", "This plan uses other financing."
        if state["grant"]["status"] != "not_applied":
            return "completed", "An application is already recorded for this plan."
        fit = funding_fit(state, d["plan"])
        feedback = d["funding_review"]
        if fit["issues"]:
            return "future", fit["issues"][0] + " Revise the plan."
        if not feedback or feedback["feedback"] != "positive":
            return (
                "future",
                "Record positive funding feedback or an explicitly labelled playtest assumption before applying.",
            )
        if fit["unknowns"] and feedback["basis"] != "observed":
            return (
                "future",
                "Unresolved/custom eligibility conditions need referenced, user-reported AL20 feedback.",
            )
    elif kind == "demo_award":
        if state["grant"]["status"] != "applied":
            return (
                "future",
                "First record an application; decisions are never automatic.",
            )
    elif kind == "demo_install":
        if stage not in {"planned", "baselined"}:
            return "completed", "Planting is already installed."
        if not d["baseline"] or d["baseline"]["site_ready"] != "ready":
            return (
                "future",
                "Record the baseline and confirm site suitability, water, plants and permissions.",
            )
        if (
            d["plan"]["baseline_method"]
            in {"photo_cover", "photo_survival", "infiltration"}
            and d["baseline"]["photo_points"] != "recorded"
        ):
            return "future", "Record the starting photo points before planting."
        if (
            d["plan"]["vegetation_system"] == "unknown"
            or d["plan"]["plant_mix"] == "unknown"
            or d["plan"]["water_plan"] == "unknown"
        ):
            return (
                "future",
                "Complete the vegetation, planting mix and establishment water choices in the plan.",
            )
        if (
            d["plan"]["funding_route"] == "al20_34"
            and state["grant"]["status"] != "awarded"
        ):
            return (
                "future",
                "This playtest waits for a recorded award before grant-funded planting. Select own/partner financing in the plan to proceed without an award.",
            )
        p = d["plan"]
        access = next(
            (
                a
                for a in state["agreements"]
                if a["parcel_id"] == p["parcel_id"] and a["status"] == "active"
            ),
            None,
        )
        if not access or access["allow_monitoring"] != "yes":
            return (
                "future",
                "Confirm monitoring permission for the planned follow-up before planting.",
            )
        if not any(
            x["value"] == p["parcel_id"]
            for x in core.parcel_options(
                state,
                p["restoration_area"],
                p["installation_years"] + p["followup_years"] + 0.0001,
            )
        ):
            return (
                "future",
                "Enough unrestored area and valid planting access must last through planting and planned follow-up. Renew or arrange access.",
            )
        payment_delay = 0.1 if p["funding_route"] == "al20_34" else 0
        if (
            state["time"]
            + p["installation_years"]
            + p["followup_years"]
            + payment_delay
            > 30
        ):
            return (
                "unavailable",
                "Planting, follow-up and final reimbursement would extend beyond year 30.",
            )
        if state["cash"] < d["budget"]["installation"]:
            return "future", "Insufficient cash to pay planting before reimbursement."
    elif kind == "demo_monitor":
        if stage in {"observed", "evaluated"}:
            return "completed", "Follow-up observations are already recorded."
        if stage != "installed":
            return "future", "First plant the demonstrator."
        if state["time"] < d["followup_due"]:
            return (
                "future",
                f"Follow-up is due at year {d['followup_due']}; advance time explicitly.",
            )
        agreement = next(
            (
                a
                for a in state["agreements"]
                if a["parcel_id"] == d["plan"]["parcel_id"] and a["status"] == "active"
            ),
            None,
        )
        parcel = next(p for p in state["parcels"] if p["id"] == d["plan"]["parcel_id"])
        if (
            not agreement
            or agreement["allow_monitoring"] != "yes"
            or agreement["covered_area"] < d["plan"]["restoration_area"]
            or parcel["physical_access"] != "yes"
        ):
            return (
                "future",
                "Follow-up requires active access and monitoring permission; renew or confirm access.",
            )
    elif kind == "demo_evaluate":
        if stage == "evaluated":
            return "completed", "Evaluation is already recorded."
        if stage != "observed":
            return "future", "First record follow-up observations."
    elif kind == "demo_pay":
        if state["grant"]["status"] == "paid":
            return "completed", "Reimbursement was already recorded once."
        if state["grant"]["status"] != "awarded":
            return "future", "First record an award."
        if stage != "evaluated" or d["evaluation"]["shared"] != "published":
            return (
                "future",
                "This playtest requires completed observations, evaluation and reported dissemination before reimbursement.",
            )
    return "available", None


def duration_and_cost(state, kind):
    d = state["demonstrator"]
    if kind == "demo_install":
        return d["plan"]["installation_years"], d["budget"]["installation"]
    if kind == "demo_monitor":
        return 0, d["budget"]["monitoring"]
    if kind == "demo_evaluate":
        return 0, d["budget"]["reporting"]
    return (0.1 if kind in {"demo_apply", "demo_award", "demo_pay"} else 0), 0


def apply(state, kind, values, at, pay):
    d = state["demonstrator"]
    if kind == "demo_plan":
        core.require(
            values["restoration_area"] > 0 and values["trees"] + values["shrubs"] > 0,
            "Choose a positive area and at least one plant.",
        )
        core.require(
            any(
                x["value"] == values["parcel_id"]
                for x in plant_options(state, values["restoration_area"])
            ),
            "The pilot must fit within available included land.",
        )
        core.require(
            at + values["installation_years"] + values["followup_years"] <= 30,
            "Planting and follow-up must fit within year 30.",
        )
        estimate = budget(values)
        core.require(
            core.number(estimate["total"], 0, 1000000000),
            "Budget exceeds the supported amount.",
        )
        state["demonstrator"] = dict(
            plan=deepcopy(values),
            status="planned",
            budget=estimate,
            baseline=None,
            funding_review=None,
            installed_year=None,
            followup_due=None,
            observation=None,
            evaluation=None,
            spent=0,
            legacy=False,
        )
        state["grant"] = dict(status="not_applied", amount=0)
        return "Demonstrator plan recorded. No planting, ecological recovery or funding receipt is implied. Baseline and funding checks come before works."
    if kind == "demo_baseline":
        core.require(
            values["basis"] != "unknown",
            "Choose whether the baseline is user-reported or explicitly illustrative.",
        )
        if values["cover_percent"] is not None:
            core.require(
                values["cover_percent"] <= 100,
                "Vegetation cover must be between 0 and 100%.",
            )
        d["baseline"] = {**deepcopy(values), "year": at}
        d["status"] = "baselined"
        return "Baseline recorded with its evidence basis. No plants have been installed and no ecological result is assumed."
    if kind == "demo_funding":
        if values["feedback"] != "pending":
            core.require(values["basis"] != "unknown", "Choose the feedback basis.")
        if values["feedback"] == "positive" and values["basis"] == "observed":
            core.require(
                bool(values["reference"].strip()),
                "Add a reference for reported positive AL20 feedback.",
            )
        d["funding_review"] = {**deepcopy(values), "year": at}
        return "Funding feedback recorded. This is a user report or an explicit scenario assumption; it is not an award or certified eligibility."
    if kind == "demo_apply":
        core.require(
            values["not_started"] == "confirmed" and values["basis"] != "unknown",
            "Confirm start-date conditions and the application basis before recording an application.",
        )
        core.require(
            0
            < values["requested_amount"]
            <= min(cfg(state)["funding_cap"], d["budget"]["total"]),
            "Requested funding must be positive and within the planned budget and €28,000 category ceiling; eligible costs still need confirmation.",
        )
        state["grant"] = {
            "status": "applied",
            "amount": 0,
            "requested_amount": values["requested_amount"],
            "application_basis": values["basis"],
            "route": "al20_34",
        }
        return "AL20 3.4 application recorded; decision pending. No incoming cash or guaranteed award."
    if kind == "demo_award":
        if values["decision"] == "pending":
            core.require(
                values["award_amount"] == 0,
                "A pending decision must have a zero award amount.",
            )
            return "Funding decision remains pending; no award and no cash received."
        core.require(values["basis"] != "unknown", "Choose the decision basis.")
        if values["basis"] == "observed":
            core.require(
                bool(values["reference"].strip()),
                "Add the reported decision reference.",
            )
        if values["decision"] == "declined":
            core.require(
                values["award_amount"] == 0,
                "A declined application must have zero award.",
            )
            state["grant"].update(status="declined", amount=0)
        else:
            core.require(
                0 < values["award_amount"] <= state["grant"]["requested_amount"],
                "The award must be positive and no greater than the requested amount.",
            )
            state["grant"].update(status="awarded", amount=values["award_amount"])
        state["grant"].update(
            decision_basis=values["basis"], decision_reference=values["reference"]
        )
        return "Funding decision recorded explicitly. An award is not cash; planting must be paid before reimbursement."
    if kind == "demo_install":
        core.require(
            values["confirmation"] == "confirmed",
            "Confirm the planting plan and expenditure.",
        )
        p = d["plan"]
        d.update(
            status="installed",
            installed_year=at,
            followup_due=round(at + p["followup_years"], 4),
            spent=d["budget"]["installation"],
        )
        state["activities"].append(
            dict(
                id=f"activity-{len(state['activities']) + 1}",
                title="Demonstrator planting installed — recovery not yet evaluated",
                parcel_id=p["parcel_id"],
                area=p["restoration_area"],
                year=at,
                action_id="install_demonstrator",
            )
        )
        return f"Planting installed across {p['restoration_area']:g} m²: {p['trees']} trees and {p['shrubs']} shrubs/grasses. Establishment is not verified ecological recovery. Follow-up is due at year {d['followup_due']}. No reimbursement received."
    if kind == "demo_monitor":
        core.require(
            values["basis"] != "unknown",
            "Select user-reported or explicitly illustrative observations.",
        )
        core.require(
            values["surviving_trees"] <= d["plan"]["trees"]
            and values["surviving_shrubs"] <= d["plan"]["shrubs"],
            "Survivors cannot exceed the numbers planted.",
        )
        if values["cover_percent"] is not None:
            core.require(
                values["cover_percent"] <= 100,
                "Vegetation cover must be between 0 and 100%.",
            )
        d["observation"] = {
            **deepcopy(values),
            "year": at,
            "survival_percent": round(
                (values["surviving_trees"] + values["surviving_shrubs"])
                / (d["plan"]["trees"] + d["plan"]["shrubs"])
                * 100,
                1,
            ),
        }
        d["status"] = "observed"
        d["spent"] = round(d["spent"] + d["budget"]["monitoring"], 2)
        return "Follow-up observations recorded with their evidence basis. Survival is calculated from the entered counts; no survival or ecological benefit was predicted."
    if kind == "demo_evaluate":
        core.require(
            values["basis"] != "unknown", "Choose the evaluation / dissemination basis."
        )
        if values["shared"] == "published":
            core.require(
                bool(values["reference"].strip()),
                "Add a publication/report reference or an explicitly illustrative reference.",
            )
        d["evaluation"] = {**deepcopy(values), "year": at}
        d["status"] = "evaluated"
        d["spent"] = round(d["spent"] + d["budget"]["reporting"], 2)
        return "Evaluation and dissemination status recorded. The conclusion is reported, not a certified ecological outcome. Expansion remains a separate decision."
    if kind == "demo_pay":
        core.require(
            values["eligibility_confirmed"] == "confirmed"
            and values["basis"] != "unknown",
            "Confirm justified expenditure, receipt and the payment basis.",
        )
        core.require(
            0 < values["received_amount"] <= min(state["grant"]["amount"], d["spent"]),
            "Reimbursement must be positive and cannot exceed the recorded award or paid demonstrator expenditure.",
        )
        pay(
            state,
            values["received_amount"],
            at,
            "Reported / illustrative AL20 3.4 reimbursement",
        )
        state["grant"].update(
            status="paid",
            received_amount=values["received_amount"],
            payment_basis=values["basis"],
        )
        return "Reimbursement recorded once and added to cash. Amount and receipt are user-reported or explicitly illustrative; no external grant was submitted or paid by this app."
    raise core.Invalid("Unknown demonstrator action.")


def view(state):
    d = state["demonstrator"]
    if not d:
        return dict(status="Not planned", sources=cfg(state)["sources"])
    if d["legacy"]:
        return dict(
            status="Earlier project workflow retained",
            legacy=True,
            explanation="Historic work and grant stages are preserved, including saved undo. No AL20 classification, measurements or ecological success is inferred. Start a new project to use the guided planting demonstrator.",
            sources=cfg(state)["sources"],
        )
    p = d["plan"]
    fit = funding_fit(state, p)
    return {
        **deepcopy(d),
        "fit": fit,
        "parcel_name": next(
            x["name"] for x in state["parcels"] if x["id"] == p["parcel_id"]
        ),
        "details": [
            dict(
                label=f["label"],
                value=detail_value(state, f, p[f["name"]]),
            )
            for f in fields(
                state,
                "demo_plan",
                legacy="plant_selection" not in p,
                priced="plant_selection" in p and p["plant_selection"]["version"] == 2,
            )
            if f["name"] != "notes" and f["type"] != "plant_selection"
        ],
        "planting": planting.review(
            p["plant_selection"], p["vegetation_system"], legacy_plan=p
        )
        if "plant_selection" in p
        else None,
        "sources": cfg(state)["sources"],
        "planned_future_spending": round(d["budget"]["total"] - d["spent"], 2),
        "funding_stage": state["grant"]["status"],
        "funding_record": deepcopy(state["grant"]),
        "reimbursement_ceiling": min(cfg(state)["funding_cap"], d["budget"]["total"])
        if p["funding_route"] == "al20_34"
        else None,
    }
