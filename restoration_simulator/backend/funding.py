"""Source-backed funding exploration, separate from simulation effects and history."""
from copy import deepcopy
from datetime import date
from functools import wraps
import hashlib
import json
import unicodedata
from math import isfinite
from pathlib import Path
from uuid import UUID, uuid4

from .configuration import keys, read_json
from . import funding_selection
from .engine import require, same_json, Invalid

CATALOGUE = Path(__file__).resolve().parents[1] / "scenarios" / "funding.json"


def checked(fn):
    @wraps(fn)
    def call(*args, **kwargs):
        try:
            return fn(*args, **kwargs)
        except Invalid:
            raise
        except (KeyError, TypeError, ValueError, AttributeError, OverflowError, RecursionError) as exc:
            raise Invalid("Malformed funding data in " + fn.__name__ + ": " + str(exc)) from exc
    return call


def digest(value):
    try:
        return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=False, allow_nan=False).encode()).hexdigest()
    except (ValueError, TypeError, RecursionError) as exc:
        raise Invalid("Funding data must be finite valid JSON.") from exc


@checked
def validate_catalogue(c):
    require(type(c["version"]) is int and c["version"] in {1, 2, 3}, "Unsupported funding catalogue version.")
    keys(c, {"version", "checked_on", "reference", "groups", "entries", "questions", "municipalities", "rules", "official_pages", "source_review"} | ({"territory"} if c["version"] >= 2 else set()) | ({"selection"} if c["version"] == 3 else set()), "funding catalogue")
    date.fromisoformat(c["checked_on"])
    require(isinstance(c["entries"], list) and c["entries"], "Funding entries are missing.")
    ids = set()
    for e in c["entries"]:
        keys(e, set("id title group mechanism activities description rule sources source_strength availability maturity checked_on source_gaps related".split()), "funding entry")
        require(isinstance(e["id"], str) and e["id"] not in ids and e["title"] and e["description"], "Duplicate or invalid funding entry.")
        ids.add(e["id"])
        require(e["group"] in c["groups"] and (e["rule"] is None or e["rule"] in c["rules"]), "Unknown funding group or rule.")
        require(all(isinstance(e[k], list) for k in ["activities", "sources", "source_gaps", "related"]), "Invalid funding metadata.")
        for s in e["sources"]:
            keys(s, {"document_id", "page", "label", "role", "sha256"}, "funding source")
            require(type(s["page"]) is int and s["page"] > 0 and len(s["sha256"]) == 64, "Invalid funding source page or edition.")
    require(all(set(e["related"]) <= ids for e in c["entries"]), "Unresolved related funding identity.")
    require(len({q["id"] for q in c["questions"]}) == len(c["questions"]), "Duplicate funding question.")
    for q in c["questions"]:
        require(q["type"] in {"text", "party", "number", "choice"}, "Unsupported funding question.")
        require(isinstance(q["id"], str) and isinstance(q["label"], str) and q["label"].strip(), "Missing funding question identity or wording.")
        if q["type"] == "choice":
            require(isinstance(q["options"], list) and q["options"] and all(isinstance(p, list) and len(p) == 2 and all(isinstance(v, str) and v for v in p) for p in q["options"]), "Invalid funding question choices.")
            require(len({p[0] for p in q["options"]}) == len(q["options"]), "Repeated funding question choice.")
        if c["version"] >= 2:
            require(isinstance(q["short_label"], str) and q["short_label"].strip(), "Missing short funding label.")
            guidance = q["guidance"]
            keys(guidance, {"summary", "why", "verify", "requirements"}, "funding question guidance")
            require(all(isinstance(guidance[k], str) and guidance[k].strip() for k in ["summary", "why", "verify"]) and isinstance(guidance["requirements"], list), "Incomplete funding question guidance.")
            for item in guidance["requirements"]:
                keys(item, {"programme_ids", "explanation", "evidence", "sources", "verified_on"}, "question requirement")
                require(item["programme_ids"] and set(item["programme_ids"]) <= ids and item["evidence"] in {"verified", "planning", "gap"} and isinstance(item["explanation"], str), "Invalid question requirement.")
                date.fromisoformat(item["verified_on"])
                require(item["evidence"] != "verified" or item["sources"], "Verified guidance needs supporting passages.")
                for source in item["sources"]: validate_guidance_source(source)
    if c["version"] >= 2:
        require(set(c["territory"]) == set(c["rules"]), "Missing programme territory rules.")
        for rule in c["territory"].values():
            keys(rule, {"municipalities", "outside_exception", "sources"}, "programme territory")
            require(isinstance(rule["municipalities"], list) and rule["municipalities"] and type(rule["outside_exception"]) is bool and rule["sources"], "Invalid territory coverage.")
            for source in rule["sources"]: validate_guidance_source(source)
    require(set(c["rules"]) == {"2.7", "1.11", "2.6", "3.4", "3.5"}, "Incomplete core funding rules.")
    r = c["rules"]["2.7"]
    require(all(type(r[k]) in (int, float) and isfinite(r[k]) and r[k] >= 0 for k in ["base", "first", "second", "bonus_cap", "cap"]), "Invalid startup financial amounts.")
    require(all(type(v) in (int, float) and isfinite(v) and v >= 0 for v in r["bonuses"].values()), "Invalid startup bonus amounts.")
    require(r["first"] + r["second"] == r["base"] and r["base"] + r["bonus_cap"] == r["cap"], "Inconsistent lump-sum rules.")
    for id in ["3.4", "3.5", "1.11", "2.6"]:
        rule = c["rules"][id]
        require(type(rule["rate"]) in (int, float) and 0 <= rule["rate"] <= 1 and type(rule["cap"]) in (int, float) and isfinite(rule["cap"]) and rule["cap"] >= 0, "Invalid reimbursement rate or cap.")
    if c["version"] == 3:
        funding_selection.validate_rules(c["selection"], c)
    return c


