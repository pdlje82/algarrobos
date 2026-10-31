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
    keys(c, {"version", "checked_on", "reference", "groups", "entries", "questions", "municipalities", "rules", "official_pages", "source_review"}, "funding catalogue")
    require(type(c["version"]) is int and c["version"] == 1, "Unsupported funding catalogue version.")
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
    require(set(c["rules"]) == {"2.7", "1.11", "2.6", "3.4", "3.5"}, "Incomplete core funding rules.")
    r = c["rules"]["2.7"]
    require(all(type(r[k]) in (int, float) and isfinite(r[k]) and r[k] >= 0 for k in ["base", "first", "second", "bonus_cap", "cap"]), "Invalid startup financial amounts.")
    require(all(type(v) in (int, float) and isfinite(v) and v >= 0 for v in r["bonuses"].values()), "Invalid startup bonus amounts.")
    require(r["first"] + r["second"] == r["base"] and r["base"] + r["bonus_cap"] == r["cap"], "Inconsistent lump-sum rules.")
    for id in ["3.4", "3.5", "1.11", "2.6"]:
        rule = c["rules"][id]
        require(type(rule["rate"]) in (int, float) and 0 <= rule["rate"] <= 1 and type(rule["cap"]) in (int, float) and isfinite(rule["cap"]) and rule["cap"] >= 0, "Invalid reimbursement rate or cap.")
    return c


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
def baseline(project, planning, parcel_ids, target):
    require(target in {"activity", "demonstrator", "business"}, "Choose a supported funding activity scope.")
    require(isinstance(parcel_ids, list) and len(set(parcel_ids)) == len(parcel_ids) and set(parcel_ids) <= {p["id"] for p in project["parcels"]}, "Choose existing funding parcels.")
    c = catalogue()
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
            facts.update(applicant_id=plan["applicant_id"], municipality=plan["municipality"], purpose=plan["purpose"])
            applicant = next(p for p in project["parties"] if p["id"] == plan["applicant_id"])
            facts["applicant_kind"] = applicant["kind"] if applicant["kind"] in {"individual", "nonprofit", "public", "company"} else None
            mappings = {"novelty": ("novelty", {"new_locally": "yes", "established": "no"}), "public_access": ("public_participation", {"open_demo": "yes", "open_days": "yes", "private": "no"}), "dissemination": ("dissemination", {"web_report": "yes", "web_workshop": "yes", "none": "no"}), "publication_three_years": ("publication_period", {"three_years": "yes"})}
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
    return {"version": 2, "name": "Funding exploration", "activity_key": "demonstrator" if target == "demonstrator" else str(uuid4()), "baseline": baseline(project, planning, parcel_ids, target), "overrides": {}, "selected": [], "allocations": [], "calendar_start": None, "notes": "", "bundle": c}


@checked
def validate_draft(d, project):
    keys(d, set("version name activity_key baseline overrides selected allocations calendar_start notes bundle".split()), "funding draft")
    require(type(d["version"]) is int and d["version"] in {1, 2}, "Unsupported funding draft version.")
    require(isinstance(d["name"], str) and 0 < len(d["name"].strip()) <= 80 and isinstance(d["notes"], str) and len(d["notes"]) <= 10000, "Enter a funding name (up to 80 characters) and valid notes.")
    require(isinstance(d["activity_key"], str) and 0 < len(d["activity_key"]) <= 80, "Invalid funding activity identity.")
    c = validate_catalogue(d["bundle"])
    b = d["baseline"]
    keys(b, {"project_id", "project_revision", "facts", "parties", "target", "parcel_ids", "work_budget"}, "funding baseline")
    require(b["project_id"] == project["id"] and type(b["project_revision"]) is int and b["project_revision"] >= 0, "Funding baseline belongs to a different project.")
    require(b["target"] in {"activity", "demonstrator", "business"}, "Unsupported funding target.")
    require(isinstance(b["parcel_ids"], list) and len(set(b["parcel_ids"])) == len(b["parcel_ids"]) and set(b["parcel_ids"]) <= {p["id"] for p in project["parcels"]}, "Funding exploration refers to a missing parcel.")
    require(isinstance(b["parties"], list) and all(isinstance(p, dict) and {"id", "name", "kind"} <= set(p) for p in b["parties"]), "Invalid recorded funding parties.")
    questions = {q["id"]: q for q in c["questions"]}
    keys(b["facts"], set(questions), "funding facts")
    require(isinstance(d["overrides"], dict) and set(d["overrides"]) <= set(questions), "Unknown funding override.")
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
    return facts


