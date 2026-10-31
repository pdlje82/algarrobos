"""AL20 annex assessments. All point values and relationships come from the snapshot.

Answers are self-assessments, never evidence certification. Unknown is distinct
from an explicit rejection; clients cannot submit totals or derived scores.
"""
from copy import deepcopy
from decimal import Decimal, InvalidOperation
from itertools import combinations
from math import isfinite

from .configuration import keys
from .engine import require, same_json, Invalid


def points(value):
    require(isinstance(value, str), "AL20 point values must be decimal strings.")
    try:
        result = Decimal(value)
    except InvalidOperation as exc:
        raise Invalid("Invalid AL20 decimal point value: " + value) from exc
    require(result.is_finite() and result >= 0 and result.as_tuple().exponent >= -2,
            "AL20 point values must be nonnegative with at most two decimal places.")
    return result


def source(ref):
    keys(ref, {"document_id", "page", "label", "role", "sha256", "verified_on"}, "AL20 source")
    from .funding import validate_guidance_source
    validate_guidance_source(ref)


def validate_rules(rules, catalogue):
    keys(rules, {"version", "routes", "profiles"}, "AL20 scoring library")
    require(type(rules["version"]) is int and rules["version"] == 1, "Unsupported AL20 scoring library.")
    expected = {"LEADER-AL20-" + r for r in catalogue["rules"]}
    require(isinstance(rules["routes"], dict) and set(rules["routes"]) == expected,
            "AL20 scoring must map all five supported funding routes.")
    require(isinstance(rules["profiles"], dict) and set(rules["profiles"]) == {"line1", "line2", "line3"},
            "AL20 scoring requires the three aid-line profiles.")
    for route, profile_id in rules["routes"].items():
        require(profile_id == "line" + route.removeprefix("LEADER-AL20-")[0], "Incorrect AL20 aid-line mapping: " + route)
    for profile_id, profile in rules["profiles"].items():
        keys(profile, {"label", "maximum", "criteria"}, "AL20 profile")
        require(isinstance(profile["label"], str) and profile["label"].strip(), "Missing AL20 profile label.")
        require(points(profile["maximum"]) == 100, "AL20 profile maximum must match the 100-point annex.")
        require(isinstance(profile["criteria"], list) and profile["criteria"], "Empty AL20 scoring profile.")
        ids = set()
        for criterion in profile["criteria"]:
            keys(criterion, {"id", "label", "label_es", "cap", "method", "choices", "exclusive_groups", "requires", "guidance", "limitations", "sources", "parameters"}, "AL20 criterion")
            cid = criterion["id"]
            require(isinstance(cid, str) and cid not in ids, "Duplicate AL20 criterion: " + str(cid))
            ids.add(cid)
            require(all(isinstance(criterion[k], str) and criterion[k].strip() for k in ["label", "label_es", "guidance"]), "Missing AL20 criterion wording: " + cid)
            cap = points(criterion["cap"])
            require(cap > 0 and criterion["method"] in {"sum", "employment", "ratio"}, "Invalid AL20 scoring method: " + cid)
            keys(criterion["parameters"], {"boundaries"} if criterion["method"] == "ratio" else set(), "AL20 calculation parameters")
            if criterion["method"] == "ratio":
                boundaries = criterion["parameters"]["boundaries"]
                require(isinstance(boundaries, list) and len(boundaries) == 3 and all(points(b) > 0 for b in boundaries)
                        and sorted(set(map(points, boundaries))) == list(map(points, boundaries)), "Invalid AL20 ratio bands.")
            require(isinstance(criterion["limitations"], list) and all(isinstance(s, str) for s in criterion["limitations"]), "Invalid AL20 limitations.")
            require(isinstance(criterion["sources"], list) and criterion["sources"], "Missing AL20 criterion sources: " + cid)
            for ref in criterion["sources"]: source(ref)
            require(isinstance(criterion["choices"], list) and criterion["choices"], "Missing AL20 choices: " + cid)
            choice_ids = set()
            for choice in criterion["choices"]:
                keys(choice, {"id", "printed_code", "label", "label_es", "points", "routes", "character", "sources"}, "AL20 subcriterion")
                require(isinstance(choice["id"], str) and choice["id"].startswith(cid + ".") and choice["id"] not in choice_ids, "Duplicate/misplaced AL20 subcriterion.")
                choice_ids.add(choice["id"])
                require(all(isinstance(choice[k], str) and choice[k].strip() for k in ["printed_code", "label", "label_es"]), "Missing AL20 subcriterion wording.")
                require(points(choice["points"]) <= cap, "AL20 subcriterion exceeds its criterion cap.")
                # Empty applicability explicitly preserves a printed row that is
                # excluded for all routes using this profile (e.g. line-1 PE.1.5).
                require(isinstance(choice["routes"], list) and len(set(choice["routes"])) == len(choice["routes"]) and set(choice["routes"]) <= expected, "Invalid AL20 subcriterion applicability.")
                require(all(rules["routes"][r] == profile_id for r in choice["routes"]), "AL20 subcriterion belongs to another aid-line profile.")
                require(choice["character"] in {"exclusive", "cumulative", "exclusive_up", "cumulative_up"}, "Unsupported AL20 combination relationship.")
                require(isinstance(choice["sources"], list) and choice["sources"], "Missing AL20 subcriterion source.")
                for ref in choice["sources"]: source(ref)
            require(isinstance(criterion["exclusive_groups"], list), "Missing AL20 exclusions.")
            for group in criterion["exclusive_groups"]:
                require(isinstance(group, list) and len(group) >= 2 and len(set(group)) == len(group) and set(group) <= choice_ids, "Invalid AL20 exclusive alternatives.")
            require(isinstance(criterion["requires"], dict), "Missing AL20 prerequisite relationships.")
            for child, parents in criterion["requires"].items():
                require(child in choice_ids and isinstance(parents, list) and parents and child not in parents and set(parents) <= choice_ids, "Invalid AL20 additive prerequisite.")
            # Confirm that the declared relationships actually encode Annex VII.
            exclusive = [c["id"] for c in criterion["choices"] if c["character"] == "exclusive"]
            for a, b in combinations(exclusive, 2):
                require(any(a in g and b in g for g in criterion["exclusive_groups"]), "Missing AL20 exclusive relationship: " + a + " / " + b)
            for index, choice in enumerate(criterion["choices"]):
                if choice["character"] in {"exclusive_up", "cumulative_up"}:
                    require(index > 0, "An upward AL20 relationship needs its preceding subcriterion.")
                    previous = criterion["choices"][index - 1]["id"]
                    if choice["character"] == "exclusive_up":
                        require(any(choice["id"] in g and previous in g for g in criterion["exclusive_groups"]), "Missing upward AL20 exclusion.")
                    else:
                        require(choice["id"] in criterion["requires"] and previous in criterion["requires"][choice["id"]], "Missing upward AL20 addition prerequisite.")
        require(sum((points(c["cap"]) for c in profile["criteria"]), Decimal(0)) == points(profile["maximum"]), "AL20 criterion caps do not total the annex maximum.")
    return rules