def validate_guidance_source(source):
    keys(source, {"document_id", "page", "label", "role", "sha256", "verified_on"}, "question source edition")
    require(isinstance(source["document_id"], str) and type(source["page"]) is int and source["page"] > 0 and isinstance(source["sha256"], str) and len(source["sha256"]) == 64, "Invalid question source page or checksum.")
    date.fromisoformat(source["verified_on"])


def catalogue():
    return validate_catalogue(read_json(CATALOGUE))


def identity(value):
    try:
        require(isinstance(value, str) and str(UUID(value)) == value, "Invalid funding record identity.")
    except (ValueError, AttributeError) as exc:
        raise Invalid("Invalid funding record identity.") from exc


def initial():
    return {"version": 1, "draft": None, "scenarios": [], "plans": []}


@checked
def baseline(project, planning, parcel_ids, target, bundle=None):
    require(target in {"activity", "demonstrator", "business"}, "Choose a supported funding activity scope.")
    require(isinstance(parcel_ids, list) and len(set(parcel_ids)) == len(parcel_ids) and set(parcel_ids) <= {p["id"] for p in project["parcels"]}, "Choose existing funding parcels.")
    c = catalogue() if bundle is None else validate_catalogue(bundle)
    facts = {q["id"]: None for q in c["questions"]}
    if len(parcel_ids) == 1:
        p = next(p for p in project["parcels"] if p["id"] == parcel_ids[0])
        facts.update(owner_id=p["owner_id"], area_m2=p["area"], municipality=p["location"])
        agreements = [a for a in project["agreements"] if a["parcel_id"] == p["id"] and a["status"] == "active"]
        if agreements:
            a = agreements[-1]
            facts.update(rights="ownership" if a["route_id"] in {"existing", "purchase", "donation"} else a["route_id"], operator_id=a["operator_id"])
    if target == "business":
        facts["activity"] = "business"
    work_budget = None
    if target == "demonstrator":
        facts["activity"] = "demonstration"
        plan = planning["inputs"] if planning is not None else project["demonstrator"]["plan"] if project["demonstrator"] is not None and not project["demonstrator"]["legacy"] else None
        if plan is not None:
            facts.update(applicant_id=plan["applicant_id"], purpose=plan["purpose"])
            if c["version"] == 1 or len(parcel_ids) != 1: facts["municipality"] = plan["municipality"]
            applicant = next(p for p in project["parties"] if p["id"] == plan["applicant_id"])
            facts["applicant_kind"] = applicant["kind"] if applicant["kind"] in {"individual", "nonprofit", "public", "company"} else None
            mappings = {"novelty": ("novelty", {"new_locally": "yes", "established": "no"}), "public_access": ("public_participation", {"open_demo": "yes", "open_days": "yes", "private": "no"}), "dissemination": ("dissemination", {"web_report": "yes", "web_workshop": "yes", "none": "no"}), "publication_three_years": ("publication_period", {"three_years": "yes"})}
            if c["version"] >= 2:
                mappings["demonstration_participation"] = mappings.pop("public_access")
            for out, (inp, mapping) in mappings.items():
                facts[out] = mapping[plan[inp]] if plan[inp] in mapping else None
            if type(plan["restoration_area"]) in (int, float): facts["area_m2"] = plan["restoration_area"]
            cost_keys = {"protection_unit_cost", "labour_days", "labour_day_rate", "site_preparation", "establishment_water", "monitoring_budget", "reporting_budget"}
            has_design = planning is not None and planning["source"] is not None or project["demonstrator"] is not None
            if has_design and all(type(plan[k]) in (int, float) and isfinite(plan[k]) for k in cost_keys):
                from . import demonstrator, planting
                priced = deepcopy(plan)
                if priced["plant_selection"]["entries"]:
                    resolved = planting.resolve(priced["plant_selection"])
                    priced.update(trees=resolved["trees"], shrubs=resolved["shrubs"])
                    work_budget = demonstrator.budget(priced)
                    facts["budget_total"] = work_budget["total"]
    return {"project_id": project["id"], "project_revision": project["revision"], "facts": facts, "parties": deepcopy(project["parties"]), "target": target, "parcel_ids": deepcopy(parcel_ids), "work_budget": work_budget}


