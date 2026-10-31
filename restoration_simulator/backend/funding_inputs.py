"""Logical funding questions and their presentation provenance, without new rules."""
from copy import deepcopy
from .funding import applicant_form, applicant_label, effective, initial_applicant, legal_forms, resolved_applicant

BUDGET_FIELDS = {"budget_total", "eligible_cost", "available_contribution", "cash_before_receipts"}
LAND_FIELDS = {"owner_id", "operator_id", "rights", "rights_sufficient", "area_m2", "public_access", "permits", "related_competence"}


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
    ready = d["version"] == 3
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
            questions.append(applicant)
            continue
        q = deepcopy(original)
        key = q["id"]
        value, start = facts[key], d["baseline"]["facts"][key]
        overridden = key in d["overrides"]
        unknown = value is None or key == "municipality" and value == "unknown"
        # Older catalogue snapshots may omit this optional relevance restriction.
        activities = q["activities"] if "activities" in q else None
        q.update(step=0 if key == "activity" else 4 if key in BUDGET_FIELDS else 1,
                 relevant=key == "activity" or (activities is None or facts["activity"] in activities) and not (business_without_land and key in LAND_FIELDS),
                 current_value=value, initial_value=start, display_value=answer_text(q, value, d["baseline"]["parties"]), initial_label=answer_text(q, start, d["baseline"]["parties"]),
                 unknown=unknown, overridden=overridden,
                 origin="Cleared by you" if overridden and value is None else "Chosen by you / scenario assumption" if overridden else "Inherited context—not answered here; may include planning defaults")
        questions.append(q)
    return {"editing_ready": ready, "questions": questions}