def applicant_form(d, applicant_id):
    party = next((p for p in d["baseline"]["parties"] if p["id"] == applicant_id), None)
    question = next((q for q in d["bundle"]["questions"] if q["id"] == "applicant_kind"), None)
    require(question is not None and question["type"] == "choice", "The applicant legal-form question is missing or incompatible.")
    allowed = {value for value, label in question["options"]}
    # No selected/recorded party (including a hypothetical partner) means unknown.
    return party["kind"] if party is not None and party["kind"] in allowed else None


@checked
def prepare(draft, project):
    """Explicit editing adapter; never rewrite stored alternatives or snapshots."""
    d = deepcopy(validate_draft(draft, project))
    notice = ""
    if d["version"] == 1:
        d["version"] = 2
        notice = "Editing copy updated: inherited legal form now follows the selected applicant. Explicit legal-form overrides are retained. Saved assessment snapshots are unchanged."
    return {"draft": d, "notice": notice}


def assess(entry, f, c):
    checks = []
    def check(key, acceptable, message, page=None):
        v = f[key]
        checks.append({"field": key, "result": "unknown" if v is None else "pass" if v in acceptable else "fail", "message": message, "sources": [s for s in entry["sources"] if page is None or s["document_id"] != "FUND-008" or s["page"] == page]})
    def y(key, message, page=None): check(key, {"yes"}, message, page)
    r = entry["rule"]
    if r:
        def canonical(value):
            return "".join(ch for ch in unicodedata.normalize("NFKD", value).casefold() if not unicodedata.combining(ch)).strip()
        municipality = f["municipality"]
        check("municipality", set(c["municipalities"]), "Verify membership in the official AL20 territory.")
        if municipality is not None:
            checks[-1]["result"] = "pass" if canonical(municipality) in {canonical(m) for m in c["municipalities"]} else "fail" if canonical(municipality) in {"outside", "outside al20"} else "unknown"
        y("territory_verified", "Verify the exact territorial link, local interruption and budget position.")
        if f["territory_verified"] == "no": checks[-1]["result"] = "unknown"
        score = f["selection_score"]
        checks.append(dict(field="selection_score", result="unknown" if score is None else "pass" if score >= c["rules"][r]["minimum_score"] else "fail", message="Verify the applicable local selection criteria and at least 60 points; no ecological impact score is inferred.", sources=[s for s in entry["sources"] if s["document_id"] == "FUND-008" and s["page"] == 38]))
        if r == "2.7":
            check("applicant_kind", {"individual"}, "2.7 is for an individual starting self-employment.", 112)
            check("sector", {"general"}, "Agricultural/forestry production, exclusive agrarian trade and 1.11 support services are excluded; mixed services require GDR classification.", 111)
            for key, msg in [("unemployed", "Unemployed when applying."), ("new_activity", "A genuinely new activity and submitted business plan."), ("no_same_reta", "No same-CNAE-group RETA registration in the preceding three years."), ("resident", "Resident in the relevant territory by commencement."), ("exclusive", "Exclusive full-time self-employment."), ("start_after_application", "Begin RETA/tax activity after applying and by three months after award notification."), ("plan_24_months", "Implement the plan within 24 months."), ("retention", "Maintain full-time self-employment until three years after final payment.")]: y(key, msg, 112 if key != "start_after_application" else 111)
            if f["sector"] == "mixed": next(x for x in checks if x["field"] == "sector")["result"] = "unknown"
            v = f["unemployment_percent"]
            startup = c["rules"]["2.7"]
            checks.append(dict(field="unemployment_percent", result="unknown" if v is None else "pass" if v >= startup["minimum_unemployment_percent"] else "fail", message="At least 50% unemployment in the preceding three months.", sources=[s for s in entry["sources"] if s["page"] == 112]))
            check("other_aid", {"no"}, "2.7 is incompatible with other aid for the same operation.")
            for net, benchmark, factor in [("net_year1", "smi_year1", startup["first_year_smi_factor"]), ("net_year2", "smi_year2", startup["final_smi_factor"])]:
                n, b = f[net], f[benchmark]
                checks.append(dict(field=net, result="unknown" if n is None or b is None else "pass" if n >= factor*b else "fail", message="Projected net income must meet " + ("half the verified annual 12-payment SMI benchmark in year one." if net == "net_year1" else "the verified annual application-year SMI benchmark in year two."), sources=[s for s in entry["sources"] if s["page"] == 112]))
        elif r in {"3.4", "3.5"}:
            check("applicant_kind", {"nonprofit", "public", "public_company"}, "A qualifying public/nonprofit legal entity or qualifying publicly participated enterprise is required.")
            if f["applicant_kind"] == "university":
                next(x for x in checks if x["field"] == "applicant_kind")["result"] = "unknown"
                checks.append(dict(field="applicant_kind", result="unknown", message="Verify whether this research institution is an eligible public/nonprofit legal entity.", sources=entry["sources"]))
            if f["applicant_kind"] == "public_company":
                checks.append(dict(field="applicant_kind", result="unknown", message="Public participation enterprise must meet the additional Article 7 conditions.", sources=entry["sources"]))
            check("purpose", {"conservation"}, "Nonproductive public-benefit purpose is required.")
            for k, msg in [("rights_sufficient", "Rights must cover implementation and commitments."), ("permits", "Verify the required permissions."), ("public_access", "Define compliant public participation / public benefit."), ("related_competence", "Applicant must have relevant purpose or competencies."), ("not_started", "Verify application precedes binding commitments.")]: y(k, msg)
            if f["permits"] == "no": next(x for x in checks if x["field"] == "permits")["result"] = "unknown"
            if r == "3.4":
                for k, msg in [("novelty", "The method must be new or unfamiliar in the ZRL."), ("testable", "A testable, transferable demonstration is required."), ("dissemination", "Publish activities and results online."), ("publication_three_years", "Keep online information for three years after final payment.")]: y(k, msg)
            else:
                y("heritage", "Document rural/environmental heritage value.")
                y("forest_plan", "Check any required forest management instrument.")
                check("land_purchase", {"no"}, "Acquisition of rural heritage assets is excluded from 3.5.", 124)
        else:
            check("applicant_kind", {"individual", "company"}, "A qualifying enterprise or prospective entrepreneur is required.")
            y("sme", "Verify SME and financial capacity requirements.")
            y("not_started", "Check application and investment start conditions.")
            check("sector", {"agrarian_services"} if r == "1.11" else {"general"}, "1.11 covers support services to agriculture/forestry; 2.6 excludes those services. Actual mixed activity requires GDR classification.")
            if f["sector"] == "mixed": checks[-1]["result"] = "unknown"
    elif entry["mechanism"] == "existing_cash":
        checks.append(dict(field="available_contribution", result="unknown" if f["available_contribution"] is None else "pass", message="Verify funds already held, their restrictions and the intended allocation. This is not a new receipt.", sources=[]))
    else:
        checks.append(dict(field=None, result="unknown", message="Research option: current programme/call, applicant conditions, economic viability and supporting source passages require verification.", sources=entry["sources"]))
    issues = [x for x in checks if x["result"] == "fail"]
    unknowns = [x for x in checks if x["result"] == "unknown"]
    finance = {"basis": "Unknown / mechanism-specific", "estimate": None, "schedule": [], "notes": ["No award, receipt or payment is created by this assessment."]}
    if entry["mechanism"] == "existing_cash":
        finance.update(basis="User-reported funds already available", estimate=f["available_contribution"])
    elif r == "2.7":
        rule = c["rules"][r]
        bonus = min(rule["bonus_cap"], sum(amount for key, amount in rule["bonuses"].items() if f[key] == "yes"))
        unknown_bonus = [key for key in rule["bonuses"] if f[key] is None]
        finance.update(basis="Conditional business-plan lump sum", estimate=None if issues else rule["base"] + bonus, base=rule["base"], bonus=bonus, maximum=rule["cap"], bonus_unknowns=unknown_bonus,
            schedule=[{"label": "First instalment: commencement after award", "amount": rule["first"]}, {"label": "Final instalment: plan and income milestones verified", "amount": rule["second"] + bonus}])
        finance["notes"].extend(["Estimate uses only the bonus conditions answered Yes; unanswered bonuses remain unconfirmed.", "Milestone preview only. First-year intermediate income and continuing commitment conditions apply. No entitlement or cash posting is inferred."])
    elif r:
        rule = c["rules"][r]
        cost = f["eligible_cost"]
        finance.update(basis="Percentage of verified eligible cost; reimbursement", estimate=None if issues or cost is None else round(min(cost*rule["rate"], rule["cap"]), 2), rate=rule["rate"], maximum=rule["cap"])
        finance["notes"].append("Legal maximum is not an award. Confirm cost eligibility, actual call limits, cofinance, guarantees and reimbursement timing.")
    return {"id": entry["id"], "status": "Does not match these facts" if issues else "Needs information" if unknowns else "Possible match — eligibility unverified", "relevant": f["activity"] is None or f["activity"] in entry["activities"], "checks": checks, "finance": finance}