def new_draft(project, planning, parcel_ids, target):
    c = catalogue()
    draft = {"version": 3, "applicant_choice": None, "name": "Funding exploration", "activity_key": "demonstrator" if target == "demonstrator" else str(uuid4()), "baseline": baseline(project, planning, parcel_ids, target, c), "overrides": {}, "selected": [], "allocations": [], "calendar_start": None, "notes": "", "bundle": c}
    if c["version"] == 3:
        draft.update(version=4, selection_assessments=funding_selection.empty(c), legacy_selection_score=None)
    return draft


@checked
def validate_draft(d, project):
    require(type(d["version"]) is int and d["version"] in {1, 2, 3, 4}, "Unsupported funding draft version.")
    required = set("version name activity_key baseline overrides selected allocations calendar_start notes bundle".split())
    keys(d, required | ({"applicant_choice"} if d["version"] in {3, 4} else set()) | ({"selection_assessments", "legacy_selection_score"} if d["version"] == 4 else set()), "funding draft")
    require(isinstance(d["name"], str) and 0 < len(d["name"].strip()) <= 80 and isinstance(d["notes"], str) and len(d["notes"]) <= 10000, "Enter a funding name (up to 80 characters) and valid notes.")
    require(isinstance(d["activity_key"], str) and 0 < len(d["activity_key"]) <= 80, "Invalid funding activity identity.")
    c = validate_catalogue(d["bundle"])
    require((d["version"] == 4) == (c["version"] == 3), "AL20 catalogue edition 3 requires funding draft version 4. Review a version-specific catalogue update.")
    if d["version"] == 4:
        funding_selection.validate_answers(d["selection_assessments"], c)
        legacy = d["legacy_selection_score"]
        require(legacy is None or type(legacy) in (int, float) and isfinite(legacy) and 0 <= legacy <= 100, "Invalid historical manual AL20 score.")
        require("selection_score" not in d["overrides"] and d["baseline"]["facts"]["selection_score"] is None, "AL20 scores must be calculated from annex selections; manual score overrides are historical only.")
    b = d["baseline"]
    keys(b, {"project_id", "project_revision", "facts", "parties", "target", "parcel_ids", "work_budget"}, "funding baseline")
    require(b["project_id"] == project["id"] and type(b["project_revision"]) is int and b["project_revision"] >= 0, "Funding baseline belongs to a different project.")
    require(b["target"] in {"activity", "demonstrator", "business"}, "Unsupported funding target.")
    require(isinstance(b["parcel_ids"], list) and len(set(b["parcel_ids"])) == len(b["parcel_ids"]) and set(b["parcel_ids"]) <= {p["id"] for p in project["parcels"]}, "Funding exploration refers to a missing parcel.")
    require(isinstance(b["parties"], list) and all(isinstance(p, dict) and {"id", "name", "kind"} <= set(p) for p in b["parties"]), "Invalid recorded funding parties.")
    questions = {q["id"]: q for q in c["questions"]}
    keys(b["facts"], set(questions), "funding facts")
    require(isinstance(d["overrides"], dict) and set(d["overrides"]) <= set(questions), "Unknown funding override.")
    if d["version"] in {3, 4}:
        require(not ({"applicant_id", "applicant_kind"} & set(d["overrides"])), "Choose the applicant as one complete choice; independent identity/form overrides are no longer supported.")
        validate_applicant_choice(d["applicant_choice"], d)
    for values in [b["facts"], d["overrides"]]:
        for k, v in values.items():
            q = questions[k]
            if v is None: continue
            if q["type"] == "number":
                require(type(v) in (int, float) and isfinite(v) and v >= q["min"] and ("max" not in q or v <= q["max"]), "Invalid numeric funding answer: " + k)
            elif q["type"] == "choice": require(v in {p[0] for p in q["options"]}, "Invalid funding choice: " + k)
            else: require(isinstance(v, str) and len(v) <= 1000, "Invalid funding text: " + k)
    ids = {e["id"] for e in c["entries"]}
    reference_only = {e["id"] for e in c["entries"] if e["mechanism"] in {"framework", "certification"}}
    require(isinstance(d["selected"], list) and len(d["selected"]) == len(set(d["selected"])) and set(d["selected"]) <= ids, "Unknown or duplicate funding selection.")
    require(isinstance(d["allocations"], list) and len(d["allocations"]) <= 100, "Invalid funding allocations.")
    for a in d["allocations"]:
        keys(a, {"mechanism_id", "cost_line", "amount", "kind"}, "funding allocation")
        require(a["mechanism_id"] in d["selected"] and isinstance(a["cost_line"], str) and 0 < len(a["cost_line"]) <= 200 and a["kind"] in {"anticipated", "available", "loan", "in_kind"}, "Invalid funding allocation identity, cost line or contribution type.")
        require(a["mechanism_id"] not in reference_only, "A regulatory or certification framework is supporting context, not a funding contribution.")
        require(a["amount"] is None or type(a["amount"]) in (int, float) and isfinite(a["amount"]) and a["amount"] >= 0, "Allocation amount must be nonnegative or explicitly unknown.")
    if d["calendar_start"] is not None: date.fromisoformat(d["calendar_start"])
    return d


