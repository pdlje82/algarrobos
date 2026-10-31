"""Logical funding questions and their presentation provenance, without new rules."""
from copy import deepcopy
import unicodedata
from .funding import applicant_form, applicant_label, effective, initial_applicant, legal_forms, resolved_applicant

BUDGET_FIELDS = {"budget_total", "eligible_cost", "available_contribution", "cash_before_receipts"}
LAND_FIELDS = {"owner_id", "operator_id", "rights", "rights_sufficient", "area_m2", "public_access", "heritage_public_use", "permits", "related_competence"}


def presentation(q, d):
    """Edition-specific help: never attach current legal guidance to an older snapshot."""
    if d["bundle"]["version"] >= 2:
        original = next(x for x in d["bundle"]["questions"] if x["id"] == ("applicant_id" if q["id"] == "applicant_choice" else q["id"]))
        q.update(short_label=original["short_label"], guidance=deepcopy(original["guidance"]), retired=original.get("retired", False))
    else:
        q.update(short_label="Applicant" if q["id"] == "applicant_choice" else q["label"], retired=False,
                 guidance={"summary": q["help"] if "help" in q and q["help"].strip() else "This question uses the original catalogue-edition-1 wording.",
                           "why": "Previous answers and assessments retain their original rules and source editions.", "verify": "Question-level passage guidance is not verified for this old edition. Inspect the saved option sources or review an explicit catalogue update.", "requirements": []})
    parcels = d["baseline"]["parcel_ids"]
    q["provenance"] = {"kind": "assumed" if q["overridden"] else "inherited", "parcel_ids": deepcopy(parcels) if q["id"] in {"owner_id", "operator_id", "rights", "municipality", "area_m2"} else [],
                       "detail": q["origin"]}
    if not q["overridden"] and len(parcels) == 1:
        if q["id"] in {"owner_id", "operator_id", "rights"}:
            q["origin"] = "Inherited captured parcel / active-agreement context—not answered here"
        elif q["id"] == "municipality" and d["bundle"]["version"] >= 2:
            q["origin"] = "Inherited recorded parcel location—not answered here"
        q["provenance"]["detail"] = q["origin"]
    if q["id"] == "municipality":
        def selection(value):
            if value is None or value.strip().casefold() in {"", "unknown"}: return "__unknown__"
            normal = lambda v: "".join(ch for ch in unicodedata.normalize("NFKD", v).casefold() if not unicodedata.combining(ch)).strip()
            if normal(value) in {"outside", "outside al20"}: return "__outside__"
            return next((name for name in d["bundle"]["municipalities"] if normal(name) == normal(value)), "__other__")
        q.update(input_kind="municipality", municipalities=deepcopy(d["bundle"]["municipalities"]),
                 municipality_selection=selection(q["current_value"]), municipality_initial_selection=selection(q["initial_value"]))
    else: q["input_kind"] = q["type"]
    return q


def applicant_options(d):
    rows = []
    for party in d["baseline"]["parties"]:
        choice = {"kind": "recorded", "party_id": party["id"]}
        rows.append({"group": "Recorded applicants", "label": applicant_label(choice, d), "choice": choice})
    for form in ["nonprofit", "individual", "company"]:
        choice = {"kind": "planned", "legal_form": form}
        rows.append({"group": "Organisation/business I plan to create", "label": applicant_label(choice, d), "choice": choice})
    for form in ["nonprofit", "public"]:
        choice = {"kind": "potential", "legal_form": form}
        rows.append({"group": "Potential partner", "label": applicant_label(choice, d), "choice": choice})
    rows.append({"group": "Other", "label": "Another hypothetical applicant type…", "choice": {"kind": "potential", "legal_form": None}})
    rows.append({"group": "Undecided", "label": "Unknown / I don’t know yet", "choice": {"kind": "unknown"}})
    return rows


def answer_text(q, value, parties):
    if value is None or q["id"] == "municipality" and value == "unknown": return "Unknown / not decided"
    if q["type"] == "choice": return dict(q["options"])[value]
    if q["type"] == "party":
        party = next((p for p in parties if p["id"] == value), None)
        return "Hypothetical/unrecorded party: " + value if party is None else party["name"]
    return str(value)