@checked
def evaluate(draft, project, planning=None):
    d = validate_draft(deepcopy(draft), project)
    c, f = d["bundle"], effective(d)
    require(f["budget_total"] is None or f["eligible_cost"] is None or f["eligible_cost"] <= f["budget_total"], "Eligible cost cannot exceed the total activity cost. Review the budget assumptions.")
    results = [assess(e, f, c) for e in c["entries"]]
    for r in results:
        entry = next(e for e in c["entries"] if e["id"] == r["id"])
        r.update(title=entry["title"], group=entry["group"], mechanism=entry["mechanism"], availability=entry["availability"], source_strength=entry["source_strength"], maturity=entry["maturity"], checked_on=entry["checked_on"], description=entry["description"], sources=entry["sources"], source_gaps=entry["source_gaps"], related=entry["related"])
    warnings = []
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
    current = baseline(project, planning, d["baseline"]["parcel_ids"], d["baseline"]["target"])
    stale = not same_json(current["facts"], d["baseline"]["facts"]) or current["parties"] != d["baseline"]["parties"] or not same_json(current["work_budget"], d["baseline"]["work_budget"])
    if stale: warnings.append("Recorded context changed. Review and explicitly refresh this exploration's baseline.")
    catalogue_changed = digest(c) != digest(catalogue())
    if catalogue_changed: warnings.append("A newer catalogue is available. Update assessment explicitly to adopt its rules and sources.")
    difference_fields = set(d["overrides"])
    if d["version"] == 2: difference_fields.add("applicant_kind")
    differences = [{"field": q["id"], "label": q["label"], "recorded": d["baseline"]["facts"][q["id"]], "assumed": f[q["id"]], "editor": "land" if q["id"] in {"owner_id", "operator_id", "rights", "municipality", "area_m2", "rights_sufficient"} else "demonstrator" if q["id"] in {"novelty", "testable", "public_access", "dissemination", "publication_three_years", "purpose"} else "project"} for q in c["questions"] if q["id"] in difference_fields and f[q["id"]] != d["baseline"]["facts"][q["id"]]]
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
                expected = assess(entry, facts, r["draft"]["bundle"])
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