def effective(d):
    facts = {**d["baseline"]["facts"], **d["overrides"]}
    # Version 1 is frozen for saved assessments. Version 2 follows the selected
    # party unless the user has explicitly chosen a hypothetical legal form.
    if d["version"] == 2 and "applicant_kind" not in d["overrides"]:
        facts["applicant_kind"] = applicant_form(d, facts["applicant_id"])
    if d["version"] in {3, 4}:
        choice = resolved_applicant(d)
        if choice["kind"] == "recorded":
            facts.update(applicant_id=choice["party_id"], applicant_kind=applicant_form(d, choice["party_id"]))
        elif choice["kind"] in {"planned", "potential"}:
            facts.update(applicant_id="hypothetical", applicant_kind=choice["legal_form"])
        else:
            facts.update(applicant_id=None, applicant_kind=None)
    return facts


def legal_forms(d):
    question = next((q for q in d["bundle"]["questions"] if q["id"] == "applicant_kind"), None)
    require(question is not None and question["type"] == "choice", "The applicant legal-form question is missing or incompatible.")
    return dict(question["options"])


def validate_applicant_choice(choice, d):
    if choice is None: return  # Explicit inheritance, distinct from an unknown choice.
    require(isinstance(choice, dict) and "kind" in choice, "Choose a valid applicant.")
    kind = choice["kind"]
    if kind == "recorded":
        keys(choice, {"kind", "party_id"}, "recorded applicant")
        require(choice["party_id"] in {p["id"] for p in d["baseline"]["parties"]}, "The selected applicant is not in the recorded context. Refresh the baseline.")
    elif kind in {"planned", "potential"}:
        keys(choice, {"kind", "legal_form"}, "hypothetical applicant")
        require(choice["legal_form"] is None or choice["legal_form"] in legal_forms(d), "Unsupported hypothetical applicant type.")
        require(kind != "planned" or choice["legal_form"] in {"individual", "nonprofit", "company"}, "Choose a supported organisation/business to create.")
    else:
        require(kind == "unknown", "Unknown applicant choice category.")
        keys(choice, {"kind"}, "unknown applicant")


def initial_applicant(d):
    identity = d["baseline"]["facts"]["applicant_id"]
    if identity is None: return {"kind": "unknown"}
    require(any(p["id"] == identity for p in d["baseline"]["parties"]), "The initial applicant is missing from the recorded context. Review this exploration.")
    return {"kind": "recorded", "party_id": identity}


def resolved_applicant(d):
    return initial_applicant(d) if d["applicant_choice"] is None else deepcopy(d["applicant_choice"])