def describe(d):
    facts = effective(d)
    initial = initial_applicant(d)
    ready = d["version"] in {3, 4}
    if ready:
        selected = resolved_applicant(d)
    else:
        identity, form = facts["applicant_id"], facts["applicant_kind"]
        known = any(p["id"] == identity for p in d["baseline"]["parties"])
        selected = {"kind": "recorded", "party_id": identity} if known and applicant_form(d, identity) == form else {"kind": "potential", "legal_form": form}
    inherited = ready and d["applicant_choice"] is None
    unknown = selected["kind"] == "unknown" or selected["kind"] in {"planned", "potential"} and selected["legal_form"] is None
    applicant = {"id": "applicant_choice", "label": "Who would apply for the funding?", "type": "applicant", "options": applicant_options(d),
                 "other_forms": [[k, v] for k, v in legal_forms(d).items() if k not in {"nonprofit", "public"}],
                 "help": "Choose the applicant that would submit the application. It can differ from the landowner and operator. Recorded parties use their recorded legal form.",
                 "step": 1, "relevant": True, "current_value": selected, "initial_value": initial,
                 "display_value": applicant_label(selected, d), "initial_label": applicant_label(initial, d),
                 "unknown": unknown, "overridden": ready and d["applicant_choice"] is not None,
                 "origin": "Inherited context—not answered here; may include planning defaults" if inherited else
                 "Previous separate answers—review before editing" if not ready else "Cleared by you" if selected["kind"] == "unknown" else
                 "Chosen by you · Proposed—not yet created" if selected["kind"] == "planned" else "Chosen by you · Potential applicant—not yet identified" if selected["kind"] == "potential" else "Chosen by you"}
    questions = []
    business_without_land = facts["activity"] in {"business", "monitoring"} and not d["baseline"]["parcel_ids"]
    for original in d["bundle"]["questions"]:
        if original["id"] == "applicant_kind": continue
        if original["id"] == "applicant_id":
            questions.append(presentation(applicant, d))
            continue
        q = deepcopy(original)
        key = q["id"]
        value, start = facts[key], d["baseline"]["facts"][key]
        overridden = key in d["overrides"]
        unknown = value is None or key == "municipality" and value == "unknown"
        # Older catalogue snapshots may omit this optional relevance restriction.
        activities = q["activities"] if "activities" in q else None
        q.update(step=0 if key == "activity" else 4 if key in BUDGET_FIELDS else 1,
                 relevant=not (d["bundle"]["version"] >= 2 and original.get("retired", False)) and (key == "activity" or (activities is None or facts["activity"] in activities) and not (business_without_land and key in LAND_FIELDS)),
                 current_value=value, initial_value=start, display_value=answer_text(q, value, d["baseline"]["parties"]), initial_label=answer_text(q, start, d["baseline"]["parties"]),
                 unknown=unknown, overridden=overridden,
                 origin="Cleared by you" if overridden and value is None else "Chosen by you / scenario assumption" if overridden else "Inherited context—not answered here; may include planning defaults")
        q = presentation(q, d)
        if key == "selection_score" and d["version"] == 4:
            from .funding_selection import calculate
            scores = [calculate(d["bundle"], d["selection_assessments"], route) for route in d["bundle"]["selection"]["routes"]]
            summary = " · ".join(f"{s['route'].removeprefix('LEADER-AL20-')}: {s['total']:g} points" if s["total"] is not None else f"{s['route'].removeprefix('LEADER-AL20-')}: partial {s['subtotal']:g}, {s['unresolved']} unresolved" for s in scores)
            q.update(type="selection", input_kind="selection", current_value=deepcopy(d["selection_assessments"]), initial_value=None,
                     display_value=summary, initial_label="All annex criteria unanswered", unknown=all(s["total"] is None for s in scores),
                     overridden=any(any(v is not None for v in row["answers"].values()) or any(v is not None for v in row["inputs"].values()) or row["reference"] or row["notes"] for a in d["selection_assessments"].values() for row in a["criteria"].values()),
                     origin="Self-assessed annex selections; supporting references are not certified", legacy_selection_score=d["legacy_selection_score"])
            q["provenance"] = {"kind": "assumed", "parcel_ids": [], "detail": q["origin"]}
        questions.append(q)
    return {"editing_ready": ready, "questions": questions}