def profile_for(bundle, route):
    rules = bundle["selection"]
    require(route in rules["routes"], "Choose a supported AL20 scoring route.")
    return rules["profiles"][rules["routes"][route]]


def choices_for(criterion, route):
    return [c for c in criterion["choices"] if route in c["routes"]]


def is_guidance_update_v1(previous, current):
    """Explicit v1 adapter: prose/additional citations may change after review.

    All scoring definitions and existing source citations must remain identical.
    Changed/removed legal sources or scoring contracts need another migration.
    """
    if previous["version"] != 1 or current["version"] != 1:
        return False
    comparison = deepcopy(current)
    if set(previous["profiles"]) != set(current["profiles"]):
        return False
    for profile_id, profile in comparison["profiles"].items():
        old = {c["id"]: c for c in previous["profiles"][profile_id]["criteria"]}
        for criterion in profile["criteria"]:
            if criterion["id"] not in old:
                return False
            original = old[criterion["id"]]
            if any(ref not in criterion["sources"] for ref in original["sources"]):
                return False
            for field in ["guidance", "limitations", "sources"]:
                criterion[field] = deepcopy(original[field])
    return same_json(previous, comparison)


def empty(bundle):
    assessments = {}
    for route in bundle["selection"]["routes"]:
        rows = {}
        for criterion in profile_for(bundle, route)["criteria"]:
            method = criterion["method"]
            rows[criterion["id"]] = {"answers": {} if method == "ratio" else {c["id"]: None for c in choices_for(criterion, route)},
                                      "inputs": {"grant": None, "quality_jobs": None} if method == "ratio" else {"qualifying_uta": None} if method == "employment" else {},
                                      "reference": "", "notes": ""}
        assessments[route] = {"criteria": rows}
    return assessments