def applicant_label(choice, d):
    if choice["kind"] == "recorded":
        party = next(p for p in d["baseline"]["parties"] if p["id"] == choice["party_id"])
        form = applicant_form(d, party["id"])
        return party["name"] + " · " + (legal_forms(d)[form] if form is not None else "Legal form unknown")
    if choice["kind"] == "unknown": return "Unknown / I don’t know yet"
    form = choice["legal_form"]
    if form is None: return "Another hypothetical applicant type…"
    if choice["kind"] == "planned":
        return {"nonprofit": "New nonprofit organisation I plan to create", "individual": "New self-employed business I plan to create", "company": "New company I plan to create"}[form]
    if form in {"nonprofit", "public"}:
        return {"nonprofit": "Nonprofit partner not yet identified", "public": "Public-body partner not yet identified"}[form]
    return "Potential applicant · " + legal_forms(d)[form]


def applicant_form(d, applicant_id):
    party = next((p for p in d["baseline"]["parties"] if p["id"] == applicant_id), None)
    allowed = legal_forms(d)
    # No selected/recorded party (including a hypothetical partner) means unknown.
    return party["kind"] if party is not None and party["kind"] in allowed else None


@checked
def prepare_applicant(draft, project, applicant_choice=None, resolve=False):
    """Explicit editing adapter; never rewrite stored alternatives or snapshots."""
    d = deepcopy(validate_draft(draft, project))
    if d["version"] in {3, 4}:
        if resolve:
            validate_applicant_choice(applicant_choice, d)
            d["applicant_choice"] = deepcopy(applicant_choice)
        return {"draft": d, "notice": "", "applicant_review": None}
    facts = effective(d)
    identity, form = facts["applicant_id"], facts["applicant_kind"]
    party = next((p for p in d["baseline"]["parties"] if p["id"] == identity), None)
    coherent = party is not None and form == applicant_form(d, identity)
    unrecorded = identity in {None, "hypothetical"}
    if not resolve and not coherent and not unrecorded:
        return {"draft": d, "notice": "Review the previous applicant identity and legal-form assumption before editing.",
                "applicant_review": {"party_name": identity if party is None else party["name"], "legal_form": form,
                                     "message": "These older answers cannot be combined without changing the scenario. Choose the recorded applicant or a hypothetical applicant type; the saved assessment will remain unchanged."}}
    if resolve:
        validate_applicant_choice(applicant_choice, d)
        choice = deepcopy(applicant_choice)
    elif coherent:
        choice = {"kind": "recorded", "party_id": identity}
    else:
        choice = {"kind": "unknown"} if form is None else {"kind": "potential", "legal_form": form}
    if not resolve and not ({"applicant_id", "applicant_kind"} & set(d["overrides"])) and choice == initial_applicant(d):
        choice = None
    d["overrides"].pop("applicant_id", None)
    d["overrides"].pop("applicant_kind", None)
    d.update(version=3, applicant_choice=choice)
    validate_draft(d, project)
    return {"draft": d, "notice": "Editing copy updated to one applicant choice. Saved assessment snapshots and source editions are unchanged.", "applicant_review": None}


@checked
def prepare(draft, project, applicant_choice=None, resolve=False, adopt_current_catalogue=False, planning=None):
    require(type(adopt_current_catalogue) is bool, "Choose whether to adopt the current catalogue explicitly.")
    result = prepare_applicant(draft, project, applicant_choice, resolve)
    result["catalogue_review"] = None
    if not adopt_current_catalogue or result["applicant_review"] is not None: return result
    d = result["draft"]
    previous = deepcopy(d)
    current = catalogue()
    captured = baseline(project, planning, d["baseline"]["parcel_ids"], d["baseline"]["target"], current)
    # These are historical answers, never interpreted as either new participation check.
    for key in ["territory_verified", "public_access"]:
        captured["facts"][key] = previous["baseline"]["facts"][key]
    if current["version"] == 3:
        if previous["version"] < 4:
            historical = effective(previous)["selection_score"]
            d.update(version=4, selection_assessments=funding_selection.empty(current), legacy_selection_score=historical)
            d["overrides"].pop("selection_score", None)
        elif digest(previous["bundle"]["selection"]) != digest(current["selection"]):
            require(funding_selection.is_guidance_update_v1(previous["bundle"]["selection"], current["selection"]), "AL20 scoring definitions changed. A version-specific assessment migration is required before adopting this catalogue; existing selections are preserved.")
    d.update(bundle=current, baseline=captured)
    validate_draft(d, project)
    old_facts, new_facts = effective(previous), effective(d)
    differences = [{"id": q["id"], "label": q["label"], "before": old_facts[q["id"]] if q["id"] in old_facts else None, "after": new_facts[q["id"]]} for q in current["questions"] if q["id"] not in old_facts or not same_json(old_facts[q["id"]], new_facts[q["id"]])]
    retained = [{"id": q["id"], "label": q["label"], "value": new_facts[q["id"]]} for q in current["questions"] if q.get("retired", False) and new_facts[q["id"]] is not None]
    result["catalogue_review"] = {"from_edition": previous["bundle"]["version"], "to_edition": current["version"], "changes": differences, "retained_answers": retained,
        "messages": ["Adopt the current recorded baseline, question definitions, rules and source editions. Explicit assumptions are retained.", "The former shared public-access answer is not copied into the new participation/public-use questions. Recorded demonstrator participation may initialise only the 3.4 question.", "Municipality coverage, operation scope and call availability are separate. Conditional outside-area exceptions still require verification."]}
    if current["version"] == 3 and previous["version"] < 4:
        result["catalogue_review"]["messages"].append("Replace manual AL20 scoring with separate annex assessments for all five routes. Any old manual total is retained as historical information only; no annex answers are inferred. Saved alternatives and adopted plans remain unchanged.")
    elif current["version"] == 3 and digest(previous["bundle"]["selection"]) != digest(current["selection"]):
        result["catalogue_review"]["messages"].append("Update AL20 explanatory guidance and additional source links. Point values, applicability and scoring relationships are identical; all annex selections, references and notes are retained. Criterion guidance includes official reference lookups and document links. Saved assessments remain unchanged.")
    result["notice"] = "Baseline and catalogue update prepared. Review before applying; saved assessments remain unchanged."
    return result


def assess(entry, f, c, selection_assessments=None):
    if c["version"] == 3:
        require(selection_assessments is not None, "AL20 annex assessment inputs are missing.")
        return funding_selection.assess(entry, f, c, selection_assessments)
    if c["version"] == 1:
        from .funding_v1 import assess as evaluate_entry
    else:
        from .funding_v2 import assess as evaluate_entry
    return evaluate_entry(entry, f, c)


@checked
def evaluate(draft, project, planning=None):
    d = validate_draft(deepcopy(draft), project)
    c, f = d["bundle"], effective(d)
    require(f["budget_total"] is None or f["eligible_cost"] is None or f["eligible_cost"] <= f["budget_total"], "Eligible cost cannot exceed the total activity cost. Review the budget assumptions.")
    results = [assess(e, f, c, d["selection_assessments"] if d["version"] == 4 else None) for e in c["entries"]]
    for r in results:
        entry = next(e for e in c["entries"] if e["id"] == r["id"])
        r.update(title=entry["title"], group=entry["group"], mechanism=entry["mechanism"], availability=entry["availability"], source_strength=entry["source_strength"], maturity=entry["maturity"], checked_on=entry["checked_on"], description=entry["description"], sources=entry["sources"], source_gaps=entry["source_gaps"], related=entry["related"])
    warnings = []
    if d["version"] in {3, 4} and resolved_applicant(d)["kind"] in {"planned", "potential"}:
        warnings.append("This applicant is proposed or not yet identified. Matching the modelled conditions is a scenario preview; formation, a real applicant and official eligibility still require verification.")
    if d["version"] == 2 and "applicant_kind" in d["overrides"]:
        inherited = applicant_form(d, f["applicant_id"])
        if inherited is not None and f["applicant_kind"] != inherited:
            warnings.append("The explicit legal-form assumption differs from the selected applicant's recorded type. Review that hypothetical arrangement before adopting or executing a plan.")
    if len(d["selected"]) > 1:
        warnings.append("Combination requires review of compatibility, overlapping costs, environmental claims and each payer's conditions.")
        if "LEADER-AL20-2.7" in d["selected"]: warnings.append("2.7 cannot be combined with other aid for the same operation. Define distinct operations and obtain confirmation before relying on a combination.")
        for e in c["entries"]:
            if e["id"] in d["selected"] and set(e["related"]) & set(d["selected"]): warnings.append("Related descriptions selected: " + e["id"] + ". These may describe the same financing instrument; do not count them twice.")
    lines = {}
    for a in d["allocations"]:
        lines.setdefault(a["cost_line"].strip().casefold(), set()).add(a["mechanism_id"])
    if any(len(v) > 1 for v in lines.values()): warnings.append("Several mechanisms target the same cost line. Check double-financing restrictions and document the split.")
    totals = {k: sum(a["amount"] for a in d["allocations"] if a["kind"] == k and a["amount"] is not None) for k in ["available", "anticipated", "loan", "in_kind"]}
    available = f["available_contribution"]
    need = f["cash_before_receipts"]
    if totals["available"] and available is None: warnings.append("An allocation marked available is a user assumption; verify the funds and avoid counting the same contribution twice.")
    current = baseline(project, planning, d["baseline"]["parcel_ids"], d["baseline"]["target"], c)
    compared_fields = {q["id"] for q in c["questions"] if c["version"] == 1 or not q.get("retired", False)}
    stale = not same_json({k: current["facts"][k] for k in compared_fields}, {k: d["baseline"]["facts"][k] for k in compared_fields}) or current["parties"] != d["baseline"]["parties"] or not same_json(current["work_budget"], d["baseline"]["work_budget"])
    if stale: warnings.append("Recorded context changed. Review and explicitly refresh this exploration's baseline.")
    catalogue_changed = digest(c) != digest(catalogue())
    if catalogue_changed: warnings.append("A newer catalogue is available. Update assessment explicitly to adopt its rules and sources.")
    difference_fields = set(d["overrides"])
    if c["version"] >= 2: difference_fields -= {q["id"] for q in c["questions"] if q.get("retired", False)}
    if d["version"] == 2: difference_fields.add("applicant_kind")
    differences = [{"field": q["id"], "label": q["label"], "recorded": d["baseline"]["facts"][q["id"]], "assumed": f[q["id"]], "editor": "land" if q["id"] in {"owner_id", "operator_id", "rights", "municipality", "area_m2", "rights_sufficient"} else "demonstrator" if q["id"] in {"novelty", "testable", "public_access", "dissemination", "publication_three_years", "purpose"} else "project"} for q in c["questions"] if q["id"] in difference_fields and f[q["id"]] != d["baseline"]["facts"][q["id"]]]
    if d["version"] in {3, 4} and resolved_applicant(d) != initial_applicant(d):
        differences.insert(0, {"field": "applicant_choice", "label": "Who would apply for the funding?", "recorded": applicant_label(initial_applicant(d), d), "assumed": applicant_label(resolved_applicant(d), d), "editor": "project"})
    if d["version"] == 4:
        for result in results:
            if "selection_assessment" not in result: continue
            rows = d["selection_assessments"][result["id"]]["criteria"].values()
            if any(any(v is not None for v in row["answers"].values()) or any(v is not None for v in row["inputs"].values()) for row in rows):
                score = result["selection_assessment"]
                description = f"Calculated score: {score['total']:g} points" if score["total"] is not None else f"Partial subtotal: {score['subtotal']:g} points; {score['unresolved']} criteria unresolved"
                differences.append({"field": "selection_assessment:" + result["id"], "label": "AL20 selection assessment · " + result["id"], "recorded": "Annex criteria unanswered", "assumed": description + " · self-assessed", "editor": "funding"})
    return {"draft": d, "facts": f, "results": results, "differences": differences, "stale": stale, "catalogue_changed": catalogue_changed, "catalogue_hash": digest(c), "warnings": warnings, "allocation_totals": totals, "uncovered": None if f["budget_total"] is None or any(a["amount"] is None for a in d["allocations"]) else max(0, f["budget_total"] - sum(totals[k] for k in ["available", "anticipated", "loan"])), "upfront_shortfall": None if need is None or available is None else max(0, need-available), "calendar_note": "Call window: 23 April 2026–31 December 2028, subject to local interruption and budget confirmation. Simulation years remain relative."}