def validate_answers(assessments, bundle):
    require(isinstance(assessments, dict), "AL20 assessments must be an object.")
    keys(assessments, set(bundle["selection"]["routes"]), "AL20 route assessments")
    for route, assessment in assessments.items():
        keys(assessment, {"criteria"}, "AL20 route assessment")
        profile = profile_for(bundle, route)
        rows = assessment["criteria"]
        keys(rows, {c["id"] for c in profile["criteria"]}, "AL20 criterion answers")
        for criterion in profile["criteria"]:
            cid = criterion["id"]
            row = rows[cid]
            keys(row, {"answers", "inputs", "reference", "notes"}, "AL20 answer " + cid)
            for key, limit in [("reference", 2000), ("notes", 4000)]:
                require(isinstance(row[key], str) and len(row[key]) <= limit, "Invalid AL20 " + key + ": " + cid)
            method = criterion["method"]
            keys(row["answers"], set() if method == "ratio" else {c["id"] for c in choices_for(criterion, route)}, "AL20 subcriterion answers " + cid)
            require(all(v is None or type(v) is bool for v in row["answers"].values()), "AL20 selections must be selected, rejected or unanswered: " + cid)
            inputs = row["inputs"]
            keys(inputs, {"grant", "quality_jobs"} if method == "ratio" else {"qualifying_uta"} if method == "employment" else set(), "AL20 quantitative inputs " + cid)
            if method == "ratio":
                require(all(v is None or type(v) in (int, float) and isfinite(v) and 0 <= v <= 1e12 for v in inputs.values()), "Enter finite nonnegative grant and quality-job inputs for AL20 " + cid)
                jobs = inputs["quality_jobs"]
                require(jobs is None or jobs == int(jobs), "AL20 PE.4: enter a whole number of qualifying one-year / 1 UTA quality jobs; fractional job graduation needs GDR clarification.")
            elif method == "employment":
                require(inputs["qualifying_uta"] is None or type(inputs["qualifying_uta"]) is bool, "Confirm the documented AL20 employment duration / UTA condition.")
            selected = {k for k, v in row["answers"].items() if v is True}
            for group in criterion["exclusive_groups"]:
                require(len(selected & set(group)) <= 1, "AL20 " + cid + ": these subcriteria are mutually exclusive: " + ", ".join(sorted(selected & set(group))))
            for child, parents in criterion["requires"].items():
                require(child not in selected or set(parents) <= selected, "AL20 " + child + " requires " + ", ".join(parents) + ".")
    return assessments


def calculate(bundle, assessments, route):
    profile = profile_for(bundle, route)
    rows = assessments[route]["criteria"]
    breakdown = []
    for criterion in profile["criteria"]:
        row = rows[criterion["id"]]
        choices = choices_for(criterion, route)
        method = criterion["method"]
        issues = []
        if method == "ratio":
            grant, jobs = row["inputs"]["grant"], row["inputs"]["quality_jobs"]
            complete = grant is not None and jobs is not None
            selected = []
            ratio = None
            if complete and jobs > 0:
                ratio = Decimal(str(grant)) / Decimal(str(jobs))
                # The three strict boundaries are part of the PE.4 definitions.
                for choice, boundary in zip(choices, criterion["parameters"]["boundaries"], strict=True):
                    if ratio < points(boundary):
                        selected = [choice["id"]]
                        break
            if not complete: issues.append("Enter the grant amount and qualifying quality jobs, or explicitly enter zero jobs.")
        else:
            selected = [c["id"] for c in choices if row["answers"][c["id"]] is True]
            complete = all(v is not None for v in row["answers"].values())
            if not complete: issues.append("Answer every applicable subcriterion, including explicit rejections.")
            if method == "employment" and selected and row["inputs"]["qualifying_uta"] is not True:
                complete = False
                issues.append("Confirm the minimum one-year / 1 UTA condition. No undocumented part-time graduation is calculated; obtain GDR clarification if it is needed.")
        applicable = not (method == "employment" and selected and row["inputs"]["qualifying_uta"] is not True)
        raw = sum((points(c["points"]) for c in choices if applicable and c["id"] in selected), Decimal(0))
        subtotal = min(raw, points(criterion["cap"]))
        breakdown.append({"id": criterion["id"], "subtotal": float(subtotal), "uncapped": float(raw), "cap": float(points(criterion["cap"])),
                          "complete": complete, "selected": selected, "issues": issues, "sources": deepcopy(criterion["sources"])})
    unresolved = sum(not c["complete"] for c in breakdown)
    subtotal = sum((Decimal(str(c["subtotal"])) for c in breakdown), Decimal(0))
    threshold = bundle["rules"][route.removeprefix("LEADER-AL20-")]["minimum_score"]
    return {"route": route, "profile": bundle["selection"]["routes"][route], "basis": "Self-assessed; supporting references are not certified",
            "subtotal": float(subtotal), "total": float(subtotal) if unresolved == 0 else None, "unresolved": unresolved,
            "threshold": threshold, "result": "unknown" if unresolved else "pass" if subtotal >= Decimal(str(threshold)) else "fail",
            "criteria": breakdown}


def assess(entry, facts, bundle, assessments):
    """Reuse frozen non-scoring edition-2 rules with a route-specific derived score."""
    from .funding_v2 import assess as previous_assess
    if entry["rule"] is None:
        return previous_assess(entry, facts, bundle)
    score = calculate(bundle, assessments, entry["id"])
    result = previous_assess(entry, {**facts, "selection_score": score["total"]}, bundle)
    check = next(c for c in result["checks"] if c["field"] == "selection_score")
    check.update(result=score["result"], message=(f"Self-assessed AL20 score: {score['total']:g} points; threshold {score['threshold']:g}." if score["total"] is not None else f"Partial subtotal: {score['subtotal']:g} points · {score['unresolved']} criteria unresolved. Complete the annex assessment."),
                 sources=list({(s["document_id"], s["page"], s["sha256"]): s for c in score["criteria"] for s in c["sources"]}.values()))
    result["selection_assessment"] = score
    return result