@checked
def validate_attachment(value, project):
    if value is None: return None
    require(project is not None, "Funding workspace requires a project.")
    keys(value, {"version", "draft", "scenarios", "plans"}, "funding attachment")
    require(type(value["version"]) is int and value["version"] == 1 and isinstance(value["scenarios"], list) and isinstance(value["plans"], list), "Invalid funding workspace.")
    if value["draft"] is not None: validate_draft(value["draft"], project)
    for collection in [value["scenarios"], value["plans"]]:
        ids = set()
        for r in collection:
            keys(r, {"id", "draft", "assessment", "active"}, "saved funding record")
            identity(r["id"])
            require(r["id"] not in ids and type(r["active"]) is bool, "Duplicate or invalid saved funding record.")
            ids.add(r["id"])
            validate_draft(r["draft"], project)
            keys(r["assessment"], set("draft facts results differences stale catalogue_changed catalogue_hash warnings allocation_totals uncovered upfront_shortfall calendar_note".split()), "saved funding assessment")
            require(isinstance(r["assessment"], dict) and r["assessment"]["catalogue_hash"] == digest(r["draft"]["bundle"]) and same_json(r["assessment"]["draft"], r["draft"]), "Funding assessment snapshot does not match its draft.")
            facts = effective(r["draft"])
            require(same_json(r["assessment"]["facts"], facts), "Saved assessment facts differ from its recorded assumptions.")
            results = r["assessment"]["results"]
            entries = r["draft"]["bundle"]["entries"]
            require(isinstance(results, list) and len(results) == len(entries) and len({x["id"] for x in results}) == len(entries), "Saved funding assessment is incomplete or has duplicate results.")
            lookup = {x["id"]: x for x in results}
            for entry in entries:
                expected = assess(entry, facts, r["draft"]["bundle"], r["draft"]["selection_assessments"] if r["draft"]["version"] == 4 else None)
                require(entry["id"] in lookup and all(k in lookup[entry["id"]] and same_json(lookup[entry["id"]][k], v) for k, v in expected.items()), "Saved funding result disagrees with its source-rule snapshot: " + entry["id"])
            require(isinstance(r["assessment"]["warnings"], list) and all(isinstance(w, str) for w in r["assessment"]["warnings"]), "Invalid saved funding warnings.")
    active = [r["draft"]["activity_key"] for r in value["plans"] if r["active"]]
    require(len(active) == len(set(active)), "Only one active funding plan is allowed per activity.")
    return value


@checked
def operate(value, project, planning, operation, draft, record_id):
    v = initial() if value is None else deepcopy(validate_attachment(value, project))
    if operation in {"draft", "save", "adopt"}:
        assessment = evaluate(draft, project, planning)
        v["draft"] = assessment["draft"]
        if operation != "draft":
            collection = v["plans"] if operation == "adopt" else v["scenarios"]
            if operation == "adopt":
                require(draft["selected"], "Select at least one mechanism before adopting a funding plan.")
                entries = {e["id"]: e for e in draft["bundle"]["entries"]}
                require(any(entries[id]["mechanism"] not in {"framework", "certification"} for id in draft["selected"]), "Choose a funding or support mechanism; a law or certification framework alone provides no funding.")
                require(not assessment["stale"] and not assessment["catalogue_changed"], "Refresh the baseline and assessment before adopting this plan.")
                for r in collection:
                    if r["draft"]["activity_key"] == draft["activity_key"]: r["active"] = False
            if operation == "save" and record_id is not None:
                identity(record_id)
                record = next((r for r in collection if r["id"] == record_id), None)
                require(record is not None, "Saved exploration to update was not found.")
                record.update(draft=deepcopy(draft), assessment=assessment)
            else:
                collection.append({"id": str(uuid4()), "draft": deepcopy(draft), "assessment": assessment, "active": True})
    elif operation == "delete":
        identity(record_id)
        require(any(r["id"] == record_id for r in v["scenarios"] + v["plans"]), "Funding record not found.")
        v["scenarios"] = [r for r in v["scenarios"] if r["id"] != record_id]
        v["plans"] = [r for r in v["plans"] if r["id"] != record_id]
    else: require(False, "Unsupported funding operation.")
    return validate_attachment(v, project)


def workspace(project, value, revision):
    v = initial() if value is None else deepcopy(validate_attachment(value, project))
    d = project["demonstrator"]
    legacy = None if d is None else {"label": "Existing demonstrator financing — retained simulation record", "route": None if d["legacy"] else d["plan"]["funding_route"], "grant": deepcopy(project["grant"])}
    return {"version": 1, "project_revision": project["revision"], "funding_revision": revision, "attachment": v, "legacy": legacy}


def after_delete(value, before, after, parcel_ids):
    if value is None: return None
    from .parcel_removal import rebuild
    _, _, _, maps = rebuild(before, parcel_ids, with_mapping=True)
    mapping = maps["parcel_id"]
    v = deepcopy(value)
    def retained(d):
        links = d["baseline"]["parcel_ids"]
        return all(p in mapping for p in links)
    for r in v["plans"]:
        links = r["draft"]["baseline"]["parcel_ids"]
        require(not r["active"] or len(links) <= 1 or retained(r["draft"]), "Revise or unlink the shared adopted funding plan before deleting a linked parcel.")
    v["scenarios"] = [r for r in v["scenarios"] if retained(r["draft"])]
    v["plans"] = [r for r in v["plans"] if retained(r["draft"])]
    if v["draft"] is not None and not retained(v["draft"]): v["draft"] = None
    for d in ([v["draft"]] if v["draft"] is not None else []) + [r["draft"] for r in v["scenarios"]+v["plans"]]:
        d["baseline"]["parcel_ids"] = [mapping[p] for p in d["baseline"]["parcel_ids"]]
    for r in v["scenarios"]+v["plans"]: r["assessment"]["draft"] = deepcopy(r["draft"])
    return validate_attachment(v, after)
